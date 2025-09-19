/**
 * Team class represents a group of blobs with shared properties
 */
class Team {
    constructor(name, color, isIndividual = false) {
        this.name = name;
        this.color = color;
        this.members = [];
        this.id = Team.nextId++;
        this.isIndividual = isIndividual; // True for single-blob teams
        this.createdAt = millis();
        
        // SIMPLIFIED: Only one core metric - Aggression (0-100%)
        this.aggression = Math.random() * (config.teamStartAggressionMax || 50) + (config.teamStartAggressionMin || 10); // Use config values
        this.maxSize = Math.floor(Math.random() * ((config.teamMaxSizeMax || 14) - (config.teamMaxSizeMin || 6) + 1)) + (config.teamMaxSizeMin || 6); // Use config range
        
        // NEW: Team Life/Health system (0-100)
        this.life = 100; // Teams start with full life
        
        // Combat coordination (simplified)
        this.isInCombat = false;
        this.combatTarget = null;
        this.combatStartTime = 0;
        this.combatDuration = 3000; // 3 seconds of combat
        
        // Leadership system (simplified)
        this.leader = null; // The blob that leads this team's movement
    }

    /**
     * Add a blob to this team
     * @param {Blob} blob - The blob to add to the team
     */
    addMember(blob) {
        if (!this.members.includes(blob) && this.members.length < this.maxSize) {
            // Clear any existing leader status from the new member
            blob.isTeamLeader = false;
            
            this.members.push(blob);
            blob.team = this;
            
            // TEAM GROWTH BONUS - Teams get stronger when they recruit!
            this.life = Math.min(100, this.life + (config.teamGrowthBonus || 5)); // Use config value
            this.aggression = Math.max(0, this.aggression - 3); // Become more cooperative
            
            // When team grows, convert from individual to group team
            if (this.isIndividual && this.members.length > 1) {
                this.isIndividual = false;
                this.name = `Team-${this.id}`; // Much shorter name
                
                // Generate harmonious colors for team formation
                this.harmonizeTeamColors();
                
                // Select team leader
                this.selectLeader();
            } else if (!this.isIndividual && this.members.length > 1) {
                // Update colors for new member joining existing team
                this.harmonizeTeamColors();
                
                // Reconsider leadership when new member joins
                this.selectLeader();
            } else if (this.isIndividual && this.members.length === 1) {
                // For individual teams, immediately assign leadership
                this.selectLeader();
            }
            
            // Adjust team morale based on new member
            this.updateMorale();
            return true;
        }
        return false;
    }
    
    /**
     * Update all team members to have the same color as the leader
     */
    harmonizeTeamColors() {
        if (this.members.length <= 1 || !window.colorPalette) return;
        
        // Use the leader's color as the base (or first member if no leader yet)
        const baseColor = (this.leader && this.leader.personalColor) || this.members[0].personalColor;
        
        // All team members get the exact same color as the leader
        for (let member of this.members) {
            member.personalColor = baseColor;
        }
        
        // Update team color to leader's color
        this.color = baseColor;
    }

    /**
     * Select the team leader based on highest leadership value
     */
    selectLeader() {
        // FIRST: Clear all isTeamLeader flags to prevent multiple crowns
        for (let member of this.members) {
            member.isTeamLeader = false;
        }
        
        if (this.members.length <= 1) {
            this.leader = this.members[0] || null;
            if (this.leader) {
                this.leader.isTeamLeader = true;
            }
            return;
        }
        
        // Find member with highest leadership
        let bestLeader = this.members[0];
        for (let member of this.members) {
            if (member.leadership > bestLeader.leadership) {
                bestLeader = member;
            }
        }
        
        // Set the new leader
        this.leader = bestLeader;
        this.leader.isTeamLeader = true;
    }

