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
        
        // Team dynamics
        this.morale = 100; // Team cohesion (affects cooperation probability)
        this.aggression = Math.random() * 50 + 25; // 25-75 base aggression
        this.maxSize = Math.floor(Math.random() * 8) + 5; // 5-12 max members to prevent domination
        
        // Combat coordination
        this.isInCombat = false;
        this.combatTarget = null; // Enemy team being attacked
        this.combatStartTime = 0;
        this.combatDuration = 5000; // 5 seconds of coordinated combat
        this.rallyPoint = null; // Where team gathers for attack
        
        // Leadership system
        this.leader = null; // The blob that leads this team's movement
    }

    /**
     * Add a blob to this team
     * @param {Blob} blob - The blob to add to the team
     */
    addMember(blob) {
        if (!this.members.includes(blob) && this.members.length < this.maxSize) {
            this.members.push(blob);
            blob.team = this;
            
            // When team grows, convert from individual to group team
            if (this.isIndividual && this.members.length > 1) {
                this.isIndividual = false;
                this.name = `Team-${this.id}`;
                
                // Generate harmonious colors for team formation
                this.harmonizeTeamColors();
                
                // Select team leader
                this.selectLeader();
            } else if (!this.isIndividual && this.members.length > 1) {
                // Update colors for new member joining existing team
                this.harmonizeTeamColors();
                
                // Reconsider leadership when new member joins
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
        if (this.members.length <= 1) {
            this.leader = this.members[0] || null;
            return;
        }
        
        // Find member with highest leadership
        let bestLeader = this.members[0];
        for (let member of this.members) {
            if (member.leadership > bestLeader.leadership) {
                bestLeader = member;
            }
        }
        
        // If leader changed, notify old and new leader
        if (this.leader !== bestLeader) {
            if (this.leader) {
                this.leader.isTeamLeader = false;
            }
            this.leader = bestLeader;
            this.leader.isTeamLeader = true;
        }
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
            
            // Severe morale penalty when losing a member (death/absorption)
            const moralePenalty = Math.min(25, 15 + (this.members.length > 0 ? 100 / this.members.length : 10));
            this.morale = Math.max(0, this.morale - moralePenalty);
            
            console.log(`💔 ${this.name} lost a member! Morale dropped by ${moralePenalty.toFixed(0)} to ${this.morale.toFixed(0)}`);
            
            // If team becomes individual again
            if (this.members.length === 1) {
                this.isIndividual = true;
                this.name = `Blob-${this.members[0].id}`;
            }
            
            // If team is completely wiped out, set morale to 0
            if (this.members.length === 0) {
                this.morale = 0;
                console.log(`💀 ${this.name} has been completely wiped out!`);
            }
        }
    }

    /**
     * Update team morale based on current state
     */
    updateMorale() {
        const avgLeadership = this.getAverageLeadership();
        const teamSize = this.members.length;
        
        // Morale affected by leadership and team size
        let moraleChange = 0;
        if (avgLeadership > 70) moraleChange += 5;
        if (avgLeadership < 30) moraleChange -= 8; // Increased penalty for poor leadership
        if (teamSize > 5) moraleChange -= 4; // Increased penalty for large teams (internal conflicts)
        if (teamSize < 3) moraleChange += 3; // Small teams are more cohesive
        
        // Combat fatigue reduces morale over time
        if (this.isInCombat) {
            moraleChange -= 3; // Combat stress
        }
        
        // Random events that can affect morale
        if (Math.random() < 0.1) { // 10% chance of random event
            const randomEvent = Math.random();
            if (randomEvent < 0.3) {
                moraleChange -= 15; // Bad event (disease, resource shortage, etc.)
                console.log(`💔 ${this.name} suffered a morale crisis!`);
            } else if (randomEvent > 0.8) {
                moraleChange += 10; // Good event (victory, discovery, etc.)
                console.log(`✨ ${this.name} received a morale boost!`);
            }
        }
        
        // Teams that are too close to maximum capacity get stressed
        if (this.members.length >= this.maxSize * 0.9) {
            moraleChange -= 2; // Overcrowding stress
        }
        
        this.morale = Math.max(0, Math.min(100, this.morale + moraleChange));
        
        // Log when teams are in danger
        if (this.morale <= 10 && this.members.length > 0) {
            console.log(`⚠️ ${this.name} has critically low morale: ${this.morale.toFixed(0)}`);
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
     * Get cooperation probability (0-1) based on team state
     * @returns {number} Probability of cooperating with another team
     */
    getCooperationProbability() {
        const leadership = this.getAverageLeadership();
        const sizeFactor = Math.max(0, 1 - (this.members.length / this.maxSize));
        const moraleFactor = this.morale / 100;
        
        // High leadership, small size, and high morale increase cooperation
        return Math.min(0.8, (leadership / 100) * 0.4 + sizeFactor * 0.3 + moraleFactor * 0.3);
    }

    /**
     * Get aggression level (0-100) for fighting decisions
     * @returns {number} Current aggression level
     */
    getAggressionLevel() {
        const sizeFactor = this.members.length / this.maxSize;
        const strengthFactor = this.getAverageStrength() / 100;
        
        // Larger, stronger teams are more aggressive
        return Math.min(100, this.aggression + sizeFactor * 20 + strengthFactor * 15);
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
        const mergedTeam = new Team(`${this.name}+${otherTeam.name}`, dominantTeam.color);
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
    checkForRebellion() {
        // Safety checks
        if (!this.members || this.members.length <= 3) {
            return null;
        }
        
        try {
            // Rebellion more likely with low morale, large size, or low leadership
            const rebellionChance = (100 - this.morale) / 100 * 0.3 + 
                                   (this.members.length / this.maxSize) * 0.4 +
                                   (100 - this.getAverageLeadership()) / 100 * 0.3;
            
            if (Math.random() < rebellionChance * 0.003) { // Reduced from 0.01 to 0.003
                // Split team - some members leave to form new team
                const splitSize = Math.floor(this.members.length / 2);
                const rebelMembers = this.members.splice(-splitSize);
                
                if (rebelMembers.length > 0) {
                    // Rebels get a darker version of the original team color
                    const rebelTeam = new Team(`Rebel-${Team.nextId}`, color(
                        red(this.color) * 0.6,
                        green(this.color) * 0.6,
                        blue(this.color) * 0.6
                    ));
                    
                    // CRITICAL: Just reassign team membership, don't use addMember
                    // This prevents any potential blob duplication
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
                    
                    this.morale = Math.min(100, this.morale + 20); // Remaining team recovers
                    
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
     * Get team statistics
     * @returns {object} Object containing team statistics
     */
    getStats() {
        return {
            name: this.name,
            memberCount: this.members.length,
            maxSize: this.maxSize,
            averageLeadership: this.getAverageLeadership(),
            averageStrength: this.getAverageStrength(),
            totalStrength: this.getTotalStrength(),
            morale: this.morale,
            aggression: this.getAggressionLevel(),
            cooperation: this.getCooperationProbability(),
            leader: this.getLeader()?.id || null,
            strongestMember: this.getStrongestMember()?.id || null,
            isIndividual: this.isIndividual
        };
    }
}

// Static property for generating unique team IDs
Team.nextId = 1;