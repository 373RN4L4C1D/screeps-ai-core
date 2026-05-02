/**
 * OPERATION GRIDIRON - Theater Command Structure
 * Mission: Autonomous theater operations in adverse terrain conditions
 * Commander: Naval Mobile Construction Battalion Protocol
 */

require('./cache.manager');

// Theater Command Unit Designations - CHANGE: + combat_assault
const COMBAT_UNITS = {
    combat_logistics: require('./role.combat_logistics'), // Ex-Harvester
    seabee: require('./role.seabee'),                    // Ex-Builder
    area_command: require('./role.area_command'),          // Ex-Upgrader
    combat_assault: require('./role.combat_assault')     // NEW: Anti-Keeper
};

// Theater Force Allocation Matrix - CHANGE: + combat_assault für Level 1-8
const FORCE_ALLOCATION = {
    1: { combat_logistics: 4, area_command: 2, seabee: 2, combat_assault: 2 },
    2: { combat_logistics: 5, area_command: 3, seabee: 3, combat_assault: 3 },
    3: { combat_logistics: 6, area_command: 4, seabee: 4, combat_assault: 4 },
    4: { combat_logistics: 6, area_command: 5, seabee: 4, combat_assault: 4 },
    5: { combat_logistics: 8, area_command: 6, seabee: 4, combat_assault: 6 },
    6: { combat_logistics: 8, area_command: 6, seabee: 3, combat_assault: 6 },
    7: { combat_logistics: 8, area_command: 6, seabee: 3, combat_assault: 6 },
    8: { combat_logistics: 8, area_command: 6, seabee: 2, combat_assault: 8 }
};

// NEW: Tactical Intelligence for Threat Assessment
const TACTICAL_INTELLIGENCE = {
    scan: function(room) {
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const keepers = hostiles.filter(c => c.owner.username === 'Source Keeper');
        return {
            hostiles: hostiles.length,
            keepers: keepers.length,
            keeperLair: room.find(FIND_HOSTILE_STRUCTURES, {
                filter: s => s.structureType === STRUCTURE_KEEPER_LAIR
            }).length,
            isHotZone: keepers.length > 0
        };
    },

    combatPriority: function(room) {
        const threat = this.scan(room);
        const status = getTheaterReadiness();
        const assaultReady = status.combat_assault || 0;

        // Priority 1: No combat units = spawn assault even if no keeper (escort)
        if (assaultReady === 0 && threat.hostiles === 0) return 'low';
        
        // Priority 2: Keeper detected and need more assault units
        if (threat.keepers > 0 && assaultReady < threat.keepers * 2) return 'critical';
        
        // Priority 3: Some combat presence but could use more
        if (threat.keepers > 0 && assaultReady < threat.keepers * 3) return 'high';
        
        return 'normal';
    }
};

/**
 * COMBAT ENGINEER CORPS - Theater Infrastructure Development
 * Mission: Route clearance, FOB establishment, MSR maintenance
 */
