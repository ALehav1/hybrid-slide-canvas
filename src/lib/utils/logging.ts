/**
 * Advanced logging utility with tree-shaking, structured logging,
 * timestamps, log level control, and consistent environment checks.
 * 
 * Features:
 * - Tree-shakable: Debug calls are removed in production builds
 * - Structured logging: JSON-serializable logs for better ingestion
 * - Timestamps: ISO timestamps for event correlation
 * - Log level control: Runtime adjustable logging level
 * - Consistent environment checks: Uses import.meta.env
 */

import { nanoid } from 'nanoid';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const PROD = import.meta.env.PROD;
let currentLevel: LogLevel = PROD ? 'warn' : 'debug';

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50,
};

/**
 * Determines if a log at the given level should be output based on the current log level setting
 */
function shouldLog(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[currentLevel];
}

/**
 * Core logging function that handles structured output and level filtering
 * @param level The log level
 * @param msg The message to log
 * @param data Optional data payload
 */
function baseLog(level: Exclude<LogLevel, 'silent'>, msg: string, data?: unknown): void {
  if (PROD && level === 'debug') return;  // hard-block debug in prod
  if (!shouldLog(level)) return;          // runtime level gating

  const ts = new Date().toISOString();
  const payload = { id: nanoid(6), ts, level, msg, data };

  // Use native console methods for color / filtering
  (console as any)[level](payload);
}

/**
 * Logger interface with configurable level and structured output.
 * In development, outputs detailed JSON logs with timestamps and IDs.
 * In production, minimal output with runtime level control.
 */
export const logger = {
  /**
   * Set the minimum log level that will be output
   * @param lvl The minimum level to show ('debug', 'info', 'warn', 'error', or 'silent')
   */
  setLevel: (lvl: LogLevel): void => {
    currentLevel = lvl;
  },

  /**
   * Get the current log level
   * @returns The current log level
   */
  getLevel: (): LogLevel => currentLevel,

  /**
   * Log a debug message (development only)
   * @param msg The message to log
   * @param data Optional data to include
   */
  debug: (msg: string, data?: unknown): void => { baseLog('debug', msg, data); },

  /**
   * Log an informational message
   * @param msg The message to log
   * @param data Optional data to include
   */
  info: (msg: string, data?: unknown): void => { baseLog('info', msg, data); },

  /**
   * Log a warning message
   * @param msg The message to log
   * @param data Optional data to include
   */
  warn: (msg: string, data?: unknown): void => { baseLog('warn', msg, data); },

  /**
   * Log an error message
   * @param msg The message to log
   * @param data Optional data to include
   */
  error: (msg: string, data?: unknown): void => { baseLog('error', msg, data); },
} as const;
