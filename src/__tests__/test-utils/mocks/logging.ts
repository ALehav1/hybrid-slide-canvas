import { vi } from 'vitest';

export const logger = {
  debug: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};
