// Global variables
let blobs = [];
let teams = [];
let canvas;
let showStats = true; // Stats panel is now always visible
let showDebug = false;
let showDirections = true; // Toggle for direction arrows - enabled by default
let showTeamCircles = true; // Toggle for team formation circles - enabled by default
let showInstructions = false; // Toggle for instructions panel

// Configuration object - loaded from config.json
let config = {};

// UI State
let scrollOffset = 0;
let maxScroll = 0;

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
function preload() {
    // Load configuration from config.json
    loadJSON('config.json', 
        (data) => {
            config = data;
            window.config = config; // Make globally accessible
            console.log('✅ Configuration loaded:', config);
        },
        (error) => {
            console.error('❌ Failed to load config.json, using defaults:', error);
            // Set default values if config fails to load
            config = {
                initialBlobCount: 100,
                teamStartAggression: { min: 10, max: 50 },
                teamMaxSize: { min: 6, max: 14 },
                combat: { baseDamage: 8, strengthDivisor: 8, randomDamageRange: 6 },
                winnerLifeGain: 0.4,
                teamSizeProtection: 0.05,
                largePenaltyThreshold: 6,
                largePenaltyRate: 0.15
            };
            window.config = config; // Make globally accessible
        }
    );
}

function setup() {
    // Create fullscreen canvas and attach to container
    canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('sketch-container');
    
    // Initialize generative art color palette
    colorPalette = new ColorPalette();
    window.colorPalette = colorPalette; // Make globally accessible
    
    // Initialize teams
    initializeTeams();
    
    // Create blobs using config
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
    try {
        blobs.forEach(blob => blob.update(blobs));
    } catch (error) {
        console.error('Error in blob update:', error);
        return; // Stop execution if there's an error
    }
    
    // Check for team rebellions and cleanup
    try {
        checkTeamDynamics();
    } catch (error) {
        console.error('Error in team dynamics:', error);
    }
    
    // Render all blobs
    try {
        blobs.forEach(blob => blob.render());
    } catch (error) {
        console.error('Error in blob rendering:', error);
    }
    
    // Debug: Check if blob count changed unexpectedly
    if (blobs.length < blobCount) {
        console.log(`WARNING: Blob count decreased from ${blobCount} to ${blobs.length}`);
        console.log(`This should only happen during team dissolution, not absorption!`);
    }
    
    // Ensure we maintain 100 blobs - add missing ones if population dropped
    const targetPopulation = 100;
    if (blobs.length < targetPopulation && frameCount % 60 === 0) { // Check every second
        const missing = targetPopulation - blobs.length;
        console.log(`🔧 Population dropped to ${blobs.length}. Adding ${missing} blobs to reach ${targetPopulation}.`);
        
        for (let i = 0; i < missing; i++) {
            const margin = 50;
            const x = random(margin, windowWidth - margin);
            const y = random(margin, windowHeight - margin);
            
            const newBlob = new Blob(x, y, null);
            newBlob.showDebug = showDebug;
            newBlob.showDirections = showDirections;
            newBlob.showTeamCircles = showTeamCircles;
            blobs.push(newBlob);
            
            if (!teams.includes(newBlob.team)) {
                teams.push(newBlob.team);
            }
        }
    }
    
    // Draw UI - toggle with space key
    if (showStats) {
        drawStats();
    }
    
    // Draw instructions panel if enabled
    if (showInstructions) {
        drawInstructions();
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
    // Use config for blob count, fallback to 100 if not loaded
    const numBlobs = config.initialBlobCount || 100;
    
    for (let i = 0; i < numBlobs; i++) {
        // Random position with margin from edges
        const margin = 50;
        const x = random(margin, windowWidth - margin);
        const y = random(margin, windowHeight - margin);
        
        // Each blob starts with its own individual team
        const blob = new Blob(x, y, null); // null team means it creates its own
        blob.showDirections = showDirections;
        blob.showTeamCircles = showTeamCircles;
        blob.showDebug = showDebug;
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
    const panelWidth = Math.min(400, windowWidth * 0.25);
    
    // Calculate dynamic height based on content
    const sortedTeams = teams.filter(team => team.members.length > 0)
                            .sort((a, b) => {
                                const aStrength = a.members.reduce((sum, blob) => sum + blob.strength, 0);
                                const bStrength = b.members.reduce((sum, blob) => sum + blob.strength, 0);
                                return bStrength - aStrength;
                            });
    const itemHeight = 50; // Reduced from 65
    const headerHeight = 90; // Reduced from 110
    const buttonAreaHeight = 45; // Reduced from 60
    const contentHeight = Math.min(sortedTeams.length * itemHeight, windowHeight - headerHeight - buttonAreaHeight - 40);
    const panelHeight = headerHeight + contentHeight + buttonAreaHeight;
    
    // Position terminal on the right side
    const panelX = windowWidth - panelWidth;
    
    // Terminal-style black panel
    push();
    
    // Solid black background
    fill(0, 0, 0, 240);
    stroke(160, 160, 160, 180); // Muted gray border instead of green
    strokeWeight(2);
    rect(panelX, 20, panelWidth, panelHeight, 0); // No rounded corners for terminal look
    
    // Terminal scanlines effect
    stroke(120, 120, 120, 20); // Subtle gray scanlines
    strokeWeight(1);
    for (let i = 20; i < panelHeight + 20; i += 4) {
        line(panelX, i, panelX + panelWidth, i);
    }
    
    // Terminal header section
    fill(0, 0, 0);
    noStroke();
    rect(panelX, 20, panelWidth, 65); // Reduced from 80
    
    // Header border
    stroke(160, 160, 160); // Gray border
    strokeWeight(1);
    line(panelX, 20, panelX + panelWidth, 20);
    line(panelX, 85, panelX + panelWidth, 85); // Adjusted position
    
    // Terminal header text with ASCII art
    fill(200, 200, 200); // Light gray text instead of bright green
    textAlign(LEFT, CENTER);
    textSize(14);
    textFont('Courier New'); // Monospace font
    textStyle(BOLD);
    text('> BLOB_DYNAMICS.EXE', panelX + 10, 35); // Adjusted position
    
    textSize(9); // Reduced font size
    textStyle(NORMAL);
    text(`[SYSTEM] ${blobs.length} ENTITIES | ${teams.filter(t => t.members.length > 0).length} GROUPS`, panelX + 10, 50);
    text(`[STATUS] ${teams.filter(t => t.isInCombat).length} HOSTILE | RES:${windowWidth}x${windowHeight}`, panelX + 10, 62);
    text('━'.repeat(Math.floor(panelWidth/8)), panelX + 10, 75);
    
    // Scrollable content area
    const contentY = 90; // Reduced from 110
    
    // Create clipping mask for scrollable area
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(panelX, contentY, panelWidth, contentHeight);
    drawingContext.clip();
    
    // Sort teams by strength for better display (reuse the already calculated sortedTeams)
    
    let yPos = contentY - scrollOffset;
    
    sortedTeams.forEach((team, index) => {
        // Only render if visible
        if (yPos + itemHeight > contentY && yPos < contentY + contentHeight) {
            drawTerminalTeamCard(team, panelX + 5, yPos, panelWidth - 10, itemHeight - 5);
        }
        yPos += itemHeight;
    });
    
    // Calculate max scroll
    maxScroll = Math.max(0, sortedTeams.length * itemHeight - contentHeight + 20);
    
    drawingContext.restore();
    
    // Terminal-style scroll indicator
    if (maxScroll > 0) {
        const scrollBarHeight = (contentHeight / (sortedTeams.length * itemHeight)) * contentHeight;
        const scrollBarY = contentY + (scrollOffset / maxScroll) * (contentHeight - scrollBarHeight);
        
        // ASCII scroll bar
        stroke(120, 120, 120, 100); // Muted gray
        strokeWeight(1);
        line(panelX + panelWidth - 6, contentY, panelX + panelWidth - 6, contentY + contentHeight);
        
        stroke(180, 180, 180); // Lighter gray for indicator
        strokeWeight(3);
        line(panelX + panelWidth - 6, scrollBarY, panelX + panelWidth - 6, scrollBarY + scrollBarHeight);
    }
    
    // Draw interactive buttons
    drawButtons(panelX, panelWidth);
    
    pop();
}

function drawTerminalTeamCard(team, x, y, w, h) {
    const stats = team.getStats();
    const totalStrength = team.members.reduce((sum, blob) => sum + blob.strength, 0);
    
    // Terminal card background
    fill(0, 0, 0);
    stroke(120, 120, 120, 100); // Muted gray border
    strokeWeight(1);
    rect(x, y, w, h);
    
    // Team color indicator - ASCII style
    fill(team.color);
    noStroke();
    rect(x + 2, y + 2, 3, h - 4);
    
    // Terminal-style team header
    fill(200, 200, 200); // Light gray text
    textAlign(LEFT, TOP);
    textSize(10); // Reduced from 12
    textFont('Courier New');
    textStyle(BOLD);
    
    let teamName = team.isIndividual ? `SOLO_${team.id}` : `TEAM_${team.id}`;
    let statusIcons = '';
    if (team.isInCombat) statusIcons += '[HOSTILE]';
    if (team.leader) statusIcons += '[LEADER]';
    
    text(`> ${teamName} ${statusIcons}`, x + 10, y + 6); // Reduced y offset
    
    // Members info - terminal style
    textSize(8); // Reduced from 10
    textStyle(NORMAL);
    fill(150, 150, 150); // Medium gray
    text(`UNITS: ${stats.memberCount}/${stats.maxSize}`, x + 10, y + 18); // Reduced y offset
    
    // ASCII-style stat bars
    const barY = y + 28; // Reduced from 35
    const barWidth = Math.floor((w - 20) / 3);
    
    // Life bar - ASCII style
    drawTerminalBar('LIFE', stats.life, 100, x + 10, barY, barWidth);
    
    // Aggression bar
    drawTerminalBar('AGGR', stats.aggression, 100, x + 10 + barWidth, barY, barWidth);
    
    // Strength display
    fill(180, 180, 180); // Light gray
    textSize(8); // Reduced from 9
    text(`PWR:${totalStrength}`, x + 10 + barWidth * 2, barY + 6); // Adjusted position
}

function drawTerminalBar(label, value, maxValue, x, y, width) {
    const percentage = value / maxValue;
    const barLength = Math.floor(width / 6) - 1; // Reduced bar length for compact display
    const fillLength = Math.floor(barLength * percentage);
    
    // Label
    fill(160, 160, 160); // Muted gray
    textSize(7); // Reduced from 8
    textFont('Courier New');
    text(label, x, y);
    
    // ASCII progress bar
    let barString = '[';
    for (let i = 0; i < barLength; i++) {
        if (i < fillLength) {
            barString += '█'; // Filled block
        } else {
            barString += '░'; // Empty block
        }
    }
    barString += ']';
    
    // Color based on percentage - minimal color scheme
    if (percentage > 0.7) {
        fill(180, 180, 180); // Light gray for high
    } else if (percentage > 0.3) {
        fill(140, 140, 140); // Medium gray for medium
    } else {
        fill(100, 100, 100); // Dark gray for low
    }
    
    text(barString, x, y + 8); // Reduced spacing
    
    // Value
    fill(160, 160, 160, 180); // Muted gray with transparency
    textSize(6); // Reduced from 7
    text(`${Math.round(value)}`, x + barString.length * 3, y + 16); // Adjusted position
}

/**
 * Draw instructions panel
 */
function drawInstructions() {
    const panelWidth = 300;
    const panelHeight = 250;
    const terminalWidth = Math.min(400, windowWidth * 0.25);
    const x = windowWidth - terminalWidth - panelWidth - 10; // Position to the left of terminal
    const y = 10;
    
    // Terminal-style instructions background
    fill(0, 0, 0, 220);
    stroke(160, 160, 160);
    strokeWeight(1);
    rect(x, y, panelWidth, panelHeight);
    
    // Terminal header
    fill(200, 200, 200);
    textAlign(LEFT, TOP);
    textSize(14);
    textFont('Courier New');
    textStyle(BOLD);
    text('> HELP.TXT', x + 10, y + 10);
    
    // Divider
    stroke(160, 160, 160);
    line(x + 10, y + 30, x + panelWidth - 10, y + 30);
    
    // Instructions text
    textSize(10);
    textStyle(NORMAL);
    fill(180, 180, 180);
    
    const instructions = [
        '[H] - Toggle this help panel',
        '[D] - Toggle debug info',
        '[V] - Toggle direction arrows',
        '[C] - Toggle team circles',
        '[R] - Reset simulation',
        '[F] - Toggle fullscreen',
        '',
        'MOUSE:',
        'Scroll - Navigate team list',
        'Click buttons - Quick actions',
        '',
        'SIMULATION:',
        'Teams form and fight dynamically',
        'Life decreases in combat',
        'Aggression naturally decays'
    ];
    
    let yPos = y + 45;
    instructions.forEach(line => {
        text(line, x + 10, yPos);
        yPos += 12;
    });
}

/**
 * Draw interactive buttons in stats panel
 */
function drawButtons(panelX, panelWidth) {
    const buttonSpacing = 4;
    const buttonWidth = (panelWidth - 10 - (buttonSpacing * 3)) / 4; // Divide width equally among 4 buttons
    const buttonHeight = 30; // Slightly bigger
    const startX = panelX + 5;
    const startY = height - 40;
    
    const buttons = [
        { label: 'RESET', action: 'reset', key: 'R' },
        { label: 'ARROWS', action: 'arrows', key: 'V', active: showDirections },
        { label: 'CIRCLES', action: 'circles', key: 'C', active: showTeamCircles },
        { label: 'HELP', action: 'help', key: 'H', active: showInstructions }
    ];
    
    buttons.forEach((button, index) => {
        const x = startX + (buttonWidth + buttonSpacing) * index;
        const y = startY;
        
        // Button background
        if (button.active) {
            fill(80, 80, 80);
        } else {
            fill(40, 40, 40);
        }
        stroke(120, 120, 120);
        strokeWeight(1);
        rect(x, y, buttonWidth, buttonHeight);
        
        // Button text
        fill(button.active ? 200 : 160, button.active ? 200 : 160, button.active ? 200 : 160);
        textAlign(CENTER, CENTER);
        textSize(10);
        textFont('Courier New');
        textStyle(NORMAL);
        text(button.label, x + buttonWidth/2, y + buttonHeight/2 - 2);
        
        // Key indicator
        textSize(7);
        fill(120, 120, 120);
        text(`[${button.key}]`, x + buttonWidth/2, y + buttonHeight - 6);
        
        // Store button bounds for click detection
        button.x = x;
        button.y = y;
        button.width = buttonWidth;
        button.height = buttonHeight;
    });
    
    // Store buttons globally for click detection
    window.uiButtons = buttons;
}

/**
 * Handle mouse clicks on buttons
 */
function mousePressed() {
    if (window.uiButtons) {
        window.uiButtons.forEach(button => {
            if (mouseX >= button.x && mouseX <= button.x + button.width &&
                mouseY >= button.y && mouseY <= button.y + button.height) {
                
                // Execute button action
                switch(button.action) {
                    case 'reset':
                        resetSimulation();
                        break;
                    case 'arrows':
                        showDirections = !showDirections;
                        blobs.forEach(blob => blob.showDirections = showDirections);
                        break;
                    case 'circles':
                        showTeamCircles = !showTeamCircles;
                        blobs.forEach(blob => blob.showTeamCircles = showTeamCircles);
                        break;
                    case 'help':
                        showInstructions = !showInstructions;
                        break;
                }
            }
        });
    }
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
        case 'v':
        case 'V':
            showDirections = !showDirections;
            blobs.forEach(blob => blob.showDirections = showDirections);
            console.log(`Direction arrows: ${showDirections ? 'ON' : 'OFF'}`);
            break;
        case 'c':
        case 'C':
            showTeamCircles = !showTeamCircles;
            blobs.forEach(blob => blob.showTeamCircles = showTeamCircles);
            console.log(`Team circles: ${showTeamCircles ? 'ON' : 'OFF'}`);
            break;
        case 'r':
        case 'R':
            resetSimulation();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
        case 'h':
        case 'H':
            showInstructions = !showInstructions;
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
            // Remove nearest blob (for debugging purposes)
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
    
    // Check for teams with 0 life - they die and get replaced (check more frequently)
    if (frameCount % 60 === 0) { // Every 1 second at 60fps (faster than before)
        const initialBlobCount = blobs.length;
        const deadTeams = teams.filter(team => team.life <= 0 && team.members.length > 0);
        
        if (deadTeams.length > 0) {
            let totalDeadBlobs = 0;
            
            console.log(`💀 Processing ${deadTeams.length} dead teams that lost all life...`);
            
            deadTeams.forEach(team => {
                const deadBlobCount = team.members.length;
                totalDeadBlobs += deadBlobCount;
                
                console.log(`💀 Team ${team.name} died from zero life! ${deadBlobCount} blobs perished.`);
                
                // Remove all dead blobs from the main blobs array
                team.members.forEach(deadBlob => {
                    const index = blobs.indexOf(deadBlob);
                    if (index > -1) {
                        blobs.splice(index, 1);
                    }
                });
                
                // Clear the team's member list immediately to prevent reprocessing
                team.members = [];
                team.life = -1; // Mark as processed
            });
            
            // Create exactly the same number of new random blobs to replace ALL the dead ones
            console.log(`✨ Creating ${totalDeadBlobs} new blobs to replace the dead teams...`);
            for (let i = 0; i < totalDeadBlobs; i++) {
                const margin = 50;
                const x = random(margin, windowWidth - margin);
                const y = random(margin, windowHeight - margin);
                
                const newBlob = new Blob(x, y, null); // Creates its own individual team
                newBlob.showDebug = showDebug;
                newBlob.showDirections = showDirections;
                newBlob.showTeamCircles = showTeamCircles;
                blobs.push(newBlob);
                
                // Add the blob's team to global teams array
                if (!teams.includes(newBlob.team)) {
                    teams.push(newBlob.team);
                }
            }
            
            const finalBlobCount = blobs.length;
            console.log(`📊 Population check: ${initialBlobCount} → ${finalBlobCount} (change: ${finalBlobCount - initialBlobCount})`);
            
            if (Math.abs(finalBlobCount - initialBlobCount) > 0) {
                console.warn(`⚠️ Population changed by ${finalBlobCount - initialBlobCount}! This should be 0.`);
            }
        }
        
        // Remove dead teams from teams array (only those marked as processed)
        teams = teams.filter(team => team.members.length > 0 && team.life >= 0);
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

// Mouse wheel scrolling for stats panel
function mouseWheel(event) {
    if (showStats && mouseX < Math.min(400, windowWidth * 0.25)) {
        // Scroll in stats panel
        scrollOffset += event.delta * 3;
        scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
        return false; // Prevent page scrolling
    }
}