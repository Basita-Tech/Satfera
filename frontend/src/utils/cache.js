class DataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }
  set(key, value, ttl = 30000) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }
  get(key) {
    const expiry = this.timestamps.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
  has(key) {
    const expiry = this.timestamps.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return false;
    }
    return this.cache.has(key);
  }
  clear(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }
  clearAll() {
    this.cache.clear();
    this.timestamps.clear();
  }
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
export const cachedFetch = async (cacheKey, fetchFn, ttl = 30000) => {
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }
  const data = await fetchFn();
  dataCache.set(cacheKey, data, ttl);
  return data;
};