const CORPS_OF_ENGINEERS = {
    THEATER_PLANS: {
        1: [],
        2: [{ type: STRUCTURE_EXTENSION, count: 5, distance: 2 }],
        3: [{ type: STRUCTURE_EXTENSION, count: 10, distance: 3 }, { type: STRUCTURE_TOWER, count: 1 }],
        4: [{ type: STRUCTURE_EXTENSION, count: 20, distance: 5 }, { type: STRUCTURE_STORAGE, count: 1 }],
        5: [{ type: STRUCTURE_EXTENSION, count: 30, distance: 5 }, { type: STRUCTURE_TOWER, count: 2 }],
        6: [{ type: STRUCTURE_EXTENSION, count: 40, distance: 5 }],
        7: [{ type: STRUCTURE_EXTENSION, count: 50, distance: 5 }, { type: STRUCTURE_SPAWN, count: 1 }],
        8: [{ type: STRUCTURE_EXTENSION, count: 60, distance: 5 }, { type: STRUCTURE_TOWER, count: 3 }]
    },

    execute: function(room) {
        if (!room.controller || !room.controller.my) return;

        const securityLevel = Math.min(room.controller.level, 8);
        const plan = this.THEATER_PLANS[securityLevel] || [];

        for (const directive of plan) {
            if (directive.type === STRUCTURE_EXTENSION) {
                this.establishSupplyDepot(room, directive);
            }
        }

        // Continuous route clearance operations
        this.maintainSupplyRoutes(room);
    },

    establishSupplyDepot: function(room, directive) {
        const operational = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        }).length;
        const constructing = room.find(FIND_CONSTRUCTION_SITES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        }).length;

        const required = directive.count - operational - constructing;
        if (required <= 0) return;

        const fob = room.find(FIND_MY_SPAWNS)[0];
        if (!fob) return;

        const positions = this.surveyTerrain(room, fob.pos, STRUCTURE_EXTENSION, directive.distance || 2);

        for (let i = 0; i < Math.min(required, positions.length); i++) {
            const result = room.createConstructionSite(positions[i].x, positions[i].y, STRUCTURE_EXTENSION);
            if (result === OK) {
                console.log(`🏗️ SUPPLY DEPOT ESTABLISHED at grid ${positions[i].x},${positions[i].y}`);
            }
        }
    },

    surveyTerrain: function(room, center, type, maxRange) {
        const positions = [];
        for (let dx = -maxRange; dx <= maxRange; dx++) {
            for (let dy = -maxRange; dy <= maxRange; dy++) {
                if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;

                const x = center.x + dx;
                const y = center.y + dy;

                if (x < 2 || x > 47 || y < 2 || y > 47) continue;

                const terrain = room.getTerrain().get(x, y);
                if (terrain === TERRAIN_MASK_WALL) continue;

                const scan = room.lookAt(x, y);
                const obstructed = scan.some(obj =>
                    (obj.type === LOOK_STRUCTURES && obj.structure.structureType !== STRUCTURE_ROAD && obj.structure.structureType !== STRUCTURE_RAMPART) ||
                    obj.type === LOOK_CONSTRUCTION_SITES
                );
                if (!obstructed) positions.push({x, y});
            }
        }
        return positions.sort((a, b) => {
            const distA = Math.abs(a.x - center.x) + Math.abs(a.y - center.y);
            const distB = Math.abs(b.x - center.x) + Math.abs(b.y - center.y);
            return distA - distB;
        });
    },

    maintainSupplyRoutes: function(room) {
        const fob = room.find(FIND_MY_SPAWNS)[0];
        const supplyPoints = room.find(FIND_SOURCES);
        const commandCenter = room.controller;

        if (!fob) return;

        // Primary MSR: FOB to Command Center
        if (commandCenter) this.clearRoute(room, fob.pos, commandCenter.pos);

        // Secondary MSRs: FOB to Supply Points
        for (const point of supplyPoints) {
            this.clearRoute(room, fob.pos, point.pos);
        }

        // Tertiary MSRs: Supply Point to Supply Point (alternate routes)
        if (supplyPoints.length > 1) {
            for (let i = 0; i < supplyPoints.length; i++) {
                const next = supplyPoints[(i + 1) % supplyPoints.length];
                this.clearRoute(room, supplyPoints[i].pos, next.pos);
            }
        }
    },

    clearRoute: function(room, from, to) {
        const path = room.findPath(from, to, {
            ignoreCreeps: true,
            swampCost: 1 // Roads neutralize swamp
        });

        for (const step of path) {
            const scan = room.lookAt(step.x, step.y);
            const hasRoad = scan.some(obj =>
                (obj.type === LOOK_STRUCTURES && obj.structure.structureType === STRUCTURE_ROAD) ||
                (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite.structureType === STRUCTURE_ROAD)
            );
            const hasConstruction = scan.some(obj => obj.type === LOOK_CONSTRUCTION_SITES);

            if (!hasRoad && !hasConstruction) {
                room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
            }
        }
    }
};

/**
 * Combat Unit Configuration - Swamp-Optimized Loadouts
 */
function equipCombatUnit(budget, mission) {
    // NEW: Combat Assault Loadout (ATTACK-focused)
    if (mission === 'combat_assault') {
        const assaultLoadouts = [
            { cost: 280, kit: [ATTACK, ATTACK, MOVE, MOVE, TOUGH] },           // Basic fighter
            { cost: 390, kit: [ATTACK, ATTACK, ATTACK, MOVE, MOVE, TOUGH, TOUGH] }, // Extended
            { cost: 520, kit: [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, TOUGH, TOUGH] }, // Heavy
            { cost: 800, kit: [ATTACK, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE, TOUGH, TOUGH, TOUGH] } // MAX
        ];
        
        for (let i = assaultLoadouts.length - 1; i >= 0; i--) {
            if (budget >= assaultLoadouts[i].cost) {
                return assaultLoadouts[i].kit;
            }
        }
        return [ATTACK, MOVE]; // Emergency fallback
    }

    // MOVE-heavy for adverse terrain (Civilian Units)
    const civilianLoadouts = [
        { cost: 300, kit: [WORK, CARRY, MOVE, MOVE] },
        { cost: 400, kit: [WORK, CARRY, CARRY, MOVE, MOVE, MOVE] },
        { cost: 550, kit: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE] },
        { cost: 800, kit: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE] },
        { cost: 1300, kit: Array(6).fill(WORK).concat(Array(6).fill(CARRY)).concat(Array(6).fill(MOVE)) },
        { cost: 2000, kit: Array(6).fill(WORK).concat(Array(6).fill(CARRY)).concat(Array(6).fill(MOVE)) }
    ];

    let selected = civilianLoadouts[0];
    for (const loadout of civilianLoadouts) {
        if (budget >= loadout.cost && loadout.cost <= 2000) {
            selected = loadout;
        }
    }
    return selected.kit;
}

