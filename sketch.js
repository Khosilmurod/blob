// Global variables
let blobs = [];
let teams = [];
let canvas;
let showStats = true;
let showDebug = false;

// Generative Art Color System
class ColorPalette {
    constructor() {
        // High-contrast, vibrant color palette
        this.contrastColors = [
            color(0, 100, 255),     // Electric Blue
            color(50, 255, 50),     // Neon Green
            color(255, 20, 20),     // Bright Red
            color(255, 255, 255),   // Pure White
            color(255, 0, 255),     // Magenta
            color(0, 255, 255),     // Cyan
            color(255, 165, 0),     // Orange
            color(255, 255, 0),     // Yellow
            color(128, 0, 255),     // Purple
            color(255, 20, 147),    // Deep Pink
            color(0, 255, 127),     // Spring Green
            color(255, 69, 0),      // Red Orange
            color(30, 144, 255),    // Dodger Blue
            color(50, 205, 50),     // Lime Green
            color(220, 20, 60),     // Crimson
            color(240, 240, 240),   // Light Gray (almost white)
            color(138, 43, 226),    // Blue Violet
            color(0, 191, 255),     // Deep Sky Blue
            color(255, 215, 0),     // Gold
            color(255, 105, 180)    // Hot Pink
        ];
        this.usedColors = [];
        this.colorIndex = 0;
    }
    
    generateUniqueColor() {
        // Return next color in the high-contrast palette
        const selectedColor = this.contrastColors[this.colorIndex % this.contrastColors.length];
        this.colorIndex++;
        this.usedColors.push(selectedColor);
        return selectedColor;
    }
    
    isColorTooSimilar(newColor, threshold = 30) {
        // Not needed for high-contrast palette, but keeping for compatibility
        return false;
    }
    
    colorDistance(c1, c2) {
        const r1 = red(c1), g1 = green(c1), b1 = blue(c1);
        const r2 = red(c2), g2 = green(c2), b2 = blue(c2);
        return sqrt(pow(r1-r2, 2) + pow(g1-g2, 2) + pow(b1-b2, 2));
    }
    
    generateTeamColor(baseColor) {
        // For high-contrast mode, all team members get the same color as leader
        return baseColor;
    }
}

// Global color palette instance
let colorPalette;

/**
 * p5.js setup function - runs once at start
 */
function setup() {
    // Create fullscreen canvas and attach to container
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('sketch-container');
    
    // Initialize generative art color palette
    colorPalette = new ColorPalette();
    window.colorPalette = colorPalette; // Make globally accessible
    
    // Initialize teams
    initializeTeams();
    
    // Create blobs
    createBlobs();
    
    console.log(`Created ${blobs.length} blobs across ${teams.length} teams`);
}

/**
 * p5.js draw function - runs continuously
 */
function draw() {
    background(30, 30, 40);
    
    // Track blob count for debugging
    const blobCount = blobs.length;
    
    // Update all blobs (includes interaction checks)
    blobs.forEach(blob => blob.update(blobs));
    
    // Check for team rebellions and cleanup
    checkTeamDynamics();
    
    // Render all blobs
    blobs.forEach(blob => blob.render());
    
    // Debug: Check if blob count changed unexpectedly
    if (blobs.length < blobCount) {
        console.log(`WARNING: Blob count decreased from ${blobCount} to ${blobs.length}`);
    }
    
    // Draw UI
    if (showStats) {
        drawStats();
    }
}

/**
 * Initialize teams with colors (now these are just starting teams)
 */
function initializeTeams() {
    // Clear teams array - blobs will create their own individual teams
    teams = [];
}

/**
 * Create blobs and assign them to teams
 */
