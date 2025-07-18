// src/__tests__/test-utils/mocks/conversationStorage.ts
import { vi } from 'vitest'

export const mockGetItem = vi.fn()
export const mockSetItem = vi.fn()

export default {
  getItem: mockGetItem,
  setItem: mockSetItem,
}
export const CONVERSATION_STORE_KEY = 'conversationState'
