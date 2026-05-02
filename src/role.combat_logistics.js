/**
 * COMBAT LOGISTICS CORPS (CLC)
 * Mission: Force sustainment, supply chain security, resource extraction
 * Motto: "Beans and Bullets"
 */

const intel = require('./cache.manager');

module.exports = {
    run: function(unit) {
        // Supply Run Toggle
        if (unit.memory.delivering && unit.store[RESOURCE_ENERGY] === 0) {
            unit.memory.delivering = false;
            unit.say('⛏️ EXTRACT');
        }
        if (!unit.memory.delivering && unit.store.getFreeCapacity() === 0) {
            unit.memory.delivering = true;
            unit.say('🚚 SUPPLY');
        }
        
        if (!unit.memory.delivering) {
            // === RESOURCE EXTRACTION PHASE ===
            // Priority 1: Salvage operations (ruins/tombs)
            const salvage = unit.room.find(FIND_TOMBSTONES, {
                filter: t => t.store[RESOURCE_ENERGY] > 0
            });
            
            if (salvage.length > 0) {
                const target = unit.pos.findClosestByPath(salvage);
                if (target && unit.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    unit.moveTo(target, { visualizePathStyle: { stroke: '#ff0000' } });
                }
                return;
            }
            
            // Priority 2: Supply Point Operations
            const supplyPoints = intel.get('active_sources', unit.room.name, 
                () => unit.room.find(FIND_SOURCES_ACTIVE));
            
            if (supplyPoints.length === 0) {
                unit.say('💤 STANDBY');
                return;
            }
            
            // Sticky assignment to prevent congestion
            if (!unit.memory.supplyPoint) {
                const clcUnits = Object.values(Game.creeps).filter(c => c.memory.mission === 'combat_logistics');
                const index = clcUnits.indexOf(unit) % supplyPoints.length;
                unit.memory.supplyPoint = supplyPoints[index].id;
            }
            
            const assignedPoint = Game.getObjectById(unit.memory.supplyPoint) || supplyPoints[0];
            if (!assignedPoint) return;
            
            const harvestResult = unit.harvest(assignedPoint);
            if (harvestResult === ERR_NOT_IN_RANGE) {
                unit.moveTo(assignedPoint, {
                    visualizePathStyle: { stroke: '#ffaa00' },
                    reusePath: 10
                });
            } else if (harvestResult === ERR_NOT_ENOUGH_RESOURCES && unit.store.getUsedCapacity() > 0) {
                unit.memory.delivering = true;
            }
            
        } else {
            // === LOGISTICS DELIVERY PHASE ===
            // Priority chain: Extensions → Spawn → Tower → Controller (fallback)
            const targets = [];
            
            // Forward Supply Points (Extensions)
            const extensions = unit.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_EXTENSION 
                    && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            targets.push(...extensions.sort((a, b) => a.pos.getRangeTo(unit) - b.pos.getRangeTo(b)));
            
            // Command Post (Spawn)
            const command = unit.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_SPAWN 
                    && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            });
            targets.push(...command);
            
            // Defense Batteries (Towers)
            const artillery = unit.room.find(FIND_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_TOWER 
                    && s.store.getFreeCapacity(RESOURCE_ENERGY) > 200
            });
            targets.push(...artillery.sort((a, b) => a.store[RESOURCE_ENERGY] - b.store[RESOURCE_ENERGY]));
            
            if (targets.length > 0) {
                const best = unit.pos.findClosestByPath(targets);
                if (best) {
                    if (unit.transfer(best, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        unit.moveTo(best, {
                            visualizePathStyle: { stroke: '#ffffff' }
                        });
                    }
                }
            } else {
                // Fallback: Area security upgrade
                if (unit.room.controller) {
                    if (unit.upgradeController(unit.room.controller) === ERR_NOT_IN_RANGE) {
                        unit.moveTo(unit.room.controller);
                    }
                }
            }
        }
    }
};
