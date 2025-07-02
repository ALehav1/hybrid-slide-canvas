// src/__tests__/test-utils/mocks/conversationStorage.ts
import { vi } from 'vitest';

export const mockGetItem = vi.fn();
export const mockSetItem = vi.fn();

const mockConversationStorage = {
  init: vi.fn().mockResolvedValue(undefined),
  getItem: mockGetItem,
  setItem: mockSetItem,
};

export default mockConversationStorage;
