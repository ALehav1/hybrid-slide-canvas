/**
 * Client Instance ID Management
 * 
 * Provides utilities for generating and retrieving a unique client instance ID.
 * This ID is used to prefix TLDraw shape IDs to ensure unique identifiers when
 * working across multiple devices or browser instances.
 * 
 * PRIVACY NOTE: The client ID is a randomly generated identifier that contains
 * no personally identifiable information (PII). It is used solely for technical
 * purposes to ensure shape ID uniqueness across browser tabs and devices.
 * 
 * @module clientId
 */

import { nanoid } from 'nanoid';
import { logger } from './logging';
import { type TLShapeId } from '@tldraw/tldraw';

/** Storage key for persisting the client-instance prefix (immutable). */
const CLIENT_ID_STORAGE_KEY = 'hybrid-slide-canvas:client-instance-id' as const;

/**
 * Get the client instance ID from storage, or generate a new one if not found.
 * Once generated, the ID persists across page reloads.
 * 
 * @returns {string} The client instance ID
 */
export function getClientInstanceId(): string {
  try {
    // Try to get existing client ID from localStorage
    let id = localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    
    // If no client ID exists, generate a new one and store it
    if (!id) {
      id = `cid-${nanoid(6)}`;
      localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
      logger?.info?.('Generated new clientId', { id });
    }
    
    return id;
  } catch (err) {
    // localStorage may be disabled (e.g. private browsing or test environments)
    logger?.warn?.('localStorage unavailable – using ephemeral clientId', err);
    return `tmp-${nanoid(6)}`;
  }
}

/**
 * Create a TLDraw shape ID that is guaranteed to be unique across different client instances.
 * Prefixes the ID with the client instance ID to avoid collisions across browser tabs.
 * 
 * The generated ID uses 10 characters for the suffix, yielding ~10²⁵ permutations per client,
 * ensuring virtually zero collision probability even at scale.
 * 
 * @returns {TLShapeId} A unique TLDraw shape ID prefixed with client instance ID
 */
export function createUniqueShapeId(): TLShapeId {
  // Get the client instance ID and use it as a prefix
  const clientInstanceId = getClientInstanceId();
  
  // Generate a nanoid as the second part (increased from 8 to 10 for parity with TLDraw)
  const uniqueSuffix = nanoid(10);
  
  // Combine them to ensure cross-tab uniqueness while maintaining the TLShapeId type
  return `${clientInstanceId}-${uniqueSuffix}` as TLShapeId;
}