function getTheaterReadiness() {
    const status = { combat_logistics: 0, combat_assault: 0, area_command: 0, seabee: 0, total: 0 };
    for (const name in Game.creeps) {
        const unit = Game.creeps[name];
        if (unit.memory.mission && status[unit.memory.mission] !== undefined) {
            status[unit.memory.mission]++;
        }
        status.total++;
    }
    return status;
}

// MODIFIED: Added combat priority check
function determineMission(fob) {
    const securityLevel = fob.room.controller ? fob.room.controller.level : 1;
    const allocation = FORCE_ALLOCATION[Math.min(securityLevel, 8)];
    const current = getTheaterReadiness();
    const combatPriority = TACTICAL_INTELLIGENCE.combatPriority(fob.room);

    // NEW: CRITICAL - Spawn Assault Units if Source Keeper detected
    if (combatPriority === 'critical') {
        return 'combat_assault';
    }

    // NEW: HIGH - Prioritize Assault before logistics
    if (combatPriority === 'high' && current.combat_assault < allocation.combat_assault) {
        return 'combat_assault';
    }

    // Emergency: Always have at least 2 logistics for bootstrapping
    if (current.combat_logistics === 0) return 'combat_logistics';
    if (current.combat_logistics < 2) return 'combat_logistics';

    const deficits = {
        combat_logistics: allocation.combat_logistics - current.combat_logistics,
        combat_assault: allocation.combat_assault - current.combat_assault,
        area_command: allocation.area_command - current.area_command,
        seabee: allocation.seabee - current.seabee
    };

    const constructionOps = fob.room.find(FIND_CONSTRUCTION_SITES);
    if (constructionOps.length === 0) {
        deficits.seabee = -999; // No construction missions available
    }

    let priorityMission = 'combat_logistics';
    let maxDeficit = -9999;

    for (const [mission, deficit] of Object.entries(deficits)) {
        if (deficit > maxDeficit) {
            maxDeficit = deficit;
            priorityMission = mission;
        }
    }

    return maxDeficit > 0 ? priorityMission : null;
}

function deployUnit(fob, mission) {
    const budget = fob.room.energyAvailable;
    const capacity = fob.room.energyCapacityAvailable;

    const awaitFullReadiness = fob.room.controller && fob.room.controller.level >= 2;
    const threatLevel = TACTICAL_INTELLIGENCE.scan(fob.room);

    // NEW: Emergency deployment for combat even with low energy
    if (mission === 'combat_assault' && threatLevel.keepers > 0) {
        // Allow partial loadout for urgent combat needs
    } else if (awaitFullReadiness && budget < capacity * 0.8) {
        return ERR_NOT_ENOUGH_ENERGY;
    }

    const kit = equipCombatUnit(budget, mission);
    const callsign = `${mission.substring(0,3).toUpperCase()}_${Game.time}_${Math.floor(Math.random() * 100)}`;

    const result = fob.spawnCreep(kit, callsign, {
        memory: {
            mission: mission,
            theater: fob.room.name,
            deployed: Game.time,
            combatPriority: TACTICAL_INTELLIGENCE.combatPriority(fob.room) // NEW
        }
    });

    if (result === OK) {
        const threatInfo = TACTICAL_INTELLIGENCE.scan(fob.room);
        const threatMsg = threatInfo.keepers > 0 ? ` | ⚠️ HOT ZONE: ${threatInfo.keepers} Keepers` : '';
        console.log(`🎖️ UNIT DEPLOYED: ${callsign} | MISSION: ${mission} | LOADOUT: ${budget} credits${threatMsg}`);
    } else if (result !== ERR_BUSY && result !== ERR_NOT_ENOUGH_ENERGY) {
        console.log(`❌ DEPLOYMENT FAILED (${mission}): ${result}`);
    }

    return result;
}

