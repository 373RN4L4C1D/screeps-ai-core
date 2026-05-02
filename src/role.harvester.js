/**
 * Harvester Protokoll v1.6
 * Fokus: Entropie-Prävention und Robustheit gegenüber Stillstand.
 */
const cache = require('cache.manager');

module.exports = {
    /** @param {Creep} creep **/
    run: function(creep) {
        const roomName = creep.room.name;
        const sourceDist = cache.getMeta(roomName, 'source_dist_primary') || 0;
        
        const loadLimit = (sourceDist > 10) ? 0.5 : 1.0;
        const targetCapacity = creep.store.getCapacity() * loadLimit;

        // --- ZUSTANDS-MANAGEMENT ---
        if (!creep.memory.delivering && creep.store.getUsedCapacity() >= targetCapacity) {
            creep.memory.delivering = true;
            creep.say('🚚');
            
            if (sourceDist === 0 && creep.memory.tempDist > 0) {
                cache.setMeta(roomName, 'source_dist_primary', creep.memory.tempDist);
            }
        }
        
        if (creep.memory.delivering && creep.store.getUsedCapacity() === 0) {
            creep.memory.delivering = false;
            creep.memory.tempDist = 0;
            creep.say('⛏️');
        }

        // --- AKTIONEN ---
        if (!creep.memory.delivering) {
            const sources = cache.get('active_sources', roomName, 
                () => creep.room.find(FIND_SOURCES_ACTIVE));
            const source = creep.pos.findClosestByPath(sources);
            
            if (source) {
                const harvestResult = creep.harvest(source);
                if (harvestResult === ERR_NOT_IN_RANGE) {
                    if (creep.fatigue === 0) {
                        creep.memory.tempDist = (creep.memory.tempDist || 0) + 1;
                    }
                    creep.moveTo(source, {
                        reusePath: 15, 
                        visualizePathStyle: {stroke: '#ffaa00', opacity: 0.5}
                    });
                } else if (harvestResult === ERR_NOT_ENOUGH_RESOURCES && creep.store.getUsedCapacity() > 0) {
                    creep.memory.delivering = true;
                }
            } else {
                creep.say('💤');
                if (creep.store.getUsedCapacity() > 0) creep.memory.delivering = true;
            }
        } else {
            const sinks = cache.get('room_sinks', roomName, () => 
                creep.room.find(FIND_STRUCTURES, {
                    filter: (s) => (s.structureType === STRUCTURE_EXTENSION || 
                                    s.structureType === STRUCTURE_SPAWN)
                }));
            
            const activeTargets = sinks.filter(s => s.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
                .sort((a, b) => (a.structureType === STRUCTURE_EXTENSION ? -1 : 1));

            let target = creep.pos.findClosestByPath(activeTargets);
            if (!target) target = creep.room.controller;

            if (target) {
                const isController = (target.structureType === STRUCTURE_CONTROLLER);
                const action = isController ? 
                    creep.upgradeController(target) : creep.transfer(target, RESOURCE_ENERGY);
                
                if (action === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, {
                        reusePath: 15, 
                        visualizePathStyle: {stroke: '#ffffff', opacity: 0.5}
                    });
                }
            }
        }
    }
};