    /**
     * Remove a blob from this team
     * @param {Blob} blob - The blob to remove from the team
     */
    removeMember(blob) {
        const index = this.members.indexOf(blob);
        if (index > -1) {
            this.members.splice(index, 1);
            blob.team = null;
            
            // Losing members reduces team life significantly
            const lifeLoss = Math.min(30, 20 + (this.members.length > 0 ? 10 : 20));
            this.life = Math.max(0, this.life - lifeLoss);
            
            console.log(`💔 ${this.name} lost a member! Life dropped by ${lifeLoss} to ${this.life.toFixed(0)}`);
            
            // Losing members makes teams more aggressive (survival instinct)
            this.aggression = Math.min(100, this.aggression + 10);
            
            // If team becomes individual again
            if (this.members.length === 1) {
                this.isIndividual = true;
                this.name = `Solo-${this.members[0].id}`;
            }
            
            // If team is completely wiped out, set life to 0
            if (this.members.length === 0) {
                this.life = 0;
                console.log(`💀 ${this.name} has been completely wiped out!`);
            }
        }
    }

    /**
     * Simplified team update - adjust aggression and life over time
     */
    updateMorale() {
        // Gradually drift aggression toward team's natural tendency
        const teamSize = this.members.length;
        
        // Large teams become more aggressive, small teams more cooperative
        if (teamSize > 5) {
            this.aggression = Math.min(100, this.aggression + 2);
            // LARGE TEAM PENALTY - Bigger teams lose life faster due to coordination problems
            this.life = Math.max(0, this.life - teamSize * 0.05); // Lose 0.05 life per member per frame
        } else if (teamSize < 3) {
            this.aggression = Math.max(0, this.aggression - 3);
        }
        
        // AGGRESSION DECAY - Teams naturally become less aggressive over time
        if (!this.isInCombat) {
            this.aggression = Math.max(0, this.aggression - (config.aggressionDecayRate || 0.2)); // Use config value
        }
        
        // AGING SYSTEM - Teams gradually lose life over time + SIZE PENALTY
        const teamAge = millis() - this.createdAt;
        const agingRate = teamAge / 300000; // Start aging after 5 minutes
        const sizeAgingMultiplier = 1 + (teamSize > 4 ? (teamSize - 4) * 0.2 : 0); // Large teams age faster
        if (agingRate > 0) {
            this.life = Math.max(0, this.life - agingRate * 0.05 * sizeAgingMultiplier); // Gradual aging
        }
        
        // Life regeneration - teams slowly heal over time if not in combat - BALANCED HEALING
        if (!this.isInCombat && this.life < 100) {
            this.life = Math.min(100, this.life + (config.lifeRegenRate || 0.8)); // Use config value
        }
        
        // Combat fatigue - being in combat drains life - SMALL DRAIN
        if (this.isInCombat) {
            this.life = Math.max(0, this.life - 0.2); // Increased from 0.05 to 0.2
        }
        
        // Random events - MORE FREQUENT FOR TURNOVER
        if (Math.random() < 0.02) { // 2% chance (increased from 1%)
            const event = Math.random();
            if (event < 0.4) { // Increased chance of bad events (was 0.2)
                // Bad event - lose life and become more aggressive - STRONGER
                this.life = Math.max(0, this.life - 12); // Increased from 4 to 12
                this.aggression = Math.min(100, this.aggression + 8); // Increased from 3 to 8
                console.log(`💔 ${this.name} suffered a crisis! Life: ${this.life.toFixed(0)}`);
            } else if (event > 0.8) {
                // Good event - gain life and become less aggressive
                this.life = Math.min(100, this.life + 8); // Same as before
                this.aggression = Math.max(0, this.aggression - 4); // Same as before
                console.log(`✨ ${this.name} had good fortune! Life: ${this.life.toFixed(0)}`);
            }
        }
        
        // Log when teams are dying
        if (this.life <= 10 && this.members.length > 0) {
            console.log(`⚠️ ${this.name} has critically low life: ${this.life.toFixed(0)}`);
        }
    }

    /**
     * Calculate total team combat strength
     * @returns {number} Combined strength of all team members
     */
    getTotalStrength() {
        return this.members.reduce((total, blob) => total + blob.strength, 0);
    }

    /**
     * Get cooperation probability (0-1) - simply 100 minus aggression
     * @returns {number} Probability of cooperating with another team
     */
    getCooperationProbability() {
        return (100 - this.aggression) / 100;
    }

    /**
     * Get aggression level (0-100) for fighting decisions
     * @returns {number} Current aggression level
     */
    getAggressionLevel() {
        return this.aggression;
    }