module.exports.loop = function() {
    // ========== AFTER ACTION REVIEW: CASUALTY REPORT ==========
    let kia = 0;
    for (const callsign in Memory.creeps) {
        if (!Game.creeps[callsign]) {
            const mem = Memory.creeps[callsign];
            
            // NEW: Todesursache analysieren
            if (mem.mission === 'combat_logistics' && mem.lastAction === 'harvesting') {
                // Speichere gefährliche Source
                if (!Memory.gridiron) Memory.gridiron = {};
                if (!Memory.gridiron.hotSources) Memory.gridiron.hotSources = {};
                
                Memory.gridiron.hotSources[mem.lastSource] = {
                    deathTime: Game.time,
                    restrictedUntil: Game.time + 1000, // 1000 Ticks sperre
                    requiresAssault: 2 // Mindestens 2 Assault-Einheiten nötig
                };
                
                console.log(`💀 SOURCE BLACKLISTED: ${mem.lastSource} | Reason: KIA @ Harvest | Restricted until T+${Game.time + 1000}`);
            }
            
            delete Memory.creeps[callsign];
            kia++;
        }
    }

    // ========== THEATER INTELLIGENCE CACHE ==========
    if (Game.time % 100 === 0) {
        const activeTheaters = Object.keys(Game.rooms);
        for (const theater in global.cache) {
            if (!activeTheaters.includes(theater)) {
                delete global.cache[theater];
            }
        }
    }

    // ========== CORPS OF ENGINEERS OPERATIONS ==========
    for (const theaterName in Game.rooms) {
        const theater = Game.rooms[theaterName];
        if (theater.controller && theater.controller.my) {
            CORPS_OF_ENGINEERS.execute(theater);
        }
    }

    // ========== UNIT IDENTITY VERIFICATION ==========
    for (const callsign in Game.creeps) {
        const unit = Game.creeps[callsign];
        if (!unit.memory.mission) {
            const heavyWeapons = unit.getActiveBodyparts(WORK);
            const transportCap = unit.getActiveBodyparts(CARRY);
            const attackParts = unit.getActiveBodyparts(ATTACK);

            // NEW: Assault units identified by ATTACK parts
            if (attackParts > 0) {
                unit.memory.mission = 'combat_assault';
            } else if (heavyWeapons > transportCap) {
                unit.memory.mission = 'area_command';
            } else if (transportCap > heavyWeapons) {
                unit.memory.mission = 'combat_logistics';
            } else {
                unit.memory.mission = 'combat_logistics';
            }

            console.log(`🔄 IDENTITY RECOVERED: ${callsign} assigned to ${unit.memory.mission}`);
        }
    }

    // ========== COMBAT DEPLOYMENT OPERATIONS ==========
    for (const fobName in Game.spawns) {
        const fob = Game.spawns[fobName];

        if (fob.spawning) continue;

        // NEW: Check threat level before deployment
        const threat = TACTICAL_INTELLIGENCE.scan(fob.room);
        if (threat.keepers > 0) {
            console.log(`🚨 ALERT: ${threat.keepers} Source Keeper(s) detected in ${fob.room.name}`);
        }

        const mission = determineMission(fob);

        if (mission) {
            deployUnit(fob, mission);
        }
    }

    // ========== TACTICAL OPERATIONS ==========
    for (const callsign in Game.creeps) {
        const unit = Game.creeps[callsign];
        const unitModule = COMBAT_UNITS[unit.memory.mission];

        if (unitModule && unitModule.run) {
            try {
                unitModule.run(unit);
            } catch (e) {
                console.log(`💥 TACTICAL FAILURE (${callsign}, ${unit.memory.mission}): ${e.message}`);
            }
        }
    }

    // ========== SITUATION REPORT (alle 100 Ticks) ==========
    if (Game.time % 100 === 0) {
        const status = getTheaterReadiness();
        const activeTheaters = Object.keys(Game.rooms).map(r => {
            const threat = TACTICAL_INTELLIGENCE.scan(Game.rooms[r]);
            return `${r}${threat.keepers > 0 ? '🔥' : ''}`;
        }).join(', ');
        
        console.log(`
========== SITREP T+${Game.time} ==========
THEATER STATUS: ${activeTheaters}
COMBAT ASSAULT: ${status.combat_assault} units ${status.combat_assault > 0 ? '⚔️' : '❌'}
COMBAT LOGISTICS: ${status.combat_logistics} units
SEABEE CONSTRUCTION: ${status.seabee} units
AREA COMMAND: ${status.area_command} units
TOTAL BOOTS ON GROUND: ${status.total}
========================================
        `);
    }
};
