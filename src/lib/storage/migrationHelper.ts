/**
 * Migration Helper for Dexie/IndexedDB
 * 
 * This module provides utilities to handle data migration from legacy localStorage
 * to our new Dexie/IndexedDB persistence system. It ensures smooth transition for
 * users who have existing data stored in localStorage.
 */

import { db, initDatabase } from './dexieStorage';
import { logger } from '../utils/logging';

/**
 * Storage migration state to prevent repeated migrations
 */
interface MigrationState {
  slidesStoreVersion: number;
  conversationStoreVersion: number;
  completedMigrations: string[];
}

/**
 * Keys used for localStorage data
 */
const STORAGE_KEYS = {
  SLIDES_LEGACY: 'slides-storage',
  CONVERSATION_LEGACY: 'conversationState',
  MIGRATION_STATE: 'dexie-migration-state'
};

/**
 * Current versions of stores - increment when schema changes
 */
const CURRENT_VERSIONS = {
  SLIDES: 1,
  CONVERSATION: 1
};

/**
 * Check if a migration has already been performed
 * 
 * @param migrationId Unique identifier for the migration
 * @returns True if migration was already performed
 */
function hasMigrationCompleted(migrationId: string): boolean {
  try {
    const state = getMigrationState();
    return state.completedMigrations.includes(migrationId);
  } catch (error) {
    logger.error('Failed to check migration state', error);
    return false;
  }
}

/**
 * Mark a migration as completed
 * 
 * @param migrationId Unique identifier for the migration
 */
function markMigrationComplete(migrationId: string): void {
  try {
    const state = getMigrationState();
    if (!state.completedMigrations.includes(migrationId)) {
      state.completedMigrations.push(migrationId);
      localStorage.setItem(STORAGE_KEYS.MIGRATION_STATE, JSON.stringify(state));
    }
  } catch (error) {
    logger.error('Failed to update migration state', error);
  }
}

/**
 * Get the current migration state
 * 
 * @returns Current migration state
 */
function getMigrationState(): MigrationState {
  const defaultState: MigrationState = {
    slidesStoreVersion: CURRENT_VERSIONS.SLIDES,
    conversationStoreVersion: CURRENT_VERSIONS.CONVERSATION,
    completedMigrations: []
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEYS.MIGRATION_STATE);
    if (!saved) return defaultState;
    
    return JSON.parse(saved) as MigrationState;
  } catch (error) {
    logger.error('Failed to retrieve migration state, using default', error);
    return defaultState;
  }
}

/**
 * Migrate slides data from localStorage to Dexie
 * 
 * @param force Force migration even if it was already performed
 * @returns Promise resolving to true if migration was performed
 */
export async function migrateSlides(force = false): Promise<boolean> {
  const migrationId = 'slides-localstorage-to-dexie';
  
  if (!force && hasMigrationCompleted(migrationId)) {
    logger.debug('Slides migration already performed, skipping');
    return false;
  }
  
  try {
    // Get legacy data
    const legacyData = localStorage.getItem(STORAGE_KEYS.SLIDES_LEGACY);
    if (!legacyData) {
      logger.debug('No legacy slides data found in localStorage');
      markMigrationComplete(migrationId);
      return false;
    }
    
    // Parse legacy data
    const parsedData = JSON.parse(legacyData);
    if (!parsedData || !parsedData.state) {
      logger.debug('Invalid legacy slides data format');
      markMigrationComplete(migrationId);
      return false;
    }
    
    // Ensure database is initialized
    await initDatabase();
    
    // Store in Dexie
    await db.zustandStore.put({
      id: 'slides-storage',
      value: JSON.stringify(parsedData.state)
    });
    
    logger.info('Successfully migrated slides from localStorage to Dexie');
    markMigrationComplete(migrationId);
    
    // Clear localStorage data to avoid duplication
    // Only clear after successful migration
    localStorage.removeItem(STORAGE_KEYS.SLIDES_LEGACY);
    
    return true;
  } catch (error) {
    logger.error('Failed to migrate slides data to Dexie', error);
    return false;
  }
}

/**
 * Migrate conversation data from localStorage to Dexie
 * 
 * @param force Force migration even if it was already performed
 * @returns Promise resolving to true if migration was performed
 */
export async function migrateConversations(force = false): Promise<boolean> {
  const migrationId = 'conversations-localstorage-to-dexie';
  
  if (!force && hasMigrationCompleted(migrationId)) {
    logger.debug('Conversations migration already performed, skipping');
    return false;
  }
  
  try {
    // Get legacy data
    const legacyData = localStorage.getItem(STORAGE_KEYS.CONVERSATION_LEGACY);
    if (!legacyData) {
      logger.debug('No legacy conversation data found in localStorage');
      markMigrationComplete(migrationId);
      return false;
    }
    
    // Parse legacy data
    const parsedData = JSON.parse(legacyData);
    if (!parsedData) {
      logger.debug('Invalid legacy conversation data format');
      markMigrationComplete(migrationId);
      return false;
    }
    
    // Ensure database is initialized
    await initDatabase();
    
    // Store in Dexie
    await db.zustandStore.put({
      id: STORAGE_KEYS.CONVERSATION_LEGACY,
      value: JSON.stringify(parsedData)
    });
    
    logger.info('Successfully migrated conversations from localStorage to Dexie');
    markMigrationComplete(migrationId);
    
    // Clear localStorage data to avoid duplication
    // Only clear after successful migration
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_LEGACY);
    
    return true;
  } catch (error) {
    logger.error('Failed to migrate conversation data to Dexie', error);
    return false;
  }
}

/**
 * Run all pending migrations
 * 
 * @returns Promise resolving when migrations are complete
 */
export async function runAllMigrations(): Promise<void> {
  logger.info('Running data migrations');
  
  try {
    await migrateSlides();
    await migrateConversations();
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations', error);
  }
}

export default {
  migrateSlides,
  migrateConversations,
  runAllMigrations,
};
