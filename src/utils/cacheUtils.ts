interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface QuotaTracker {
  dailyQuota: number;
  usedQuota: number;
  resetTime: number;
  lastApiCall: number;
  consecutiveErrors: number;
  // Add per-minute tracking
  minuteQuota: number;
  usedThisMinute: number;
  minuteResetTime: number;
}

class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private quotaTracker = new Map<string, QuotaTracker>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly GOOGLE_API_TTL = 24 * 60 * 60 * 1000; // 24 hours for Google data
  private readonly QUOTA_RESET_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MINUTE_RESET_INTERVAL = 60 * 1000; // 1 minute
  
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });

    // Also store in localStorage for persistence
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: Date.now(),
        ttl,
      }));
    } catch (error) {
      console.warn('Failed to store in localStorage:', error);
    }
  }

  get<T>(key: string): T | null {
    // Check memory cache first
    const memoryItem = this.cache.get(key);
    if (memoryItem && this.isValid(memoryItem)) {
      return memoryItem.data;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const item: CacheItem<T> = JSON.parse(stored);
        if (this.isValid(item)) {
          // Restore to memory cache
          this.cache.set(key, item);
          return item.data;
        } else {
          // Remove expired item
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }

    return null;
  }

  private isValid<T>(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp < item.ttl;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    localStorage.removeItem(`cache_${key}`);
  }

  clear(): void {
    this.cache.clear();
    // Clear all cache items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }

  // Google API specific caching methods
  setGoogleData<T>(key: string, data: T): void {
    this.set(key, data, this.GOOGLE_API_TTL);
  }

  // Quota management methods
  initQuotaTracker(apiKey: string, dailyLimit: number = 1000, minuteLimit: number = 1): void {
    const now = Date.now();
    const existing = this.quotaTracker.get(apiKey);
    
    if (!existing || now - existing.resetTime > this.QUOTA_RESET_INTERVAL) {
      this.quotaTracker.set(apiKey, {
        dailyQuota: dailyLimit,
        usedQuota: 0,
        resetTime: now,
        lastApiCall: 0,
        consecutiveErrors: 0,
        minuteQuota: minuteLimit,
        usedThisMinute: 0,
        minuteResetTime: now
      });
    }
  }

  canMakeApiCall(apiKey: string): boolean {
    const tracker = this.quotaTracker.get(apiKey);
    if (!tracker) return true;
    
    const now = Date.now();
    
    // Reset daily quota if 24 hours have passed
    if (now - tracker.resetTime > this.QUOTA_RESET_INTERVAL) {
      tracker.usedQuota = 0;
      tracker.resetTime = now;
      tracker.consecutiveErrors = 0;
    }
    
    // Reset minute quota if 1 minute has passed
    if (now - tracker.minuteResetTime > this.MINUTE_RESET_INTERVAL) {
      tracker.usedThisMinute = 0;
      tracker.minuteResetTime = now;
    }
    
    // Check both daily and per-minute limits
    const dailyOk = tracker.usedQuota < tracker.dailyQuota;
    const minuteOk = tracker.usedThisMinute < tracker.minuteQuota;
    
    // Also enforce minimum delay between calls (2+ minutes for Google Business API)
    const timeSinceLastCall = now - tracker.lastApiCall;
    const minDelayOk = timeSinceLastCall > 120000; // 2 minutes minimum
    
    return dailyOk && minuteOk && minDelayOk;
  }

  recordApiCall(apiKey: string, success: boolean = true): void {
    const tracker = this.quotaTracker.get(apiKey);
    if (!tracker) return;
    
    tracker.usedQuota++;
    tracker.usedThisMinute++;
    tracker.lastApiCall = Date.now();
    
    if (success) {
      tracker.consecutiveErrors = 0;
    } else {
      tracker.consecutiveErrors++;
    }
  }

  getBackoffDelay(apiKey: string): number {
    const tracker = this.quotaTracker.get(apiKey);
    if (!tracker) return 1000;
    
    // Exponential backoff based on consecutive errors
    const baseDelay = 1000; // 1 second
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(2, tracker.consecutiveErrors), maxDelay);
    
    return delay;
  }

  getQuotaStatus(apiKey: string): QuotaTracker | null {
    return this.quotaTracker.get(apiKey) || null;
  }
}

export const cacheManager = new CacheManager();

// Enhanced cached query with quota management
export const createCachedQuery = <T>(
  key: string, 
  fetcher: () => Promise<T>, 
  ttl?: number,
  quotaKey?: string
) => {
  return async (): Promise<T> => {
    // Check cache first
    const cached = cacheManager.get<T>(key);
    if (cached) {
      console.log(`Cache hit for ${key}`);
      return cached;
    }

    // Check quota if provided
    if (quotaKey && !cacheManager.canMakeApiCall(quotaKey)) {
      throw new Error(`Daily quota exceeded for ${quotaKey}`);
    }

    // Apply backoff delay if needed
    if (quotaKey) {
      const delay = cacheManager.getBackoffDelay(quotaKey);
      if (delay > 1000) {
        console.log(`Applying backoff delay: ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    try {
      console.log(`Cache miss for ${key}, fetching...`);
      const data = await fetcher();
      cacheManager.set(key, data, ttl);
      
      if (quotaKey) {
        cacheManager.recordApiCall(quotaKey, true);
      }
      
      return data;
    } catch (error) {
      if (quotaKey) {
        cacheManager.recordApiCall(quotaKey, false);
      }
      throw error;
    }
  };
};