function createBlobs() {
    // Scale number of blobs based on screen size
    const screenArea = windowWidth * windowHeight;
    const baseArea = 1000 * 700; // Original canvas size
    const scaleFactor = Math.sqrt(screenArea / baseArea);
    const numBlobs = Math.floor(30 * scaleFactor); // Reduced for better interaction dynamics
    
    for (let i = 0; i < numBlobs; i++) {
        // Random position with margin from edges
        const margin = 50;
        const x = random(margin, windowWidth - margin);
        const y = random(margin, windowHeight - margin);
        
        // Each blob starts with its own individual team
        const blob = new Blob(x, y, null); // null team means it creates its own
        blobs.push(blob);
        
        // Add the blob's team to global teams array
        if (!teams.includes(blob.team)) {
            teams.push(blob.team);
        }
    }
}

/**
 * Draw statistics panel with controls
 */
function drawStats() {
    // Calculate panel dimensions based on screen size
    const panelWidth = Math.min(350, windowWidth * 0.28);
    const panelHeight = Math.min(400, windowHeight * 0.55);
    
    // Semi-transparent background
    fill(0, 0, 0, 150);
    noStroke();
    rect(10, 10, panelWidth, panelHeight);
    
    // Title
    fill(255);
    textAlign(LEFT);
    textSize(Math.min(16, windowWidth * 0.016));
    textStyle(BOLD);
    text('Blob Simulation', 20, 30);
    
    // General stats
    textSize(Math.min(12, windowWidth * 0.012));
    textStyle(NORMAL);
    text(`Total Blobs: ${blobs.length}`, 20, 50);
    text(`Active Teams: ${teams.length}`, 20, 65);
    text(`Teams in Combat: ${teams.filter(t => t.isInCombat).length}`, 20, 80);
    text(`Screen: ${windowWidth}x${windowHeight}`, 20, 95);
    
    // Team stats
    let yOffset = 115;
    textStyle(BOLD);
    text('Team Statistics:', 20, yOffset);
    yOffset += 15;
    
    textStyle(NORMAL);
    // Sort teams by size for better display
    const sortedTeams = teams.filter(team => team.members.length > 0)
                            .sort((a, b) => b.members.length - a.members.length)
                            .slice(0, 8); // Show top 8 teams
    
    sortedTeams.forEach((team, index) => {
        if (yOffset < panelHeight - 120) {
            const stats = team.getStats();
            
            // Team color indicator
            fill(team.color);
            noStroke();
            ellipse(30, yOffset - 4, 8);
            
            // Team info with new stats
            fill(255);
            let teamText = team.isIndividual ? `${team.name} (Solo)` : team.name;
            if (team.isInCombat) {
                teamText += ` ⚔️`; // Combat indicator
            }
            text(`${teamText}: ${stats.memberCount}/${stats.maxSize}`, 45, yOffset);
            yOffset += 12;
            if (yOffset < panelHeight - 110) {
                text(`  Morale: ${stats.morale.toFixed(0)} | Aggr: ${stats.aggression.toFixed(0)}`, 45, yOffset);
                yOffset += 12;
            }
            if (yOffset < panelHeight - 110) {
                text(`  Strength: ${stats.totalStrength} | Coop: ${(stats.cooperation * 100).toFixed(0)}%`, 45, yOffset);
                yOffset += 15;
            }
        }
    });
    
    // Controls section
    yOffset = Math.max(yOffset, panelHeight - 100);
    fill(255);
    textStyle(BOLD);
    textSize(Math.min(14, windowWidth * 0.014));
    text('Controls:', 20, yOffset);
    yOffset += 15;
    
    textSize(Math.min(11, windowWidth * 0.011));
    textStyle(NORMAL);
    text('Space: Toggle This Panel', 20, yOffset);
    yOffset += 12;
    text('D: Toggle Debug Mode', 20, yOffset);
    yOffset += 12;
    text('R: Reset Simulation', 20, yOffset);
    yOffset += 12;
    text('F: Toggle Fullscreen', 20, yOffset);
    yOffset += 12;
    text('Click: Add Blob', 20, yOffset);
    yOffset += 12;
    text('Shift+Click: Remove Blob', 20, yOffset);
}

/**
 * Handle key presses
 */
