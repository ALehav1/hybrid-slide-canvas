/* --------------------------------------------------------------------------
   slidesStore.ts  –  one-file, compile-clean replacement
   -------------------------------------------------------------------------- */

/* =====  1.  External deps  ===== */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import Dexie from 'dexie'
import type { Draft } from 'immer'
import type { Editor, TLShapeId } from '@tldraw/tldraw'
import { deepFreeze } from '../lib/utils/deepFreeze'
import { createUniqueShapeId } from '../lib/utils/clientId'
import { createWelcomeMessage } from '../lib/utils/conversationUtils'

/* ===========================================================================
   2.  Minimal shared-type definitions  (✨ extract to "@/types/app.ts")
   =========================================================================== */
type MessageRole = 'user' | 'assistant'

export interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
}

export interface SlideData {
  id: string
  number: number
  title: string
  frameId: TLShapeId
  conversation: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
  thumbnailUrl?: string
  metadata?: Record<string, unknown>
}

export interface SlidesStateData {
  slides: SlideData[]
  currentSlideId: string
}

/* ===========================================================================
   3.  Utility helpers (imported from utils directory)
   =========================================================================== */

// Utility functions are now imported from their canonical locations

/* ===========================================================================
   4.  Dexie-based Zustand storage adapter  (✨ extract to "@/lib/storage")
   =========================================================================== */
class HybridDB extends Dexie {
  zustand!: Dexie.Table<{ id: string; value: string }, string>
  constructor() {
    super('hybrid-slide-canvas')
    this.version(1).stores({ zustand: 'id' })
  }
}
const db = new HybridDB()

const dexieStorage: StateStorage = {
  getItem: async (key) => (await db.zustand.get(key))?.value ?? null,
  setItem: async (key, val) => db.zustand.put({ id: key, value: val }),
  removeItem: async (key) => db.zustand.delete(key),
}

/* ===========================================================================
   5.  Initial-state factory
   =========================================================================== */
const makeInitialSlide = (id = 'slide-1'): SlideData => ({
  id,
  number: 1,
  title: 'Welcome to Hybrid Slide Canvas',
  frameId: createUniqueShapeId(),
  conversation: [createWelcomeMessage()],
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: { isInitial: true },
  thumbnailUrl: '/placeholder.png',
})

const initialState: SlidesStateData = {
  slides: [makeInitialSlide()],
  currentSlideId: 'slide-1',
}

/* ===========================================================================
   6.  Slides store – state + actions
   =========================================================================== */
export interface SlidesState extends SlidesStateData {
  addFrameSlide: (editor: Editor) => void
  deleteSlide: (slideId: string, editor?: Editor) => void
  setCurrentSlide: (id: string, editor?: Editor) => void
  reorderSlides: (fromIdx: number, toIdx: number) => void
  duplicateSlide: (slideId: string) => void
  updateSlideMetadata: (slideId: string, title: string) => void
  addMessage: (slideId: string, role: MessageRole, content: string) => void
  reset: () => void
}

const logic = (set: any, get: any): SlidesState => ({
  ...initialState,

  addFrameSlide: (editor) =>
    set((draft: Draft<SlidesState>) => {
      const idx = draft.slides.length + 1
      const id = `slide-${nanoid(8)}`
      const frameId = createUniqueShapeId()

      draft.slides.push({
        ...makeInitialSlide(id),
        number: idx,
        frameId,
        title: `Slide ${idx}`,
      })
      draft.currentSlideId = id

      editor?.createShapes?.([
        {
          id: frameId as TLShapeId,
          type: 'frame',
          x: idx * 1200,
          y: 0,
          props: { w: 960, h: 540, name: `Slide ${idx}` },
        },
      ])

      // TLDraw expects an array of IDs
      editor?.select?.(frameId)
    }),

  deleteSlide: (slideId, editor) =>
    set((draft: Draft<SlidesState>) => {
      if (draft.slides.length === 1) return
      const idx = draft.slides.findIndex((s) => s.id === slideId)
      if (idx === -1) return
      const [{ frameId }] = draft.slides.splice(idx, 1)
      draft.slides.forEach((s, i) => (s.number = i + 1))
      if (draft.currentSlideId === slideId) draft.currentSlideId = draft.slides[Math.max(0, idx - 1)].id
      editor?.deleteShapes?.([frameId])
    }),

  setCurrentSlide: (id, editor) =>
    set((draft: Draft<SlidesState>) => {
      if (!draft.slides.some((s) => s.id === id)) return
      draft.currentSlideId = id
      const slide = draft.slides.find((s) => s.id === id)!
      editor?.select?.(slide.frameId)
    }),

  reorderSlides: (from, to) =>
    set((draft: Draft<SlidesState>) => {
      const [s] = draft.slides.splice(from, 1)
      draft.slides.splice(to, 0, s)
      draft.slides.forEach((sl, i) => (sl.number = i + 1))
    }),

  duplicateSlide: (slideId) =>
    set((draft: Draft<SlidesState>) => {
      const src = draft.slides.find((s) => s.id === slideId)
      if (!src) return
      const id = `slide-${nanoid(8)}`
      const frameId = createUniqueShapeId()
      const insertAt = draft.slides.findIndex((s) => s.id === slideId) + 1
      draft.slides.splice(insertAt, 0, {
        ...src,
        id,
        frameId,
        title: `${src.title} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        conversation: [],
        metadata: { ...src.metadata, duplicatedFrom: slideId },
        number: 0,
      })
      draft.slides.forEach((sl, i) => (sl.number = i + 1))
      draft.currentSlideId = id
    }),

  updateSlideMetadata: (slideId, title) =>
    set((draft: Draft<SlidesState>) => {
      const s = draft.slides.find((sl) => sl.id === slideId)
      if (s) {
        s.title = title
        s.updatedAt = new Date()
      }
    }),

  addMessage: (slideId, role, content) =>
    set((draft: Draft<SlidesState>) => {
      const s = draft.slides.find((sl) => sl.id === slideId)
      if (!s) return
      s.conversation.push({ id: nanoid(), role, content, timestamp: new Date() })
      s.updatedAt = new Date()
    }),

  reset: () => set(structuredClone(initialState), true),
})

/* ===========================================================================
   7.  Persist config & store creation
   =========================================================================== */
const store = create<SlidesState>()(
  // dev-only deep freeze catches accidental mutations _after_ Immer
  ((config) =>
    (set, get, api) =>
      config(
        (fn, replace) =>
          set(
            (state) => (import.meta.env.DEV ? deepFreeze(typeof fn === 'function' ? fn(state) : fn) : fn),
            replace,
          ),
        get,
        api,
      ))(
    persist(
      immer(logic),
      {
        name: 'slides-store',
        partialize: (s): SlidesStateData => ({
          slides: s.slides,
          currentSlideId: s.currentSlideId,
        }),
        merge: (saved, cur) => {
          if (!saved) return cur
          const data = saved as SlidesStateData
          data.slides.forEach((sl) => {
            sl.createdAt = new Date(sl.createdAt)
            sl.updatedAt = new Date(sl.updatedAt)
            sl.conversation.forEach((m) => (m.timestamp = new Date(m.timestamp)))
          })
          return { ...cur, ...data }
        },
        storage: createJSONStorage(() => dexieStorage),
      },
    ),
  ),
)

/* eslint-disable-next-line import/no-default-export */
export default store