require('cache.manager');
const roles = {
    harvester: require('role.harvester'),
    upgrader: require('role.upgrader'),
    builder: require('role.builder')
};

const strategy = {
    execute: function() {
        const spawn = Object.values(Game.spawns)[0];
        // Erhöhte Fehlertoleranz für die Initialisierungsphase
        if (!spawn) {
            console.log('Strategy: No spawn detected.');
            return;
        }
        if (spawn.spawning) return;

        const hCount = _.filter(Game.creeps, c => c.memory.role == 'harvester').length;
        const uCount = _.filter(Game.creeps, c => c.memory.role == 'upgrader').length;
        const bCount = _.filter(Game.creeps, c => c.memory.role == 'builder').length;
        
        const sites = spawn.room.find(FIND_CONSTRUCTION_SITES);
        const energyCap = spawn.room.energyCapacityAvailable;
        
        let body = [WORK, CARRY, MOVE]; 
        if (energyCap >= 550) {
            body = [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE]; 
        }

        // Deterministische Priorisierung
        if (hCount < 3) {
            this.spawn(spawn, 'harvester', body);
        } else if (sites.length > 0 && bCount < 2) {
            this.spawn(spawn, 'builder', body);
        } else if (uCount < 2) {
            this.spawn(spawn, 'upgrader', body);
        }
    },
    spawn: function(spawn, role, body) {
        const name = role[0].toUpperCase() + '_' + Game.time;
        const result = spawn.spawnCreep(body, name, { memory: { role: role } });
        
        // Diagnostik-Output zur Fehleridentifikation
        if (result != OK) {
            console.log('Spawn Error (' + role + '): ' + result);
        } else {
            console.log('Spawning ' + role + ': ' + name);
        }
    }
};

module.exports.loop = function () {
    // 1. Memory Garbage Collection: Essenziell nach Respawn
    for (let n in Memory.creeps) {
        if (!Game.creeps[n]) {
            delete Memory.creeps[n];
        }
    }

    // 2. Identity Recovery
    for (let n in Game.creeps) {
        if (!Game.creeps[n].memory.role) {
            Game.creeps[n].memory.role = 'harvester';
        }
    }

    // 3. Execution
    strategy.execute();
    for (let n in Game.creeps) {
        const c = Game.creeps[n];
        if (roles[c.memory.role]) {
            try {
                roles[c.memory.role].run(c);
            } catch (e) {
                console.log('Role Execution Error (' + n + '): ' + e);
            }
        }
    }
};
