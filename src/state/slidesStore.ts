/* ────────────────────────────────────────────────────────────
   slidesStore.ts  – v2  (light data + out-of-draft snapshots)
   ──────────────────────────────────────────────────────────── */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist, createJSONStorage } from 'zustand/middleware'
import Dexie from 'dexie'
import { nanoid } from 'nanoid'
import type {
  Editor,
  StoreSnapshot,
  TLRecord,
  TLStore,
} from '@tldraw/tldraw'

import type { SlideData } from '@/lib/types'
import { createWelcomeMessage } from '@/lib/utils/conversationUtils'
import { deepFreeze } from '@/lib/utils/deepFreeze'

/* ------------------------------------------------------------------ */
/* 1 ▸ Dexie storage adapter (unchanged)                              */
/* ------------------------------------------------------------------ */
class SlidesDB extends Dexie {
  zustand!: Dexie.Table<{ id: string; value: string }, string>
  constructor() {
    super('slidesDB')
    this.version(1).stores({ zustand: 'id' })
  }
}
const db = new SlidesDB()
const dexieStorage = {
  getItem: (k: string) => db.zustand.get(k).then(r => r?.value ?? null),
  setItem: (k: string, v: string) => db.zustand.put({ id: k, value: v }),
  removeItem: (k: string) => db.zustand.delete(k),
}

/* ------------------------------------------------------------------ */
/* 2 ▸ State segments & helpers                                       */
/* ------------------------------------------------------------------ */
export type Snapshot = StoreSnapshot<TLRecord>

interface SlidesStateData {
  slides: SlideData[]
  currentSlideId: string
}

interface SlidesEphemeral {
  editor: Editor | null
  /** heavy snapshots live here, NOT in the draft */
  snapshots: Map<string, Snapshot>
}

interface SlidesActions {
  initEditor: (e: Editor) => void
  addSlide: () => void
  deleteSlide: (id: string) => void
  setCurrentSlide: (id: string) => void
  duplicateSlide: (id: string) => void
  /** capture current editor state into the snapshot map */
  saveSnapshot: () => void
}

export type SlidesState = SlidesStateData & SlidesEphemeral & SlidesActions

/*  ----------  lightweight slide factory  ---------- */
const makeLightSlide = (n: number): SlideData => ({
  id: `slide-${nanoid(6)}`,
  number: n,
  title: `Slide ${n}`,
  snapshotId: nanoid(10),
  createdAt: new Date(),
  updatedAt: new Date(),
})

const lightWelcome = deepFreeze(makeLightSlide(1))

/* ------------------------------------------------------------------ */
/* 3 ▸ Logic – only mutates SlidesStateData (Immer sees this)         */
/* ------------------------------------------------------------------ */
const logic = (set, get): SlidesActions => ({
  /* connect editor once */
  initEditor: (e) => set({ editor: e }),

  /* sync the in-memory snapshot map with the current editor store */
  saveSnapshot: () => {
    const ed = get().editor
    if (!ed) return
    const slide = get().slides.find(s => s.id === get().currentSlideId)
    if (!slide) return
    get().snapshots.set(slide.snapshotId, ed.store.getSnapshot())
  },

  addSlide: () =>
    set((draft: SlidesStateData) => {
      const idx = draft.slides.length + 1
      const light = makeLightSlide(idx)
      draft.slides.push(light)
      draft.currentSlideId = light.id
    }),

  deleteSlide: (id) =>
    set((draft: SlidesStateData) => {
      if (draft.slides.length === 1) return
      draft.slides = draft.slides.filter(s => s.id !== id)
      draft.slides.forEach((s, i) => (s.number = i + 1))
      if (draft.currentSlideId === id) draft.currentSlideId = draft.slides[0].id
    }),

  setCurrentSlide: (id) => {
    /* persist current snapshot then switch */
    get().saveSnapshot()

    set((draft: SlidesStateData) => {
      if (!draft.slides.some(s => s.id === id)) return
      draft.currentSlideId = id
    })

    /* load new snapshot */
    const slide = get().slides.find(s => s.id === id)!
    const snap = get().snapshots.get(slide.snapshotId)
    snap && get().editor?.store.loadSnapshot(snap)
  },

  duplicateSlide: (id) => {
    get().saveSnapshot()

    set((draft: SlidesStateData) => {
      const src = draft.slides.find(s => s.id === id)
      if (!src) return
      const dup: SlideData = {
        ...src,
        id: `slide-${nanoid(6)}`,
        snapshotId: nanoid(10),
        number: draft.slides.length + 1,
        title: `${src.title} (Copy)`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      draft.slides.push(dup)
      draft.currentSlideId = dup.id
    })

    /* copy snapshot in the map */
    const srcSnap = get().snapshots.get(
      get().slides.find(s => s.id === id)!.snapshotId
    )
    if (srcSnap) {
      const dupSlide = get().slides.find(s => s.title.endsWith('(Copy)'))!
      get().snapshots.set(dupSlide.snapshotId, structuredClone(srcSnap) as Snapshot)
    }
  },
})

/* ------------------------------------------------------------------ */
/* 4 ▸ store creation                                                 */
/* ------------------------------------------------------------------ */
export const useSlidesStore = create<SlidesState>()(
  persist(
    immer<SlidesState>((set, get, api) => ({
      /* ─ data ─ */          slides: [lightWelcome], currentSlideId: lightWelcome.id,
      /* ─ mem ─  */          editor: null, snapshots: new Map(),
      /* ─ acts ─ */          ...logic(set, get),
    })),
    {
      name: 'slides',                    // Dexie key
      storage: createJSONStorage(() => dexieStorage),
      /** only serialise the lightweight data */
      partialize: ({ slides, currentSlideId }): SlidesStateData => ({
        slides,
        currentSlideId,
      }),
      /* restore dates */
      merge: (saved, cur) => ({
        ...cur,
        ...(saved as SlidesStateData),
        slides: (saved as SlidesStateData).slides.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        })),
      }),
    }
  )
)