const cache = require('cache.manager');

module.exports = {
    run: function(creep) {
        if (creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) creep.memory.building = false;
        if (!creep.memory.building && creep.store.getFreeCapacity() == 0) creep.memory.building = true;

        if (creep.memory.building) {
            const sites = cache.get('sites', creep.room.name, () => creep.room.find(FIND_CONSTRUCTION_SITES));
            if (sites.length > 0) {
                if (creep.build(sites[0]) == ERR_NOT_IN_RANGE) creep.moveTo(sites[0], {reusePath: 15});
            } else {
                // Fallback: Upgrade wenn nichts zu bauen ist
                const controller = creep.room.controller;
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) creep.moveTo(controller, {reusePath: 15});
            }
        } else {
            const sources = cache.get('active_sources', creep.room.name, () => creep.room.find(FIND_SOURCES_ACTIVE));
            const source = creep.pos.findClosestByPath(sources);
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) creep.moveTo(source, {reusePath: 15});
        }
    }
};
