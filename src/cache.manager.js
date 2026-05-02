/**
 * Cache Manager v1.6
 * Fix: Validierung von Memory.rooms zur Vermeidung von TypeErrors.
 */
if (!global.cache) global.cache = {};

module.exports = {
    get: function(key, roomName, finder, ttl = 20) {
        if (!global.cache[roomName]) global.cache[roomName] = {};
        const entry = global.cache[roomName][key];

        if (!entry || Game.time > entry.expiry) {
            const data = finder();
            global.cache[roomName][key] = {
                ids: data.map(obj => obj.id),
                expiry: Game.time + ttl
            };
            return data;
        }

        return entry.ids
            .map(id => Game.getObjectById(id))
            .filter(obj => obj !== null);
    },

    setMeta: function(roomName, key, value) {
        if (!Memory.rooms) Memory.rooms = {};
        if (!Memory.rooms[roomName]) Memory.rooms[roomName] = {};
        if (!Memory.rooms[roomName].meta) Memory.rooms[roomName].meta = {};
        Memory.rooms[roomName].meta[key] = value;
    },

    getMeta: function(roomName, key) {
        if (!Memory.rooms || !Memory.rooms[roomName] || !Memory.rooms[roomName].meta) return undefined;
        return Memory.rooms[roomName].meta[key];
    }
};
