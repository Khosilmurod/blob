/**
 * Blob class represents an individual entity with movement, leadership, and strength
 */
class Blob {
    constructor(x, y, team = null) {
        this.id = Blob.nextId++;
        this.position = createVector(x, y);
        this.velocity = createVector(0, 0);
        this.acceleration = createVector(0, 0);
        
        // Core properties (1-100)
        this.leadership = Math.floor(Math.random() * 100) + 1;
        this.strength = Math.floor(Math.random() * 100) + 1;
        
        // Movement properties
        this.maxSpeed = map(this.strength, 1, 100, 0.5, 3);
        this.maxForce = map(this.leadership, 1, 100, 0.02, 0.1);
        this.size = map(this.strength, 1, 100, 8, 20);
        
        // Target and navigation
        this.target = this.getRandomTarget();
        this.targetRadius = 20; // How close to get to target before selecting new one
        this.wanderAngle = 0;
        
        // Generate individual artistic color for this blob
        this.personalColor = this.generateRandomColor();
        
        // Create individual team if none provided
        if (!team) {
            team = new Team(`Blob-${this.id}`, this.personalColor, true);
        }
        this.team = team;
        team.addMember(this);
        
        // Ensure individual blobs immediately get leadership (fix crown delay)
        if (team.isIndividual && team.members.length === 1) {
            this.isTeamLeader = true;
            team.leader = this;
        }
        
        // Interaction properties
        this.interactionRadius = this.size + 15; // How close to be for interactions
        this.lastInteraction = millis() - 3000; // Set to past time to avoid initial cooldown
        this.interactionCooldown = 2000; // 2 seconds between interactions
        this.isInCombat = false;
        this.combatTarget = null;
        
        // Leadership properties
        this.isTeamLeader = false; // Will be set by team when selected as leader
        
        // Visual properties
        this.alpha = 255;
        this.strokeWeight = 2;
        this.showDebug = false;
        this.showDirections = false;
        this.showTeamCircles = false;
        
        // Timing for target changes
        this.lastTargetChange = millis();
        this.targetChangeInterval = random(3000, 8000); // 3-8 seconds
    }

    /**
     * Generate a unique high-contrast color for this blob
     * @returns {p5.Color} High-contrast color
     */
    generateRandomColor() {
        // Use the global color palette to generate a unique, high-contrast color
        if (window.colorPalette) {
            return window.colorPalette.generateUniqueColor();
        } else {
            // Fallback to high-contrast colors if palette not ready
            const contrastColors = [
                color(0, 100, 255),     // Electric Blue
                color(50, 255, 50),     // Neon Green
                color(255, 20, 20),     // Bright Red
                color(255, 255, 255),   // Pure White
                color(255, 0, 255),     // Magenta
                color(0, 255, 255),     // Cyan
                color(255, 165, 0),     // Orange
                color(128, 0, 255)      // Purple
            ];
            return random(contrastColors);
        }
    }

    /**
     * Generate a random target point within canvas bounds
     * @returns {p5.Vector} Random target position
     */
    getRandomTarget() {
        const margin = 50;
        return createVector(
            random(margin, windowWidth - margin),
            random(margin, windowHeight - margin)
        );
    }

    /**
     * Get follow offset position relative to leader for formation
     * @returns {p5.Vector} Offset vector from leader position
     */
    getFollowOffset() {
        if (!this.team || !this.team.leader) return createVector(0, 0);
        
        const teamSize = this.team.members.length;
        const myIndex = this.team.members.indexOf(this);
        
        // Create formation offset based on team position
        if (teamSize <= 3) {
            // Small teams: line formation behind leader
            const angle = (myIndex * TWO_PI) / teamSize + PI; // Behind leader
            const radius = 25;
            return createVector(cos(angle) * radius, sin(angle) * radius);
        } else if (teamSize <= 6) {
            // Medium teams: circle around leader
            const angle = (myIndex * TWO_PI) / teamSize;
            const radius = 30;
            return createVector(cos(angle) * radius, sin(angle) * radius);
        } else {
            // Large teams: double circle around leader
            const innerCircle = myIndex < teamSize / 2;
            const circleIndex = innerCircle ? myIndex : myIndex - Math.floor(teamSize / 2);
            const circleSize = innerCircle ? Math.floor(teamSize / 2) : Math.ceil(teamSize / 2);
            const radius = innerCircle ? 25 : 45;
            
            const angle = (circleIndex * TWO_PI) / circleSize;
            return createVector(cos(angle) * radius, sin(angle) * radius);
        }
    }

