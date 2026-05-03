const NodeCache = require('node-cache');
const logger = require('../utils/logger');

/**
 * 🧊 CACHE ABSTRACTION SERVICE
 * Decouples business logic from specific cache implementations.
 * Designed to be easily swapped for Redis.
 */
class CacheService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
        logger.info('🧊 Cache Service Initialized (In-Memory)');
    }

    get(key) {
        return this.cache.get(key);
    }

    set(key, value, ttl = 600) {
        return this.cache.set(key, value, ttl);
    }

    del(key) {
        return this.cache.del(key);
    }

    flush() {
        return this.cache.flushAll();
    }

    /**
     * Invalidate multiple keys by pattern
     * In-memory pattern matching is simple
     */
    invalidatePattern(pattern) {
        const keys = this.cache.keys();
        const matches = keys.filter(k => k.includes(pattern));
        if (matches.length > 0) {
            this.cache.del(matches);
            logger.info(`🧊 Invalidated ${matches.length} cache keys matching: ${pattern}`);
        }
    }
}

module.exports = new CacheService();
