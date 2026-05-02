/**
 * OPERATION GRIDIRON - Sniper Unit
 * Mission: Eliminate Source Keeper from safe distance
 * Tactic: Range 3 engagement (Keeper has Range 5)
 */

module.exports = {
    run: function(creep) {
        // Self-heal if damaged
        if (creep.hits < creep.hitsMax * 0.8) {
            this.selfHeal(creep);
            return;
        }
        
        this.hunt(creep);
    },
    
    hunt: function(creep) {
        // Find Source Keeper
        const target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, {
            filter: c => c.owner.username === 'Source Keeper'
        });
        
        if (!target) {
            // No keeper - liberate sources
            this.liberateSources(creep);
            return;
        }
        
        // Range check: Engage at Range 3, retreat if closer
        const range = creep.pos.getRangeTo(target);
        
        if (range < 3) {
            // Too close! Retreat
            creep.moveTo(creep.room.controller || {x: 25, y: 25}, {
                visualizePathStyle: {stroke: '#ff0000'}
            });
            creep.say('↔️ RETREAT');
        } else if (range === 3) {
            // Optimal range - FIRE!
            if (creep.rangedAttack(target) === OK) {
                creep.say('🎯 FIRE');
            }
        } else {
            // Too far - approach carefully
            creep.moveTo(target, {
                visualizePathStyle: {stroke: '#ffaa00'},
                range: 3 // Stop at range 3!
            });
            creep.say('🔭 ADVANCE');
        }
    },
    
    selfHeal: function(creep) {
        const healParts = creep.getActiveBodyparts(HEAL);
        if (healParts > 0 && creep.hits < creep.hitsMax) {
            creep.heal(creep);
            creep.say('🛠️ HEAL');
        }
    },
    
    liberateSources: function(creep) {
        // Free up blacklisted sources
        if (!Memory.gridiron || !Memory.gridiron.hotSources) return;
        
        for (const sourceId in Memory.gridiron.hotSources) {
            const source = Game.getObjectById(sourceId);
            if (source && source.room.name === creep.room.name) {
                delete Memory.gridiron.hotSources[sourceId];
                console.log(`🏆 ${creep.name} LIBERATED ${sourceId}`);
            }
        }
        
        // Patrol near sources
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source && creep.pos.getRangeTo(source) > 5) {
            creep.moveTo(source, {range: 5});
        } else {
            creep.say('✅ CLEAR');
        }
    }
};
