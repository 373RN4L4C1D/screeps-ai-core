/**
 * INTELLIGENCE SUPPORT ACTIVITY (ISA)
 * Secure cache operations with validation protocols
 */

if (!global.cache) global.cache = {};

module.exports = {
    get: function(key, theater, source, ttl = 10) {
        if (!theater || !key) {
            console.log(`Intel Error: Invalid theater (${theater}) or key (${key})`);
            return source ? source() : null;
        }
        
        if (!global.cache[theater]) {
            global.cache[theater] = {};
        }
        
        const theaterIntel = global.cache[theater];
        const entry = theaterIntel[key];
        
        if (entry && Game.time <= entry.expiry) {
            const assets = entry.ids
                .map(id => Game.getObjectById(id))
                .filter(obj => obj !== null);
            
            // Cache invalidation if >50% assets destroyed
            if (assets.length < entry.ids.length * 0.5) {
                delete theaterIntel[key];
                return this.get(key, theater, source, ttl);
            }
            
            return assets;
        }
        
        if (typeof source !== 'function') {
            console.log(`Intel Warning: No source for ${key} in ${theater}`);
            return [];
        }
        
        const data = source();
        if (!Array.isArray(data)) {
            console.log(`Intel Warning: Source for ${key} returned non-array`);
            return data;
        }
        
        theaterIntel[key] = {
            ids: data.map(obj => obj.id).filter(id => id),
            expiry: Game.time + ttl,
            timestamp: Game.time
        };
        
        return data;
    },
    
    invalidate: function(key, theater) {
        if (global.cache[theater] && global.cache[theater][key]) {
            delete global.cache[theater][key];
        }
    },
    
    invalidateTheater: function(theater) {
        delete global.cache[theater];
    },
    
    setMeta: function(theater, key, value) {
        if (!Memory.rooms) Memory.rooms = {};
        if (!Memory.rooms[theater]) Memory.rooms[theater] = {};
        if (!Memory.rooms[theater].meta) Memory.rooms[theater].meta = {};
        Memory.rooms[theater].meta[key] = value;
    },
    
    getMeta: function(theater, key) {
        if (!Memory.rooms || !Memory.rooms[theater] || !Memory.rooms[theater].meta) {
            return undefined;
        }
        return Memory.rooms[theater].meta[key];
    },
    
    getIntelSummary: function() {
        const report = {};
        let totalEntries = 0;
        
        for (const theater in global.cache) {
            const entries = Object.keys(global.cache[theater]).length;
            report[theater] = entries;
            totalEntries += entries;
        }
        
        return { theaters: report, totalEntries, currentTick: Game.time };
    }
};
