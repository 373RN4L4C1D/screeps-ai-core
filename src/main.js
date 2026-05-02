/**
 * OPERATION GRIDIRON - Reactive Swamp Infrastructure Only
 * Mission: Roads ONLY on swamp (plains is waste)
 * Priority: Critical path first, swamp segment first
 */

require('./cache.manager');

const COMBAT_UNITS = {
    combat_logistics: require('./role.combat_logistics'),
    combat_assault: require('./role.combat_assault'),
    seabee: require('./role.seabee'),
    area_command: require('./role.area_command')
};

const INFRASTRUCTURE_QUEUE = {
    reports: {},
    
    reportSwampFatigue: function(creep) {
        // ONLY report if actually on swamp
        const terrain = creep.room.getTerrain().get(creep.pos.x, creep.pos.y);
        if (terrain !== TERRAIN_MASK_SWAMP) return; // Ignore plains!
        
        const key = `${creep.room.name}_${creep.pos.x}_${creep.pos.y}`;
        if (!this.reports[key]) {
            this.reports[key] = {
                pos: {x: creep.pos.x, y: creep.pos.y},
                room: creep.room.name,
                count: 0,
                lastReport: 0
            };
        }
        this.reports[key].count++;
        this.reports[key].lastReport = Game.time;
    },
    
    getPrioritySwampSegment: function(room) {
        const roomReports = Object.values(this.reports).filter(r => 
            r.room === room.name && 
            Game.time - r.lastReport < 100 &&
            room.getTerrain().get(r.pos.x, r.pos.y) === TERRAIN_MASK_SWAMP // Verify still swamp
        );
        
        if (roomReports.length === 0) return null;
        
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        
        const sorted = roomReports.sort((a, b) => {
            if (a.count !== b.count) return b.count - a.count;
            const distA = spawn ? Math.abs(a.pos.x - spawn.pos.x) + Math.abs(a.pos.y - spawn.pos.y) : 999;
            const distB = spawn ? Math.abs(b.pos.x - spawn.pos.x) + Math.abs(b.pos.y - spawn.pos.y) : 999;
            return distA - distB;
        });
        
        return sorted[0];
    },
    
    clearSegment: function(roomName, x, y) {
        const key = `${roomName}_${x}_${y}`;
        delete this.reports[key];
    }
};

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

function hasSourceKeeper(room) {
    return room.find(FIND_HOSTILE_CREEPS, {
        filter: c => c.owner.username === 'Source Keeper'
    }).length > 0;
}

function determineMission(fob) {
    const room = fob.room;
    const current = getTheaterReadiness();
    
    if (current.combat_logistics === 0) return 'combat_logistics';
    
    if (hasSourceKeeper(room) && current.combat_assault === 0 && room.energyAvailable >= 800) {
        return 'combat_assault';
    }
    
    const level = Math.min(room.controller ? room.controller.level : 1, 8);
    
    const construction = room.find(FIND_CONSTRUCTION_SITES);
    const hasConstruction = construction.length > 0;
    
    const priorities = [
        { mission: 'combat_logistics', min: 2 },
        { mission: 'seabee', min: hasConstruction ? 1 : 0 },
        { mission: 'area_command', min: current.combat_logistics >= 2 ? 1 : 0 }
    ];
    
    for (const p of priorities) {
        if (current[p.mission] < p.min) return p.mission;
    }
    
    return current.area_command < level + 2 ? 'area_command' : null;
}

function equipUnit(budget, mission) {
    if (mission === 'combat_assault') {
        if (budget >= 800) {
            return [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE, HEAL, HEAL];
        }
        return null;
    }
    
    if (mission === 'combat_logistics') {
        if (budget >= 550) return [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];
        if (budget >= 300) return [WORK, CARRY, MOVE, MOVE];
        return [WORK, CARRY, MOVE];
    }
    
    if (mission === 'area_command') {
        if (budget >= 550) return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
        return [WORK, CARRY, MOVE, MOVE];
    }
    
    if (mission === 'seabee') {
        if (budget >= 400) return [WORK, WORK, CARRY, MOVE, MOVE];
        return [WORK, CARRY, MOVE];
    }
    
    return [WORK, CARRY, MOVE];
}

function deployUnit(fob, mission) {
    const budget = fob.room.energyAvailable;
    const kit = equipUnit(budget, mission);
    
    if (!kit) {
        console.log(`⏳ ${mission}: Need ${mission === 'combat_assault' ? 800 : 300}e (have ${budget})`);
        return ERR_NOT_ENOUGH_ENERGY;
    }
    
    const prefix = mission === 'combat_assault' ? 'SNIPER' : mission.substring(0, 3).toUpperCase();
    const name = `${prefix}_${Game.time}`;
    
    const result = fob.spawnCreep(kit, name, {
        memory: {
            mission: mission,
            room: fob.room.name,
            born: Game.time
        }
    });
    
    if (result === OK) {
        const icon = mission === 'combat_assault' ? '🎯' : 
                    mission === 'combat_logistics' ? '⛏️' : 
                    mission === 'seabee' ? '🔨' : '⬆️';
        console.log(`${icon} ${name} deployed`);
    }
    
    return result;
}