function keyPressed() {
    switch (key) {
        case ' ':
            showStats = !showStats;
            break;
        case 'd':
        case 'D':
            showDebug = !showDebug;
            blobs.forEach(blob => blob.showDebug = showDebug);
            break;
        case 'r':
        case 'R':
            resetSimulation();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
    }
}

/**
 * Handle mouse clicks
 */
function mousePressed() {
    // Check if click is within canvas bounds
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        if (keyIsDown(SHIFT)) {
            // Remove nearest blob
            removeNearestBlob(mouseX, mouseY);
        } else {
            // Add new blob at mouse position
            addBlobAtMouse(mouseX, mouseY);
        }
    }
}

/**
 * Check team dynamics and handle rebellions
 */
function checkTeamDynamics() {
    // Check for rebellions in large teams (only occasionally to avoid performance issues)
    if (frameCount % 120 === 0) { // Every 2 seconds at 60fps
        const teamsToCheck = [...teams]; // Copy array to avoid modification during iteration
        
        teamsToCheck.forEach(team => {
            // Update team combat state
            team.updateCombat();
            
            const rebelTeam = team.checkForRebellion();
            if (rebelTeam) {
                teams.push(rebelTeam);
                console.log(`Rebellion! ${rebelTeam.name} split from ${team.name}`);
            }
            
            // Update team morale over time
            team.updateMorale();
        });
    }
    
    // Clean up empty teams
    teams = teams.filter(team => team.members.length > 0);
}

/**
 * Add a new blob at mouse position
 */
function addBlobAtMouse(x, y) {
    const newBlob = new Blob(x, y, null); // Creates its own individual team
    newBlob.showDebug = showDebug;
    blobs.push(newBlob);
    
    // Add the blob's team to global teams array
    if (!teams.includes(newBlob.team)) {
        teams.push(newBlob.team);
    }
    
    console.log(`Added new blob at (${x}, ${y}) - Team: ${newBlob.team.name}`);
}

/**
 * Remove the blob nearest to the specified position
 */
function removeNearestBlob(x, y) {
    if (blobs.length === 0) return;
    
    let nearestBlob = null;
    let nearestDistance = Infinity;
    let nearestIndex = -1;
    
    for (let i = 0; i < blobs.length; i++) {
        const distance = dist(x, y, blobs[i].position.x, blobs[i].position.y);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBlob = blobs[i];
            nearestIndex = i;
        }
    }
    
    if (nearestBlob && nearestDistance < 50) { // Only remove if close enough
        // Remove from team if it belongs to one
        if (nearestBlob.team) {
            nearestBlob.team.removeMember(nearestBlob);
        }
        
        // Remove from blobs array
        blobs.splice(nearestIndex, 1);
        
        console.log(`Removed blob ${nearestBlob.id}`);
    }
}

/**
 * Reset the simulation
 */
function resetSimulation() {
    // Clear existing blobs
    blobs = [];
    
    // Clear team memberships
    teams.forEach(team => {
        team.members = [];
    });
    
    // Create new blobs
    createBlobs();
    
    console.log('Simulation reset');
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const fs = fullscreen();
    fullscreen(!fs);
}

/**
 * Window resize handler
 */
function windowResized() {
    // Resize canvas to match new window size
    resizeCanvas(windowWidth, windowHeight);
    
    // Update blob targets to be within new bounds
    blobs.forEach(blob => {
        // If blob target is outside new bounds, get a new target
        if (blob.target.x > windowWidth - 50 || blob.target.y > windowHeight - 50) {
            blob.target = blob.getRandomTarget();
        }
        
        // If blob is outside new bounds, wrap it around
        if (blob.position.x > windowWidth) blob.position.x = 0;
        if (blob.position.y > windowHeight) blob.position.y = 0;
    });
    
    console.log(`Canvas resized to ${windowWidth}x${windowHeight}`);
}

// Debug function to log blob information
function logBlobInfo() {
    console.log('=== BLOB INFORMATION ===');
    blobs.forEach(blob => {
        console.log(blob.getInfo());
    });
    
    console.log('=== TEAM INFORMATION ===');
    teams.forEach(team => {
        console.log(team.getStats());
    });
}