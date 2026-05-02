/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('role.upgrader');
 * mod.thing == 'a thing'; // true
 */

const cache = require('cache.manager');

module.exports = {
    run: function(creep) {
        if (creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.upgrading = false;
        }
        if (!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
            creep.memory.upgrading = true;
        }

        if (creep.memory.upgrading) {
            const controller = cache.get('controller', creep.room.name, () => [creep.room.controller])[0];
            if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, {reusePath: 20});
            }
        } else {
            const sources = cache.get('active_sources', creep.room.name, () => creep.room.find(FIND_SOURCES_ACTIVE));
            const source = creep.pos.findClosestByPath(sources);
            if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {reusePath: 20});
            }
        }
    }
};