function buildSwampRoadsOnly(room) {
    if (!room.controller || !room.controller.my) return;
    
    // Check existing road construction
    const existingRoads = room.find(FIND_CONSTRUCTION_SITES, {
        filter: s => s.structureType === STRUCTURE_ROAD
    });
    
    if (existingRoads.length > 0) {
        const road = existingRoads[0];
        const terrain = room.getTerrain().get(road.pos.x, road.pos.y);
        
        // Delete if accidentally on plains
        if (terrain !== TERRAIN_MASK_SWAMP) {
            road.remove();
            console.log(`❌ Removed plains road @ ${road.pos.x},${road.pos.y}`);
            return;
        }
        
        // Report progress
        const progress = Math.floor((road.progress / road.progressTotal) * 100);
        console.log(`🛣️ Swamp road: ${progress}% @ ${road.pos.x},${road.pos.y}`);
        return; // One at a time
    }
    
    // Get priority swamp segment
    const segment = INFRASTRUCTURE_QUEUE.getPrioritySwampSegment(room);
    
    if (segment && segment.count >= 3) {
        const {x, y} = segment.pos;
        
        // Final terrain check
        const finalTerrain = room.getTerrain().get(x, y);
        
        // Only build if SWAMP and no road exists
        if (finalTerrain === TERRAIN_MASK_SWAMP) {
            const hasRoad = room.lookAt(x, y).some(s => 
                s.type === LOOK_STRUCTURES && s.structure.structureType === STRUCTURE_ROAD
            );
            
            if (!hasRoad) {
                const result = room.createConstructionSite(x, y, STRUCTURE_ROAD);
                if (result === OK) {
                    console.log(`🛣️ SWAMP ROAD ordered @ ${x},${y} (${segment.count} reports)`);
                }
            } else {
                INFRASTRUCTURE_QUEUE.clearSegment(room.name, x, y); // Already built
            }
        } else {
            INFRASTRUCTURE_QUEUE.clearSegment(room.name, x, y); // Not swamp anymore
        }
    }
}

function buildExtensions(room) {
    if (!room.controller || !room.controller.my) return;
    
    const level = room.controller.level;
    const extensions = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_EXTENSION
    });
    const sites = room.find(FIND_CONSTRUCTION_SITES, {
        filter: s => s.structureType === STRUCTURE_EXTENSION
    });
    
    const maxExtensions = CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][level] || 0;
    const needed = maxExtensions - extensions.length - sites.length;
    
    if (needed > 0 && sites.length === 0) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return;
        
        for (let range = 2; range <= 6; range++) {
            for (let dx = -range; dx <= range; dx++) {
                for (let dy = -range; dy <= range; dy++) {
                    if (Math.abs(dx) !== range && Math.abs(dy) !== range) continue;
                    
                    const x = spawn.pos.x + dx;
                    const y = spawn.pos.y + dy;
                    
                    if (x < 2 || x > 47 || y < 2 || y > 47) continue;
                    
                    const terrain = room.getTerrain().get(x, y);
                    if (terrain === TERRAIN_MASK_WALL) continue;
                    
                    const result = room.createConstructionSite(x, y, STRUCTURE_EXTENSION);
                    if (result === OK) {
                        console.log(`🏗️ Extension @ ${x},${y} (${needed} more needed)`);
                        return;
                    }
                }
            }
        }
    }
}

module.exports.loop = function() {
    for (const name in Memory.creeps) {
        if (!Game.creeps[name]) delete Memory.creeps[name];
    }
    
    for (const key in INFRASTRUCTURE_QUEUE.reports) {
        if (Game.time - INFRASTRUCTURE_QUEUE.reports[key].lastReport > 100) {
            delete INFRASTRUCTURE_QUEUE.reports[key];
        }
    }
    
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my) continue;
        
        buildSwampRoadsOnly(room);
        buildExtensions(room);
    }
    
    for (const fobName in Game.spawns) {
        const fob = Game.spawns[fobName];
        if (fob.spawning) continue;
        
        const mission = determineMission(fob);
        if (mission) deployUnit(fob, mission);
    }
    
    for (const name in Game.creeps) {
        const creep = Game.creeps[name];
        
        // REPORT SWAMP FATIGUE ONLY
        if (creep.fatigue > 0 && creep.memory.mission === 'combat_logistics') {
            INFRASTRUCTURE_QUEUE.reportSwampFatigue(creep);
        }
        
        const role = COMBAT_UNITS[creep.memory.mission];
        if (role && role.run) {
            try {
                role.run(creep);
            } catch (e) {
                console.log(`💥 ${name}: ${e.message}`);
            }
        }
    }
    
    if (Game.time % 100 === 0) {
        const status = getTheaterReadiness();
        const swampReports = Object.keys(INFRASTRUCTURE_QUEUE.reports).length;
        console.log(`⚡ GridIRON | Units:${status.total} SwampPoints:${swampReports}`);
    }
};