    /**
     * Merge this team with another team
     * @param {Team} otherTeam - Team to merge with
     * @returns {Team} The resulting merged team
     */
    mergeWith(otherTeam) {
        // Safety checks
        if (!otherTeam || !this.members || !otherTeam.members) {
            console.error('Invalid team merge attempt');
            return this;
        }
        
        // Create new merged team - keep the larger team's color
        const dominantTeam = this.members.length >= otherTeam.members.length ? this : otherTeam;
        const mergedTeam = new Team(`Merged-${Team.nextId}`, dominantTeam.color); // Shorter name
        mergedTeam.morale = (this.morale + otherTeam.morale) / 2;
        mergedTeam.aggression = (this.aggression + otherTeam.aggression) / 2;
        mergedTeam.maxSize = Math.min(12, this.maxSize + Math.floor(otherTeam.maxSize / 2));
        
        // CRITICAL: Just reassign team membership, don't create new blobs
        // Move all members to new team (this only changes team reference, not global blob count)
        const allMembers = [...this.members, ...otherTeam.members];
        
        allMembers.forEach(blob => {
            if (blob && mergedTeam.members.length < mergedTeam.maxSize) {
                // Remove from old team first
                if (blob.team === this) {
                    const index = this.members.indexOf(blob);
                    if (index > -1) this.members.splice(index, 1);
                } else if (blob.team === otherTeam) {
                    const index = otherTeam.members.indexOf(blob);
                    if (index > -1) otherTeam.members.splice(index, 1);
                }
                
                // Add to new team
                mergedTeam.members.push(blob);
                blob.team = mergedTeam;
            }
        });
        
        // Harmonize colors for the new team
        if (mergedTeam.harmonizeTeamColors) {
            mergedTeam.harmonizeTeamColors();
        }
        if (mergedTeam.selectLeader) {
            mergedTeam.selectLeader();
        }
        
        return mergedTeam;
    }

    /**
     * Check if team should rebel or split due to low morale or large size
     * @returns {Team|null} New splinter team if rebellion occurs
     */
    /**
     * Check if team should rebel or split based on aggression
     * @returns {Team|null} New splinter team if rebellion occurs
     */
    checkForRebellion() {
        // Safety checks
        if (!this.members || this.members.length <= 3) {
            return null;
        }
        
        try {
            // High aggression teams split more often (internal conflict)
            const rebellionChance = (this.aggression / 100) * 0.002; // Max 0.2% chance per frame
            
            if (Math.random() < rebellionChance) {
                // Split team - some members leave to form new team
                const splitSize = Math.floor(this.members.length / 2);
                const rebelMembers = this.members.splice(-splitSize);
                
                if (rebelMembers.length > 0) {
                    // Rebels get a different aggression level (more extreme)
                    const rebelAggression = Math.min(100, this.aggression + 20);
                    const rebelTeam = new Team(`Rebel-${Team.nextId}`, color(
                        red(this.color) * 0.7,
                        green(this.color) * 0.7,
                        blue(this.color) * 0.7
                    ));
                    rebelTeam.aggression = rebelAggression;
                    
                    // Reassign team membership
                    rebelMembers.forEach(blob => {
                        if (blob) {
                            rebelTeam.members.push(blob);
                            blob.team = rebelTeam;
                        }
                    });
                    
                    // Update team properties
                    if (rebelTeam.harmonizeTeamColors) {
                        rebelTeam.harmonizeTeamColors();
                    }
                    if (rebelTeam.selectLeader) {
                        rebelTeam.selectLeader();
                    }
                    
                    // Original team becomes less aggressive after losing troublemakers
                    this.aggression = Math.max(0, this.aggression - 15);
                    
                    return rebelTeam;
                }
            }
        } catch (error) {
            console.error('Error in rebellion check:', error);
        }
        
        return null;
    }

    /**
     * Start coordinated combat against another team
     * @param {Team} enemyTeam - The team to attack
     */
    startCombat(enemyTeam) {
        if (this.isInCombat || this.isIndividual || this.members.length < 2) {
            return false;
        }

        this.isInCombat = true;
        this.combatTarget = enemyTeam;
        this.combatStartTime = millis();
        
        // Set rally point between the two teams
        const myCenter = this.getCenterPosition();
        const enemyCenter = enemyTeam.getCenterPosition();
        
        if (myCenter && enemyCenter) {
            this.rallyPoint = createVector(
                (myCenter.x + enemyCenter.x) / 2,
                (myCenter.y + enemyCenter.y) / 2
            );
        }
        
        // Boost team morale for combat
        this.morale = Math.min(100, this.morale + 15);
        
        console.log(`${this.name} (${this.members.length}) declares war on ${enemyTeam.name} (${enemyTeam.members.length})`);
        return true;
    }