    /**
     * Calculate steering force towards target
     * @param {p5.Vector} target - Target position
     * @returns {p5.Vector} Steering force
     */
    seek(target) {
        const desired = p5.Vector.sub(target, this.position);
        desired.normalize();
        desired.mult(this.maxSpeed);
        
        const steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxForce);
        return steer;
    }

    /**
     * Apply wandering behavior for more natural movement
     * @returns {p5.Vector} Wander force
     */
    wander() {
        const wanderRadius = 25;
        const wanderDistance = 80;
        const change = 0.3;
        
        this.wanderAngle += random(-change, change);
        
        const circlePos = this.velocity.copy();
        circlePos.normalize();
        circlePos.mult(wanderDistance);
        circlePos.add(this.position);
        
        const wanderPos = createVector(
            wanderRadius * cos(this.wanderAngle),
            wanderRadius * sin(this.wanderAngle)
        );
        wanderPos.add(circlePos);
        
        return this.seek(wanderPos);
    }

    /**
     * Apply separation force to avoid crowding
     * @param {Array} blobs - Array of other blobs
     * @returns {p5.Vector} Separation force
     */
    separate(blobs) {
        const steer = createVector(0, 0);
        let count = 0;

        for (let other of blobs) {
            if (other === this) continue;
            
            const distance = p5.Vector.dist(this.position, other.position);
            const minSafeDistance = (this.size + other.size) / 2 + 5; // Minimum safe distance
            
            if (distance < minSafeDistance) {
                // EMERGENCY SEPARATION - very strong force when too close
                const diff = p5.Vector.sub(this.position, other.position);
                if (diff.mag() === 0) {
                    // If exactly on top, create random direction
                    diff.set(random(-1, 1), random(-1, 1));
                }
                diff.normalize();
                
                // Inverse distance weighting - closer = stronger force
                const separationStrength = map(distance, 0, minSafeDistance, 5.0, 1.0);
                diff.mult(separationStrength);
                
                steer.add(diff);
                count++;
            } else if (distance < minSafeDistance * 2) {
                // Regular separation for nearby blobs
                const diff = p5.Vector.sub(this.position, other.position);
                diff.normalize();
                diff.mult(0.5); // Moderate force
                steer.add(diff);
                count++;
            }
        }

        if (count > 0) {
            steer.div(count);
            steer.limit(this.maxForce * 3); // Allow very strong separation forces
        }

        return steer;
    }

    /**
     * Apply hard collision resolution - physically prevents overlap
     * @param {Array} blobs - Array of other blobs
     */
    resolveCollisions(blobs) {
        for (let other of blobs) {
            if (other === this) continue;
            
            const distance = p5.Vector.dist(this.position, other.position);
            const minDistance = (this.size + other.size) / 2 + 2; // Absolute minimum distance
            
            if (distance < minDistance) {
                // Calculate overlap amount
                const overlap = minDistance - distance;
                
                // Calculate separation vector
                let separation = p5.Vector.sub(this.position, other.position);
                
                // Handle exact overlap (same position)
                if (separation.mag() === 0) {
                    separation.set(random(-1, 1), random(-1, 1));
                }
                
                separation.normalize();
                
                // Move both blobs apart by half the overlap each
                const moveDistance = overlap / 2 + 1; // +1 for extra safety margin
                
                const moveVector = p5.Vector.mult(separation, moveDistance);
                this.position.add(moveVector);
                
                const moveVectorOther = p5.Vector.mult(separation, -moveDistance);
                other.position.add(moveVectorOther);
                
                // Add some velocity to prevent immediate re-collision
                this.velocity.add(p5.Vector.mult(separation, 0.5));
                other.velocity.add(p5.Vector.mult(separation, -0.5));
            }
        }
    }

    /**
     * Check for interactions with other blobs
     * @param {Array} allBlobs - Array of all blobs
     */
    checkInteractions(allBlobs) {
        if (millis() - this.lastInteraction < this.interactionCooldown) {
            return; // Still in cooldown
        }

        for (let other of allBlobs) {
            if (other === this || other.team === this.team) continue;
            
            const distance = p5.Vector.dist(this.position, other.position);
            
            if (distance < this.interactionRadius + other.interactionRadius) {
                this.handleInteraction(other);
                break; // Only one interaction per frame
            }
        }
    }

    /**
     * Handle interaction between this blob and another
     * @param {Blob} other - The other blob to interact with
     */
    handleInteraction(other) {
        // Check if both blobs can interact
        if (millis() - other.lastInteraction < other.interactionCooldown) {
            return;
        }

        this.lastInteraction = millis();
        other.lastInteraction = millis();

        // Special case: Two large teams meeting
        const bothLargeTeams = !this.team.isIndividual && !other.team.isIndividual &&
                              this.team.members.length >= 3 && other.team.members.length >= 3;

        if (bothLargeTeams) {
            // Large teams are more likely to fight than cooperate
            const myAttackChance = this.team.shouldAttack(other.team);
            const otherAttackChance = other.team.shouldAttack(this.team);
            
            if (myAttackChance || otherAttackChance) {
                // Initiate team combat
                this.initiateTeamCombat(other);
                return;
            }
        }

        // Regular individual interaction logic - EASIER COOPERATION
        const myCoopProb = this.team.getCooperationProbability();
        const otherCoopProb = other.team.getCooperationProbability();
        
        const myWantsToCoop = Math.random() < myCoopProb;
        const otherWantsToCoop = Math.random() < otherCoopProb;

        // Make cooperation more likely - if either wants to cooperate AND the other isn't very aggressive
        const canCooperate = (myWantsToCoop && other.team.aggression < 70) || 
                           (otherWantsToCoop && this.team.aggression < 70) ||
                           (myWantsToCoop && otherWantsToCoop);

        if (canCooperate) {
            // Cooperate - merge teams
            this.cooperate(other);
        } else {
            // Fight
            this.fight(other);
        }
    }

    /**
     * Initiate coordinated team combat
     * @param {Blob} enemyBlob - Representative of enemy team
     */
    initiateTeamCombat(enemyBlob) {
        const myTeam = this.team;
        const enemyTeam = enemyBlob.team;
        
        // Both teams start combat coordination
        const myTeamStarted = myTeam.startCombat(enemyTeam);
        const enemyTeamStarted = enemyTeam.startCombat(myTeam);
        
        if (myTeamStarted || enemyTeamStarted) {
            // Set all team members to combat mode
            myTeam.members.forEach(blob => {
                blob.isInCombat = true;
                blob.combatTarget = enemyTeam;
            });
            
            enemyTeam.members.forEach(blob => {
                blob.isInCombat = true;
                blob.combatTarget = myTeam;
            });
        }
    }

    /**
     * Cooperate with another blob (merge teams)
     * @param {Blob} other - The other blob
     */
    cooperate(other) {
        // Check if teams can merge (size limits) - EASIER TEAM FORMATION
        const combinedSize = this.team.members.length + other.team.members.length;
        const maxAllowed = Math.max(this.team.maxSize, other.team.maxSize);

        if (combinedSize <= maxAllowed || (this.team.isIndividual || other.team.isIndividual)) {
            // Successful cooperation (easier for individual blobs to join teams)
            const newTeam = this.team.mergeWith(other.team);
            
            // Update global teams array
            const teamIndex1 = teams.indexOf(this.team);
            const teamIndex2 = teams.indexOf(other.team);
            
            if (teamIndex1 > -1) teams.splice(teamIndex1, 1);
            if (teamIndex2 > -1) {
                const adjustedIndex = teamIndex2 > teamIndex1 ? teamIndex2 - 1 : teamIndex2;
                teams.splice(adjustedIndex, 1);
            }
            
            teams.push(newTeam);
            
            console.log(`Cooperation: ${this.team.name} + ${other.team.name} = ${newTeam.name}`);
        } else {
            // Teams too large to merge - become allies but stay separate
            this.team.morale = Math.min(100, this.team.morale + 5);
            other.team.morale = Math.min(100, other.team.morale + 5);
        }
    }

    /**
     * Fight with another blob
     * @param {Blob} other - The other blob to fight
     */
    fight(other) {
        const myTeamStrength = this.team.getTotalStrength();
        const otherTeamStrength = other.team.getTotalStrength();
        
        // Add some randomness to prevent deterministic outcomes
        const myRoll = myTeamStrength * (0.8 + Math.random() * 0.4); // 80-120% of strength
        const otherRoll = otherTeamStrength * (0.8 + Math.random() * 0.4);
        
        let winner, loser;
        if (myRoll > otherRoll) {
            winner = this;
            loser = other;
        } else {
            winner = other;
            loser = this;
        }

        // Combat effects
        this.applyCombatEffects(winner, loser);
        
        console.log(`Combat: ${winner.team.name} defeats ${loser.team.name}`);
    }

    /**
     * Apply effects of combat
     * @param {Blob} winner - The winning blob
     * @param {Blob} loser - The losing blob
     */
    applyCombatEffects(winner, loser) {
        // STRENGTH-BASED DAMAGE SYSTEM
        const winnerStrength = winner.strength;
        const loserStrength = loser.strength;
        
        // Calculate damage based on strength difference - MEANINGFUL COMBAT
        const strengthDifference = Math.abs(winnerStrength - loserStrength);
        const baseDamage = config.baseDamage || 8; // Use config value
        const strengthDamage = Math.floor(strengthDifference / 5); // 1 damage per 5 strength difference (was 8) - MORE INTENSE
        
        const damageToLoser = baseDamage + strengthDamage + Math.floor(Math.random() * 10); // More random damage (was 6) - MORE INTENSE
        
        // TEAM SIZE PROTECTION - MINIMAL + LARGE TEAM PENALTY
        const loserTeamSize = loser.team.members.length;
        let teamProtection = Math.max(0, loserTeamSize - 1) * (config.teamSizeProtection || 0.05); // Use config value
        
        // LARGE TEAM PENALTY - Teams over 6 members take EXTRA damage!
        if (loserTeamSize > 6) {
            const largePenalty = (loserTeamSize - 6) * (config.largePenaltyRate || 0.15); // Use config value
            teamProtection = teamProtection - largePenalty; // Negative protection = more damage
        }
        
        const finalDamageToLoser = Math.max(2, Math.floor(damageToLoser * (1 - teamProtection))); // Can be much higher than base damage!
        
        const lifeGainToWinner = Math.floor(finalDamageToLoser * (config.winnerLifeGain || 0.4)); // Use config value
        
        // Apply life changes - Winner gains, loser loses
        winner.team.life = Math.min(100, winner.team.life + lifeGainToWinner); // Winner gains life!
        loser.team.life = Math.max(0, loser.team.life - finalDamageToLoser);
        
        console.log(`💥 Combat: ${winner.team.name} (${winnerStrength} str) vs ${loser.team.name} (${loserStrength} str)`);
        console.log(`   Result: Winner +${lifeGainToWinner} life, Loser -${finalDamageToLoser} life (${loserTeamSize} members = ${Math.floor(teamProtection*100)}% modifier)`);
        console.log(`   Result: ${winner.team.name} life: ${winner.team.life.toFixed(0)}, ${loser.team.name} life: ${loser.team.life.toFixed(0)}`);
        
        // Check if any team died from this combat
        if (winner.team.life <= 0) {
            console.log(`💀 ${winner.team.name} died from combat damage!`);
        }
        if (loser.team.life <= 0) {
            console.log(`💀 ${loser.team.name} died from combat damage!`);
        }
        
        // Winner becomes more aggressive, loser becomes desperate - INCREASED AGGRESSION
        winner.team.aggression = Math.min(100, winner.team.aggression + (config.aggressionWinnerIncrease || 4)); // Use config value
        loser.team.aggression = Math.min(100, loser.team.aggression + (config.aggressionLoserIncrease || 10)); // Use config value
        
        // SIMPLIFIED ABSORPTION: Based on aggression levels - BALANCED
        const canAbsorb = winner.team.members.length < winner.team.maxSize;
        const shouldAbsorb = winner.team.aggression > 65 && loser.team.aggression < 35 && Math.random() < 0.08; // Reduced from 15% to 8%
        
        if (canAbsorb && shouldAbsorb) {
            // Absorb the losing blob - move to winner's team (DON'T remove from global array)
            console.log(`ABSORPTION: ${loser.team.name} blob absorbed by ${winner.team.name}`);
            loser.team.removeMember(loser);
            winner.team.addMember(loser);
            
            // Clean up empty teams
            if (loser.team.members.length === 0) {
                const teamIndex = teams.indexOf(loser.team);
                if (teamIndex > -1) teams.splice(teamIndex, 1);
                console.log(`Team ${loser.team.name} eliminated`);
            }
        } else {
            // Push loser away (represents defeat without absorption)
            const pushForce = p5.Vector.sub(loser.position, winner.position);
            pushForce.normalize();
            pushForce.mult(5);
            loser.velocity.add(pushForce);
        }
    }

    /**
     * Apply cohesion force to stay with team members
     * @returns {p5.Vector} Cohesion force
     */
    cohesion() {
        if (!this.team || this.team.members.length <= 1) {
            return createVector(0, 0);
        }

        const neighborDistance = 80; // Tighter cohesion for better team formation
        const sum = createVector(0, 0);
        let count = 0;

        for (let other of this.team.members) {
            const distance = p5.Vector.dist(this.position, other.position);
            if (distance > 0 && distance < neighborDistance) {
                sum.add(other.position);
                count++;
            }
        }

        if (count > 0) {
            sum.div(count);
            return this.seek(sum);
        }

        return createVector(0, 0);
    }

    /**
     * Apply attachment force to maintain formation with team members
     * @returns {p5.Vector} Attachment force
     */
    attachment() {
        if (!this.team || this.team.members.length <= 1) {
            return createVector(0, 0);
        }

        const attachmentForce = createVector(0, 0);
        const idealDistance = (this.size + 15) * 1.2; // Closer ideal distance for tighter teams
        let connectionCount = 0;
        const maxConnections = Math.min(3, this.team.members.length - 1); // Allow more connections

        // Sort team members by distance to find closest ones
        const sortedMembers = this.team.members
            .filter(member => member !== this)
            .sort((a, b) => {
                const distA = p5.Vector.dist(this.position, a.position);
                const distB = p5.Vector.dist(this.position, b.position);
                return distA - distB;
            });

        // Only attach to closest team members to prevent clustering
        for (let i = 0; i < Math.min(maxConnections, sortedMembers.length); i++) {
            const other = sortedMembers[i];
            const distance = p5.Vector.dist(this.position, other.position);
            const minSafeDistance = (this.size + other.size) / 2 + 10; // Safe distance
            
            if (distance > minSafeDistance && distance < idealDistance * 1.5) {
                // Only pull closer if we're at safe distance and not too far
                if (distance > idealDistance) {
                    const direction = p5.Vector.sub(other.position, this.position);
                    direction.normalize();
                    direction.mult((distance - idealDistance) * 0.05); // Very gentle pull
                    attachmentForce.add(direction);
                    connectionCount++;
                }
            }
        }

        if (connectionCount > 0) {
            attachmentForce.div(connectionCount);
            attachmentForce.limit(this.maxForce * 0.2); // Very gentle force
        }

        return attachmentForce;
    }

    /**
     * Apply formation force - creates organized team shapes
     * @returns {p5.Vector} Formation force
     */
    formation() {
        if (!this.team || this.team.members.length <= 1) {
            return createVector(0, 0);
        }

        const teamCenter = this.team.getCenterPosition();
        if (!teamCenter) return createVector(0, 0);

        const teamSize = this.team.members.length;
        const myIndex = this.team.members.indexOf(this);
        
        // Calculate desired position in formation
        let desiredPosition;
        
        if (teamSize <= 3) {
            // Small teams: tight line formation
            const angle = (myIndex * TWO_PI) / teamSize;
            const radius = 20; // Tighter formation
            desiredPosition = createVector(
                teamCenter.x + cos(angle) * radius,
                teamCenter.y + sin(angle) * radius
            );
        } else if (teamSize <= 6) {
            // Medium teams: compact circle formation
            const angle = (myIndex * TWO_PI) / teamSize;
            const radius = 28; // Tighter formation
            desiredPosition = createVector(
                teamCenter.x + cos(angle) * radius,
                teamCenter.y + sin(angle) * radius
            );
        } else {
            // Large teams: compact double circle formation
            const innerCircle = myIndex < teamSize / 2;
            const circleIndex = innerCircle ? myIndex : myIndex - Math.floor(teamSize / 2);
            const circleSize = innerCircle ? Math.floor(teamSize / 2) : Math.ceil(teamSize / 2);
            const radius = innerCircle ? 20 : 40; // Tighter formation
            
            const angle = (circleIndex * TWO_PI) / circleSize;
            desiredPosition = createVector(
                teamCenter.x + cos(angle) * radius,
                teamCenter.y + sin(angle) * radius
            );
        }

        // Seek towards desired formation position
        const formationForce = this.seek(desiredPosition);
        formationForce.mult(0.3); // Gentle formation force
        
        return formationForce;
    }

    /**
     * Combat movement - seek enemy team or rally point
     * @returns {p5.Vector} Combat force
     */
    combatMovement() {
        if (!this.isInCombat || !this.combatTarget) {
            return createVector(0, 0);
        }

        // First, check if team has a rally point
        const rallyPoint = this.team.getCombatRallyPoint();
        if (rallyPoint) {
            const distanceToRally = p5.Vector.dist(this.position, rallyPoint);
            if (distanceToRally > 30) {
                // Move to rally point first
                return this.seek(rallyPoint);
            }
        }

        // Then seek nearest enemy
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        this.combatTarget.members.forEach(enemy => {
            const distance = p5.Vector.dist(this.position, enemy.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        });

        if (nearestEnemy) {
            return this.seek(nearestEnemy.position);
        }

        return createVector(0, 0);
    }

    /**
     * Update blob position and behavior
     * @param {Array} allBlobs - Array of all blobs for separation and interactions
     */
    update(allBlobs = []) {
        // FIRST: Resolve any hard collisions/overlaps
        this.resolveCollisions(allBlobs);
        
        // Check for interactions with other blobs
        this.checkInteractions(allBlobs);

        // Update combat state
        if (this.isInCombat && this.combatTarget && this.combatTarget.members.length === 0) {
            this.isInCombat = false;
            this.combatTarget = null;
        }

        // Calculate forces based on current state
        let seekForce, wanderForce, separateForce, cohesionForce, combatForce, attachmentForce, formationForce;

        if (this.isInCombat) {
            // In combat mode - prioritize combat movement
            combatForce = this.combatMovement();
            formationForce = this.formation(); // Use formation instead of cohesion in combat
            attachmentForce = this.attachment();
            separateForce = this.separate(allBlobs);
            
            // Reduced wandering and seeking during combat
            seekForce = createVector(0, 0);
            wanderForce = this.wander();
            wanderForce.mult(0.1); // Much reduced wandering
            cohesionForce = createVector(0, 0); // No cohesion in combat, use formation
            
        } else {
            // Normal behavior - implement leader-follower system
            if (this.isTeamLeader || !this.team || this.team.isIndividual || !this.team.leader) {
                // LEADER BEHAVIOR - only leaders get new targets and wander
                const currentTime = millis();
                const distanceToTarget = p5.Vector.dist(this.position, this.target);
                
                if (distanceToTarget < this.targetRadius || 
                    currentTime - this.lastTargetChange > this.targetChangeInterval) {
                    this.target = this.getRandomTarget();
                    this.lastTargetChange = currentTime;
                    this.targetChangeInterval = random(3000, 8000);
                }

                seekForce = this.seek(this.target);
                wanderForce = this.wander();
            } else {
                // FOLLOWER BEHAVIOR - follow the leader's position and trajectory
                const leader = this.team.leader;
                if (leader && leader !== this) {
                    // Follow leader's position with an offset to avoid clustering on exact spot
                    const followOffset = this.getFollowOffset();
                    const targetPos = p5.Vector.add(leader.position, followOffset);
                    
                    seekForce = this.seek(targetPos);
                    // Followers don't wander - they just follow
                    wanderForce = createVector(0, 0);
                } else {
                    // Fallback if leader is invalid
                    seekForce = this.seek(this.target);
                    wanderForce = this.wander();
                    wanderForce.mult(0.1);
                }
            }
            
            separateForce = this.separate(allBlobs);
            
            // Use formation for teams with 3+ members, cohesion for smaller teams
            if (this.team && this.team.members.length >= 3 && !this.team.isIndividual) {
                formationForce = this.formation();
                cohesionForce = createVector(0, 0);
                attachmentForce = this.attachment();
            } else {
                cohesionForce = this.cohesion();
                formationForce = createVector(0, 0);
                attachmentForce = createVector(0, 0);
            }
            
            combatForce = createVector(0, 0);
        }

                // Weight the forces based on current state and leadership role
        if (this.isInCombat) {
            combatForce.mult(1.8);       // Strong combat movement
            formationForce.mult(2.0);    // Strong formation in combat
            attachmentForce.mult(2.5);   // Very strong attachment in combat
            separateForce.mult(1.8);     // Moderate separation in combat
            wanderForce.mult(0.1);       // Minimal wandering
        } else if (this.isTeamLeader || !this.team || this.team.isIndividual) {
            // LEADER WEIGHTS - leaders explore and move freely
            seekForce.mult(0.6);         // Leaders seek targets more actively
            wanderForce.mult(0.2);       // Leaders can wander more
            separateForce.mult(1.2);     // Moderate separation
            cohesionForce.mult(map(this.leadership, 1, 100, 0.3, 0.8));
            formationForce.mult(map(this.team?.members.length || 1, 3, 12, 1.5, 2.5));
            attachmentForce.mult(1.2);
        } else {
            // FOLLOWER WEIGHTS - followers prioritize staying with leader
            seekForce.mult(2.5);         // VERY strong following of leader position
            wanderForce.mult(0.0);       // No wandering for followers
            separateForce.mult(0.8);     // Reduced separation to stay close to leader
            cohesionForce.mult(0.1);     // Minimal cohesion - formation handles this
            formationForce.mult(3.0);    // VERY strong formation force
            attachmentForce.mult(2.0);   // Strong attachment to leader
        }

        // Apply forces
        this.acceleration.add(seekForce);
        this.acceleration.add(wanderForce);
        this.acceleration.add(separateForce);
        this.acceleration.add(cohesionForce);
        this.acceleration.add(attachmentForce);
        this.acceleration.add(formationForce);
        this.acceleration.add(combatForce);

        // Update physics
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxSpeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);

        // FINAL: Check for any remaining overlaps after movement and fix them
        this.resolveCollisions(allBlobs);

        // Wrap around screen edges
        this.wrapAroundEdges();
    }

    /**
     * Wrap blob position around screen edges
     */
    wrapAroundEdges() {
        if (this.position.x < -this.size) this.position.x = windowWidth + this.size;
        if (this.position.x > windowWidth + this.size) this.position.x = -this.size;
        if (this.position.y < -this.size) this.position.y = windowHeight + this.size;
        if (this.position.y > windowHeight + this.size) this.position.y = -this.size;
    }

    /**
     * Render the blob as a clean, artistic circle
     */
    render() {
        push();
        
        // Draw team connections first (behind blobs) - separate toggle
        if (this.showTeamCircles && this.team && this.team.members.length > 1) {
            this.drawTeamConnections();
        }

        // Draw target line and directions behind the blob (separate toggle)
        if (this.showDirections) {
            stroke(255, 100, 100, 100);
            strokeWeight(1);
            
            if (this.isInCombat && this.combatTarget) {
                // Show combat target
                const rallyPoint = this.team.getCombatRallyPoint();
                if (rallyPoint) {
                    // Use team's harmonious color for rally point
                    const rallyColor = this.team.color || color(255, 200, 100);
                    stroke(red(rallyColor), green(rallyColor), blue(rallyColor), 180);
                    strokeWeight(2);
                    line(this.position.x, this.position.y, rallyPoint.x, rallyPoint.y);
                    
                    // Artistic rally point indicator
                    fill(red(rallyColor), green(rallyColor), blue(rallyColor), 120);
                    noStroke();
                    ellipse(rallyPoint.x, rallyPoint.y, 14);
                    
                    // Inner highlight
                    fill(255, 255, 255, 80);
                    ellipse(rallyPoint.x - 2, rallyPoint.y - 2, 6);
                }
            } else {
                line(this.position.x, this.position.y, this.target.x, this.target.y);
                // Draw target
                fill(255, 100, 100, 100);
                noStroke();
                ellipse(this.target.x, this.target.y, 8);
            }
        }
        
        // Get the blob's unique personal color
        const blobColor = this.personalColor || color(200, 200, 200);
        
        // Combat mode - subtle glow effect
        if (this.isInCombat) {
            // Soft outer glow for combat
            for (let i = 3; i > 0; i--) {
                const glowAlpha = 20 * i;
                fill(red(blobColor), green(blobColor), blue(blobColor), glowAlpha);
                noStroke();
                ellipse(this.position.x, this.position.y, this.size + i * 4);
            }
        }
        
        // Main blob circle - clean and solid
        fill(blobColor);
        noStroke();
        ellipse(this.position.x, this.position.y, this.size);
        
        // Subtle highlight for depth (generative art style)
        const highlightSize = this.size * 0.3;
        const highlightColor = color(
            Math.min(255, red(blobColor) + 40),
            Math.min(255, green(blobColor) + 40), 
            Math.min(255, blue(blobColor) + 40),
            120
        );
        fill(highlightColor);
        noStroke();
        ellipse(
            this.position.x - this.size * 0.15, 
            this.position.y - this.size * 0.15, 
            highlightSize
        );
        
        // Leadership indicator - elegant thin ring (COMMENTED OUT)
        /*
        if (this.leadership > 75) {
            noFill();
            // Use a complementary color for the leadership ring
            colorMode(HSB, 360, 100, 100);
            const leaderHue = (hue(blobColor) + 60) % 360; // Complementary color
            const leaderColor = color(leaderHue, 70, 90, 200);
            colorMode(RGB, 255);
            
            stroke(leaderColor);
            strokeWeight(2);
            ellipse(this.position.x, this.position.y, this.size + 6);
        }
        */
        
        // Team leader indicator - special crown-like indicator
        if (this.isTeamLeader) {
            noFill();
            // Bright, pulsing indicator for team leaders - more prominent
            const pulse = sin(millis() * 0.01) * 0.4 + 0.6; // Pulse between 0.2 and 1.0
            const crownColor = color(255, 215, 0, 200 * pulse); // Gold color with pulse
            stroke(crownColor);
            strokeWeight(4); // Thicker crown
            ellipse(this.position.x, this.position.y, this.size + 16);
            
            // Inner crown ring
            strokeWeight(2);
            ellipse(this.position.x, this.position.y, this.size + 10);
            
            // Crown points (decorative)
            strokeWeight(3);
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * TWO_PI;
                const x1 = this.position.x + cos(angle) * (this.size/2 + 8);
                const y1 = this.position.y + sin(angle) * (this.size/2 + 8);
                const x2 = this.position.x + cos(angle) * (this.size/2 + 12);
                const y2 = this.position.y + sin(angle) * (this.size/2 + 12);
                line(x1, y1, x2, y2);
            }
        }
        
        pop();
    }

    /**
     * Draw connections to team members for visualization
     */
    drawTeamConnections() {
        if (!this.team || this.team.members.length <= 1) return;
        
        // Draw formation structure
        if (this.team.members.length >= 3) {
            const teamCenter = this.team.getCenterPosition();
            if (teamCenter) {
                // Draw center point
                fill(red(this.team.color), green(this.team.color), blue(this.team.color), 100);
                noStroke();
                ellipse(teamCenter.x, teamCenter.y, 6);
                
                // Draw formation radius
                noFill();
                stroke(red(this.team.color), green(this.team.color), blue(this.team.color), 60);
                strokeWeight(1);
                
                const teamSize = this.team.members.length;
                if (teamSize <= 6) {
                    ellipse(teamCenter.x, teamCenter.y, 70); // Single circle
                } else {
                    ellipse(teamCenter.x, teamCenter.y, 50); // Inner circle
                    ellipse(teamCenter.x, teamCenter.y, 100); // Outer circle
                }
            }
        }
        
        // Draw connections to closest team members only
        const maxConnections = 2;
        const sortedMembers = this.team.members
            .filter(member => member !== this)
            .sort((a, b) => {
                const distA = p5.Vector.dist(this.position, a.position);
                const distB = p5.Vector.dist(this.position, b.position);
                return distA - distB;
            })
            .slice(0, maxConnections);
        
        stroke(red(this.team.color), green(this.team.color), blue(this.team.color), 120);
        strokeWeight(2);
        
        for (let other of sortedMembers) {
            const distance = p5.Vector.dist(this.position, other.position);
            const maxConnectionDistance = 80;
            
            if (distance < maxConnectionDistance) {
                // Fade the connection based on distance
                const alpha = map(distance, 0, maxConnectionDistance, 150, 50);
                stroke(red(this.team.color), green(this.team.color), blue(this.team.color), alpha);
                line(this.position.x, this.position.y, other.position.x, other.position.y);
            }
        }
    }

    /**
     * Get blob information as an object
     * @returns {object} Blob stats and properties
     */
    getInfo() {
        return {
            id: this.id,
            leadership: this.leadership,
            strength: this.strength,
            maxSpeed: this.maxSpeed,
            maxForce: this.maxForce,
            size: this.size,
            team: this.team ? this.team.name : 'None',
            position: {
                x: Math.round(this.position.x),
                y: Math.round(this.position.y)
            }
        };
    }

    /**
     * Toggle debug visualization
     */
    toggleDebug() {
        this.showDebug = !this.showDebug;
    }
}

// Static property for generating unique blob IDs
Blob.nextId = 1;