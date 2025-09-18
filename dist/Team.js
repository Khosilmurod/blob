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
        this.aggression = Math.random() * 40 + 10; // 10-50% aggression range
        this.maxSize = Math.floor(Math.random() * 9) + 6; // 6-14 members max
        
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
            this.life = Math.min(100, this.life + 5);
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
        if (this.members.length <= 1) return;
        
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
            this.aggression = Math.max(0, this.aggression - 0.2);
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
            this.life = Math.min(100, this.life + 0.8);
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
}

// Static property for generating unique team IDs
Team.nextId = 1;