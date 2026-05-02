/**
 * AREA COMMAND & CONTROL (ACC)
 * Mission: Theater security level advancement, FOB establishment
 * Motto: "Secure the perimeter"
 */

const intel = require('./cache.manager');

module.exports = {
    run: function(unit) {
        // Security Operations Toggle
        if (unit.memory.securing && unit.store[RESOURCE_ENERGY] === 0) {
            unit.memory.securing = false;
            unit.say('⛏️ RESUPPLY');
        }
        if (!unit.memory.securing && unit.store.getFreeCapacity() === 0) {
            unit.memory.securing = true;
            unit.say('⭐ SECURITY');
        }
        
        if (unit.memory.securing) {
            const commandCenter = unit.room.controller;
            if (!commandCenter) return;
            
            // Area security upgrade
            if (unit.upgradeController(commandCenter) === ERR_NOT_IN_RANGE) {
                unit.moveTo(commandCenter, {
                    visualizePathStyle: { stroke: '#aa00ff' },
                    reusePath: 20
                });
            }
            
            // Sign area if unclaimed
            if (commandCenter.sign && commandCenter.sign.username === undefined && unit.pos.isNearTo(commandCenter)) {
                unit.signController(commandCenter, "Secured by Operation Gridiron - Authorized Personnel Only");
            }
            
        } else {
            // === FORWARD LOGISTICS ACQUISITION ===
            // Priority: Container/Storage (more efficient than manual extraction)
            const depots = unit.room.find(FIND_STRUCTURES, {
                filter: s => (s.structureType === STRUCTURE_CONTAINER 
                    || s.structureType === STRUCTURE_STORAGE)
                    && s.store[RESOURCE_ENERGY] > 50
            });
            
            if (depots.length > 0) {
                const target = unit.pos.findClosestByPath(depots);
                if (target && unit.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    unit.moveTo(target, { reusePath: 10 });
                }
                return;
            }
            
            // Fallback: Direct extraction from supply points
            const supplyPoints = intel.get('active_sources', unit.room.name,
                () => unit.room.find(FIND_SOURCES_ACTIVE));
            
            if (supplyPoints.length === 0) return;
            
            const source = unit.pos.findClosestByPath(supplyPoints);
            if (!source) return;
            
            if (unit.harvest(source) === ERR_NOT_IN_RANGE) {
                unit.moveTo(source, { reusePath: 20 });
            }
        }
    }
};
