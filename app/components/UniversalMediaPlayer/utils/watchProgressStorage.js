/**
 * Watch Progress Storage Utilities
 * 
 * Handles local storage of watch progress data with:
 * - Persistent storage across sessions
 * - Automatic cleanup of old data
 * - Backup and restore capabilities
 * - Progress synchronization
 */

const STORAGE_KEY = 'flyx_watch_progress';
const STORAGE_VERSION = '1.0';
const MAX_STORAGE_ENTRIES = 1000; // Limit storage size
const AUTO_SAVE_THRESHOLD = 10; // Save progress every 10 seconds of watch time

/**
 * Generate unique content key for storage
 */
export const generateContentKey = (mediaType, movieId, seasonId = null, episodeId = null) => {
  if (mediaType === 'movie') {
    return `movie_${movieId}`;
  } else if (mediaType === 'tv') {
    return `tv_${movieId}_s${seasonId}_e${episodeId}`;
  }
  return `unknown_${movieId}`;
};

/**
 * Get all watch progress data from storage
 */
export const getAllWatchProgress = () => {
  // Check if we're in the browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyStorage();
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return createEmptyStorage();
    }
    
    const parsed = JSON.parse(data);
    
    // Handle version upgrades
    if (parsed.version !== STORAGE_VERSION) {
      console.log(`🔄 Upgrading watch progress storage from ${parsed.version} to ${STORAGE_VERSION}`);
      return migrateStorage(parsed);
    }
    
    return parsed;
  } catch (error) {
    console.error('❌ Error reading watch progress:', error);
    return createEmptyStorage();
  }
};

/**
 * Save all watch progress data to storage
 */
export const saveAllWatchProgress = (data) => {
  // Check if we're in the browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    // Ensure data has proper structure
    const storageData = {
      version: STORAGE_VERSION,
      lastUpdated: new Date().toISOString(),
      entries: data.entries || {},
      metadata: {
        ...data.metadata,
        totalEntries: Object.keys(data.entries || {}).length,
        storageSize: JSON.stringify(data.entries || {}).length
      }
    };
    
    // Cleanup old entries if storage is getting too large
    if (storageData.metadata.totalEntries > MAX_STORAGE_ENTRIES) {
      storageData.entries = cleanupOldEntries(storageData.entries);
      storageData.metadata.totalEntries = Object.keys(storageData.entries).length;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    console.log(`✅ Saved watch progress: ${storageData.metadata.totalEntries} entries`);
    
    return true;
  } catch (error) {
    console.error('❌ Error saving watch progress:', error);
    return false;
  }
};

/**
 * Get watch progress for specific content
 */
export const getWatchProgress = (mediaType, movieId, seasonId = null, episodeId = null) => {
  const key = generateContentKey(mediaType, movieId, seasonId, episodeId);
  const allData = getAllWatchProgress();
  
  return allData.entries[key] || createEmptyProgressEntry(mediaType, movieId, seasonId, episodeId);
};

/**
 * Save watch progress for specific content
 */
