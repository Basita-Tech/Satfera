// Cache utility for fast data retrieval
class DataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  // Set cache with TTL (time to live in milliseconds)
  set(key, value, ttl = 30000) { // Default 30 seconds
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  // Get cached data if not expired
  get(key) {
    const expiry = this.timestamps.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  // Check if cache exists and is valid
  has(key) {
    const expiry = this.timestamps.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  // Clear specific cache
  clear(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
    this.timestamps.clear();
  }

  // Clear expired entries
  clearExpired() {
    const now = Date.now();
    for (const [key, expiry] of this.timestamps.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }
}

export const dataCache = new DataCache();

// Prefetch utility for proactive data loading
export const prefetchData = async (fetchFn, cacheKey, ttl = 30000) => {
  try {
    const data = await fetchFn();
    dataCache.set(cacheKey, data, ttl);
    return data;
  } catch (error) {
    console.error('Prefetch error:', error);
    return null;
  }
};

// Wrapper for cached API calls
export const cachedFetch = async (cacheKey, fetchFn, ttl = 30000) => {
  // Return cached data if available
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  // Fetch new data
  const data = await fetchFn();
  dataCache.set(cacheKey, data, ttl);
  return data;
};
