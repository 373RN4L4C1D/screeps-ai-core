/**
 * NAVAL MOBILE CONSTRUCTION BATTALION (SEABEE)
 * Mission: Can Do! - Route clearance, FOB construction, MSR maintenance
 * Motto: "Construimus, Batuimus" (We build, we fight)
 */

const intel = require('./cache.manager');

module.exports = {
    run: function(unit) {
        // Construction Toggle
        if (unit.memory.building && unit.store[RESOURCE_ENERGY] === 0) {
            unit.memory.building = false;
            unit.say('⛏️ RESUPPLY');
        }
        if (!unit.memory.building && unit.store.getFreeCapacity() === 0) {
            unit.memory.building = true;
            unit.say('🔨 CAN DO!');
        }
        
        if (unit.memory.building) {
            // === ROUTE CLEARANCE & FOB CONSTRUCTION ===
            const targets = intel.get('construction_sites', unit.room.name,
                () => unit.room.find(FIND_CONSTRUCTION_SITES));
            
            if (targets.length === 0) {
                // No construction missions: Support area command
                if (unit.room.controller) {
                    if (unit.upgradeController(unit.room.controller) === ERR_NOT_IN_RANGE) {
                        unit.moveTo(unit.room.controller, { reusePath: 15 });
                    }
                }
                return;
            }
            
            // Construction Priority Matrix
            const priority = {
                [STRUCTURE_SPAWN]: 1,
                [STRUCTURE_EXTENSION]: 2,
                [STRUCTURE_TOWER]: 3,
                [STRUCTURE_CONTAINER]: 4,
                [STRUCTURE_STORAGE]: 5,
                [STRUCTURE_ROAD]: 6,
                [STRUCTURE_WALL]: 99,
                [STRUCTURE_RAMPART]: 100
            };
            
            targets.sort((a, b) => {
                const prioA = priority[a.structureType] || 50;
                const prioB = priority[b.structureType] || 50;
                if (prioA !== prioB) return prioA - prioB;
                
                // Same priority: More complete = finish first
                const progA = a.progress / a.progressTotal;
                const progB = b.progress / b.progressTotal;
                return progB - progA;
            });
            
            // Check closest of top 3 for efficiency
            const closest = unit.pos.findClosestByPath(targets.slice(0, 3));
            const objective = closest || targets[0];
            
            if (unit.build(objective) === ERR_NOT_IN_RANGE) {
                unit.moveTo(objective, {
                    visualizePathStyle: { stroke: '#00ff00' },
                    reusePath: 5
                });
            }
            
        } else {
            // === RESUPPLY OPERATIONS ===
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