export const saveWatchProgress = (mediaType, movieId, seasonId, episodeId, progressData) => {
  const key = generateContentKey(mediaType, movieId, seasonId, episodeId);
  const allData = getAllWatchProgress();
  
  // Create or update progress entry
  const progressEntry = {
    ...createEmptyProgressEntry(mediaType, movieId, seasonId, episodeId),
    ...progressData,
    lastWatched: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Validate progress data
  progressEntry.currentTime = Math.max(0, progressEntry.currentTime || 0);
  progressEntry.duration = Math.max(1, progressEntry.duration || 1);
  progressEntry.progress = Math.min(1, Math.max(0, progressEntry.currentTime / progressEntry.duration));
  progressEntry.isCompleted = progressEntry.progress >= 0.9; // Consider 90%+ as completed
  progressEntry.isStarted = progressEntry.progress > 0.05; // Consider 5%+ as started
  
  // Update storage
  allData.entries[key] = progressEntry;
  allData.lastUpdated = new Date().toISOString();
  
  return saveAllWatchProgress(allData);
};

/**
 * Mark content as completed
 */
export const markAsCompleted = (mediaType, movieId, seasonId = null, episodeId = null) => {
  const progress = getWatchProgress(mediaType, movieId, seasonId, episodeId);
  
  return saveWatchProgress(mediaType, movieId, seasonId, episodeId, {
    ...progress,
    progress: 1.0,
    currentTime: progress.duration,
    isCompleted: true,
    completedAt: new Date().toISOString()
  });
};

/**
 * Remove watch progress for specific content
 */
export const removeWatchProgress = (mediaType, movieId, seasonId = null, episodeId = null) => {
  const key = generateContentKey(mediaType, movieId, seasonId, episodeId);
  const allData = getAllWatchProgress();
  
  delete allData.entries[key];
  allData.lastUpdated = new Date().toISOString();
  
  return saveAllWatchProgress(allData);
};

/**
 * Get watch progress for entire TV show (all seasons/episodes)
 */
export const getShowProgress = (movieId) => {
  const allData = getAllWatchProgress();
  const showEntries = Object.entries(allData.entries)
    .filter(([key]) => key.startsWith(`tv_${movieId}_`))
    .map(([key, data]) => ({ key, ...data }));
    
  if (showEntries.length === 0) {
    return {
      totalEpisodes: 0,
      watchedEpisodes: 0,
      inProgressEpisodes: 0,
      completionRate: 0,
      totalWatchTime: 0,
      episodes: []
    };
  }
  
  const totalEpisodes = showEntries.length;
  const watchedEpisodes = showEntries.filter(ep => ep.isCompleted).length;
  const inProgressEpisodes = showEntries.filter(ep => ep.isStarted && !ep.isCompleted).length;
  const totalWatchTime = showEntries.reduce((sum, ep) => sum + (ep.currentTime || 0), 0);
  
  return {
    totalEpisodes,
    watchedEpisodes,
    inProgressEpisodes,
    completionRate: totalEpisodes > 0 ? watchedEpisodes / totalEpisodes : 0,
    totalWatchTime,
    episodes: showEntries.sort((a, b) => {
      // Sort by season, then episode
      const aMatch = a.key.match(/tv_\d+_s(\d+)_e(\d+)/);
      const bMatch = b.key.match(/tv_\d+_s(\d+)_e(\d+)/);
      
      if (aMatch && bMatch) {
        const [, aSeason, aEpisode] = aMatch.map(Number);
        const [, bSeason, bEpisode] = bMatch.map(Number);
        
        if (aSeason !== bSeason) return aSeason - bSeason;
        return aEpisode - bEpisode;
      }
      
      return a.lastWatched.localeCompare(b.lastWatched);
    })
  };
};

/**
 * Get recently watched content
 */
export const getRecentlyWatched = (limit = 20) => {
  const allData = getAllWatchProgress();
  
  return Object.entries(allData.entries)
    .map(([key, data]) => ({ key, ...data }))
    .filter(item => item.isStarted)
    .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
    .slice(0, limit);
};

/**
 * Get continue watching list (in progress content)
 */
export const getContinueWatching = (limit = 10) => {
  const allData = getAllWatchProgress();
  
  return Object.entries(allData.entries)
    .map(([key, data]) => ({ key, ...data }))
    .filter(item => item.isStarted && !item.isCompleted && item.progress > 0.05)
    .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
    .slice(0, limit);
};

/**
 * Export watch progress data
 */
export const exportWatchProgress = () => {
  const data = getAllWatchProgress();
  const exportData = {
    ...data,
    exportedAt: new Date().toISOString(),
    exportVersion: STORAGE_VERSION
  };
  
  return JSON.stringify(exportData, null, 2);
};

/**
 * Import watch progress data
 */
export const importWatchProgress = (importData, merge = true) => {
  try {
    const data = JSON.parse(importData);
    
    if (merge) {
      // Merge with existing data
      const existing = getAllWatchProgress();
      const merged = {
        ...existing,
        entries: {
          ...existing.entries,
          ...data.entries
        },
        lastUpdated: new Date().toISOString()
      };
      
      return saveAllWatchProgress(merged);
    } else {
      // Replace existing data
      return saveAllWatchProgress(data);
    }
  } catch (error) {
    console.error('❌ Error importing watch progress:', error);
    return false;
  }
};

/**
 * Clear all watch progress data
 */
export const clearAllWatchProgress = () => {
  // Check if we're in the browser environment
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Cleared all watch progress data');
    return true;
  } catch (error) {
    console.error('❌ Error clearing watch progress:', error);
    return false;
  }
};