    /**
     * End combat coordination
     */
    endCombat() {
        this.isInCombat = false;
        this.combatTarget = null;
        this.rallyPoint = null;
        
        // Combat fatigue
        this.morale = Math.max(0, this.morale - 5);
    }

    /**
     * Update combat state
     */
    updateCombat() {
        if (this.isInCombat) {
            const combatElapsed = millis() - this.combatStartTime;
            
            // End combat after duration or if target is gone
            if (combatElapsed > this.combatDuration || 
                !this.combatTarget || 
                this.combatTarget.members.length === 0) {
                this.endCombat();
            }
        }
    }

    /**
     * Get center position of all team members
     * @returns {p5.Vector|null} Center position or null if no members
     */
    getCenterPosition() {
        if (this.members.length === 0) return null;
        
        const sum = createVector(0, 0);
        this.members.forEach(member => sum.add(member.position));
        sum.div(this.members.length);
        return sum;
    }

    /**
     * Get combat rally point for team coordination
     * @returns {p5.Vector|null} Rally point or null if not in combat
     */
    getCombatRallyPoint() {
        return this.isInCombat ? this.rallyPoint : null;
    }

    /**
     * Check if this team should attack another team
     * @param {Team} otherTeam - Potential enemy team
     * @returns {boolean} True if should attack
     */
    shouldAttack(otherTeam) {
        if (this.isIndividual || this.members.length < 2) return false;
        if (otherTeam.isIndividual || otherTeam.members.length < 2) return false;
        
        // More aggressive teams attack more often
        const aggressionFactor = this.getAggressionLevel() / 100;
        
        // Size advantage makes teams more likely to attack
        const sizeFactor = this.members.length / (otherTeam.members.length + 1);
        
        // Teams with full or near-full capacity are more aggressive
        const capacityFactor = this.members.length / this.maxSize;
        
        const attackProbability = aggressionFactor * 0.4 + 
                                 Math.min(1, sizeFactor) * 0.4 + 
                                 capacityFactor * 0.2;
        
        return Math.random() < attackProbability * 0.3; // Base 30% chance when conditions are met
    }

    /**
     * Get the average leadership of all team members
     * @returns {number} Average leadership value
     */
    getAverageLeadership() {
        if (this.members.length === 0) return 0;
        const total = this.members.reduce((sum, blob) => sum + blob.leadership, 0);
        return total / this.members.length;
    }

    /**
     * Get the average strength of all team members
     * @returns {number} Average strength value
     */
    getAverageStrength() {
        if (this.members.length === 0) return 0;
        const total = this.members.reduce((sum, blob) => sum + blob.strength, 0);
        return total / this.members.length;
    }

    /**
     * Get the strongest member of the team
     * @returns {Blob|null} The blob with highest strength, or null if no members
     */
    getStrongestMember() {
        if (this.members.length === 0) return null;
        return this.members.reduce((strongest, blob) => 
            blob.strength > strongest.strength ? blob : strongest
        );
    }

    /**
     * Get the leader of the team (highest leadership)
     * @returns {Blob|null} The blob with highest leadership, or null if no members
     */
    getLeader() {
        if (this.members.length === 0) return null;
        return this.members.reduce((leader, blob) => 
            blob.leadership > leader.leadership ? blob : leader
        );
    }

    /**
     * Update all team members
     */
    update() {
        this.members.forEach(blob => blob.update());
    }

    /**
     * Render all team members
     */
    render() {
        this.members.forEach(blob => blob.render());
    }

    /**
     * Get team statistics (simplified)
     * @returns {object} Object containing team statistics
     */
    getStats() {
        return {
            name: this.name,
            memberCount: this.members.length,
            maxSize: this.maxSize,
            aggression: this.aggression,
            cooperation: 100 - this.aggression,
            life: this.life,
            totalStrength: this.getTotalStrength(),
            leader: this.getLeader()?.id || null,
            isIndividual: this.isIndividual
        };
    }
}

// Static property for generating unique team IDs
Team.nextId = 1;