/**
 * Get storage statistics
 */
export const getStorageStats = () => {
  const data = getAllWatchProgress();
  const entries = Object.values(data.entries);
  
  const totalEntries = entries.length;
  const completedEntries = entries.filter(e => e.isCompleted).length;
  const inProgressEntries = entries.filter(e => e.isStarted && !e.isCompleted).length;
  const totalWatchTime = entries.reduce((sum, e) => sum + (e.currentTime || 0), 0);
  
  const storageSize = JSON.stringify(data).length;
  const storageUsage = (storageSize / (1024 * 1024)).toFixed(2); // MB
  
  return {
    totalEntries,
    completedEntries,
    inProgressEntries,
    totalWatchTime,
    storageSize,
    storageUsage: `${storageUsage} MB`,
    lastUpdated: data.lastUpdated,
    version: data.version
  };
};

// Helper functions

/**
 * Create empty storage structure
 */
function createEmptyStorage() {
  return {
    version: STORAGE_VERSION,
    lastUpdated: new Date().toISOString(),
    entries: {},
    metadata: {
      totalEntries: 0,
      storageSize: 0
    }
  };
}

/**
 * Create empty progress entry
 */
function createEmptyProgressEntry(mediaType, movieId, seasonId, episodeId) {
  return {
    mediaType,
    movieId,
    seasonId,
    episodeId,
    currentTime: 0,
    duration: 0,
    progress: 0,
    isStarted: false,
    isCompleted: false,
    lastWatched: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    watchCount: 0,
    resumeCount: 0,
    completedAt: null
  };
}

/**
 * Cleanup old entries to maintain storage limits
 */
function cleanupOldEntries(entries, maxEntries = MAX_STORAGE_ENTRIES) {
  const sortedEntries = Object.entries(entries)
    .sort(([, a], [, b]) => new Date(b.lastWatched) - new Date(a.lastWatched));
    
  const keptEntries = sortedEntries.slice(0, maxEntries);
  
  console.log(`🧹 Cleaned up ${sortedEntries.length - keptEntries.length} old watch progress entries`);
  
  return Object.fromEntries(keptEntries);
}

/**
 * Migrate storage from older versions
 */
function migrateStorage(oldData) {
  // For now, just return new empty storage
  // In future versions, implement actual migration logic
  console.log('📦 No migration needed, creating fresh storage');
  return createEmptyStorage();
}

/**
 * Should save progress (throttling mechanism)
 */
export const shouldSaveProgress = (lastSaveTime, currentTime) => {
  const timeSinceLastSave = currentTime - (lastSaveTime || 0);
  return timeSinceLastSave >= AUTO_SAVE_THRESHOLD;
};

export default {
  generateContentKey,
  getAllWatchProgress,
  saveAllWatchProgress,
  getWatchProgress,
  saveWatchProgress,
  markAsCompleted,
  removeWatchProgress,
  getShowProgress,
  getRecentlyWatched,
  getContinueWatching,
  exportWatchProgress,
  importWatchProgress,
  clearAllWatchProgress,
  getStorageStats,
  shouldSaveProgress
};