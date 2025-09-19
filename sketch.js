// Global variables
let blobs = [];
let teams = [];
let canvas;
let showStats = false; // Terminal disabled by default - press space to show
let showDebug = false;
let showDirections = false; // Toggle for individual direction arrows - disabled by default
let showTeamCircles = true; // Toggle for team formation circles - enabled by default
let showInstructions = false; // Toggle for instructions panel

/**
 * Preload assets before setup
 */
// Configuration object - loaded from config.json
let config = {};

// UI State
let scrollOffset = 0;
let maxScroll = 0;
let startTime = 0; // Track when simulation started

// Panel Array System - right-justified panels
let panelArray = []; // Array of active panel objects
const PANEL_WIDTH = 300;
const PANEL_SPACING = 10;
let horizontalScrollOffset = 0; // For horizontal scrolling of panels

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
    
    // Initialize start time for instructions
    startTime = millis();
    
    // Setup background music
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
    
    // Ensure we maintain population within limits - respect maximum
    const maxBlobs = config.maxBlobCount || 500;
    const targetPopulation = Math.min(config.initialBlobCount || 100, maxBlobs);
    
    if (blobs.length < targetPopulation && frameCount % 60 === 0) { // Check every second
        const missing = Math.min(targetPopulation - blobs.length, maxBlobs - blobs.length);
        if (missing > 0) {
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
    }
    
    // Always draw UI buttons
    drawInitialInstruction();
    
    // Draw horizontal scroll indicators for panels
    drawHorizontalScrollIndicators();
    
    // Draw terminal stats when toggled with space key
    if (showStats) {
        drawStats();
    }
    
    // Always draw instructions panel if enabled (independent of stats)
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
 * Draw initial instruction message - always visible
 */
function drawInitialInstruction() {
    // Position at bottom center
    const messageY = windowHeight - 50;
    
    // Create equal-width button boxes
    const buttonWidth = 120; // Fixed width for all buttons
    const buttonHeight = 30; // Reduced height for single line
    const totalButtons = 5; // R, V, SPACE, C, H buttons
    const buttonSpacing = 10; // Equal spacing between buttons
    
    // Calculate total width needed
    const totalWidth = (buttonWidth * totalButtons) + (buttonSpacing * (totalButtons-1));
    
    // Check if buttons fit on screen with some margin
    const minMargin = 20; // Minimum margin on each side
    const requiredWidth = totalWidth + (minMargin * 2);
    
    // Only draw buttons if they fit
    if (windowWidth < requiredWidth) {
        return; // Don't draw buttons if screen is too narrow
    }
    
    // Calculate starting position for leftmost button (to center everything)
    const startX = (windowWidth - totalWidth) / 2;
    const alpha = 255; // Always fully visible
    
    // Draw boxes with equal spacing and size
    fill(40, 40, 40, 230);
    stroke(160, 160, 160, 200);
    strokeWeight(1);
    rectMode(CORNER);
    
    // RESET button (R)
    const resetX = startX;
    rect(resetX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    
    // ARROWS button (V)
    const arrowsX = resetX + buttonWidth + buttonSpacing;
    rect(arrowsX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    
    // SPACE button (SPACE)
    const spaceX = arrowsX + buttonWidth + buttonSpacing;
    rect(spaceX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    
    // CIRCLES button (C)
    const circlesX = spaceX + buttonWidth + buttonSpacing;
    rect(circlesX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    
    // HELP button (H)
    const helpX = circlesX + buttonWidth + buttonSpacing;
    rect(helpX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    
    // Text for all buttons - single line format
    fill(200, 200, 200, 255);
    textAlign(CENTER, CENTER);
    textFont('Courier New');
    textSize(12);
    textStyle(NORMAL);
    
    // Single line text for each button (format: "LABEL [KEY]")
    text('RESET [R]', resetX + buttonWidth/2, messageY);
    text('ARROWS [V]', arrowsX + buttonWidth/2, messageY);
    
    // Dynamic text for SPACE button
    const terminalAction = showStats ? "HIDE" : "SHOW";
    text(`${terminalAction} [SPACE]`, spaceX + buttonWidth/2, messageY);
    
    text('CIRCLES [C]', circlesX + buttonWidth/2, messageY);
    text('HELP [H]', helpX + buttonWidth/2, messageY);
    
    // Add highlight effect to buttons based on state
    noFill();
    strokeWeight(2);
    
    // Highlight active buttons
    if (showDirections) {
        stroke(120, 200, 120, 180); // Green highlight for active
        rect(arrowsX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    }
    
    if (showStats) {
        stroke(120, 200, 120, 180); // Green highlight for active
        rect(spaceX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    }
    
    if (showTeamCircles) {
        stroke(120, 200, 120, 180); // Green highlight for active
        rect(circlesX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    }
    
    if (showInstructions) {
        stroke(120, 200, 120, 180); // Green highlight for active
        rect(helpX, messageY - buttonHeight/2, buttonWidth, buttonHeight, 5);
    }
    
    // Reset drawing settings
    stroke(160, 160, 160);
    strokeWeight(1);
}

/**
 * Draw horizontal scroll indicators when panels overflow
 */
function drawHorizontalScrollIndicators() {
    if (panelArray.length === 0) return;
    
    const maxScroll = getMaxHorizontalScroll();
    if (maxScroll === 0) return; // No scrolling needed
    
    const leftmostPanelX = calculatePanelPosition(0);
    const rightmostPanelX = calculatePanelPosition(panelArray.length - 1) + PANEL_WIDTH;
    
    // Left scroll indicator (when content extends beyond left edge and can scroll right to reveal it)
    if (leftmostPanelX < 0 && horizontalScrollOffset < getMaxHorizontalScroll()) {
        fill(120, 120, 120, 150);
        noStroke();
        triangle(15, windowHeight/2, 5, windowHeight/2 - 10, 5, windowHeight/2 + 10);
        
        fill(200, 200, 200, 180);
        textAlign(LEFT, CENTER);
        textSize(10);
        textFont('Courier New');
        text('◄ SCROLL DOWN', 20, windowHeight/2);
    }
    
    // Right scroll indicator (when we've scrolled and can scroll back to see right content)
    if (horizontalScrollOffset > 0) {
        fill(120, 120, 120, 150);
        noStroke();
        triangle(windowWidth - 15, windowHeight/2, windowWidth - 5, windowHeight/2 - 10, windowWidth - 5, windowHeight/2 + 10);
        
        fill(200, 200, 200, 180);
        textAlign(RIGHT, CENTER);
        textSize(10);
        textFont('Courier New');
        text('SCROLL UP ►', windowWidth - 20, windowHeight/2);
    }
}

/**
 * Draw statistics panel with controls
 */
function drawStats() {
    const panelWidth = PANEL_WIDTH;
    
    // Calculate dynamic height based on content and available screen space
    const sortedTeams = teams.filter(team => team.members.length > 0)
                            .sort((a, b) => {
                                const aStrength = a.members.reduce((sum, blob) => sum + blob.strength, 0);
                                const bStrength = b.members.reduce((sum, blob) => sum + blob.strength, 0);
                                return bStrength - aStrength;
                            });
    const itemHeight = 50;
    const headerHeight = 70; // Reduced from 90
    const bottomMargin = 100; // Space for buttons and margins
    const maxAvailableHeight = windowHeight - 40 - bottomMargin; // 40 is top margin
    const maxContentHeight = Math.max(120, Math.min(300, maxAvailableHeight - headerHeight)); // Smaller max height
    const actualContentHeight = Math.min(sortedTeams.length * itemHeight, maxContentHeight);
    const panelHeight = Math.min(headerHeight + actualContentHeight, maxAvailableHeight);
    
    // Find position of stats panel in array and calculate its x position
    const panelIndex = panelArray.findIndex(panel => panel.type === 'stats');
    if (panelIndex === -1) return; // Panel not in array, shouldn't draw
    
    const panelX = calculatePanelPosition(panelIndex);
    
    // Terminal-style black panel
    push();
    
    // Solid black background - exact size needed
    fill(0, 0, 0, 240);
    stroke(160, 160, 160, 180);
    strokeWeight(2);
    rect(panelX, 20, panelWidth, panelHeight, 0);
    
    // Terminal scanlines effect - only within panel
    stroke(120, 120, 120, 20);
    strokeWeight(1);
    for (let i = 20; i < panelHeight + 20; i += 4) {
        line(panelX, i, panelX + panelWidth, i);
    }
    
    // Terminal header section
    fill(0, 0, 0);
    noStroke();
    rect(panelX, 20, panelWidth, 65);
    
    // Header border
    stroke(160, 160, 160);
    strokeWeight(1);
    line(panelX, 20, panelX + panelWidth, 20);
    line(panelX, 85, panelX + panelWidth, 85);
    
    // Terminal header text with ASCII art
    fill(200, 200, 200); // Light gray text instead of bright green
    textAlign(LEFT, CENTER);
    textSize(14);
    textFont('Courier New'); // Monospace font
    textStyle(BOLD);
    text('> BLOB_DYNAMICS.EXE', panelX + 10, 35); // Adjusted position
    
    textSize(9); // Reduced font size
    textStyle(NORMAL);
    const maxBlobs = config.maxBlobCount || 500;
    text(`[SYSTEM] ${blobs.length}/${maxBlobs} ENTITIES | ${teams.filter(t => t.members.length > 0).length} GROUPS`, panelX + 10, 50);
    text(`[STATUS] ${teams.filter(t => t.isInCombat).length} HOSTILE | RES:${windowWidth}x${windowHeight}`, panelX + 10, 62);
    text('━'.repeat(Math.floor(panelWidth/8)), panelX + 10, 75);
    
    // Scrollable content area
    const contentY = 90;
    
    // Create clipping mask for scrollable area
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(panelX, contentY, panelWidth, actualContentHeight);
    drawingContext.clip();
    
    // Sort teams by strength for better display (reuse the already calculated sortedTeams)
    
    let yPos = contentY - scrollOffset;
    
    sortedTeams.forEach((team, index) => {
        // Only render if visible
        if (yPos + itemHeight > contentY && yPos < contentY + actualContentHeight) {
            drawTerminalTeamCard(team, panelX + 5, yPos, panelWidth - 10, itemHeight - 5);
        }
        yPos += itemHeight;
    });
    
    // Calculate max scroll - ensure proper scrolling with limited height
    maxScroll = Math.max(0, (sortedTeams.length * itemHeight) - actualContentHeight);
    
    drawingContext.restore();
    
    // Terminal-style scroll indicator - always show if content overflows
    if (maxScroll > 0) {
        const totalContentHeight = sortedTeams.length * itemHeight;
        const scrollBarHeight = Math.max(20, (actualContentHeight / totalContentHeight) * actualContentHeight);
        const scrollBarY = contentY + (scrollOffset / maxScroll) * (actualContentHeight - scrollBarHeight);
        
        // ASCII scroll bar
        stroke(120, 120, 120, 100);
        strokeWeight(1);
        line(panelX + panelWidth - 6, contentY, panelX + panelWidth - 6, contentY + actualContentHeight);
        
        stroke(180, 180, 180);
        strokeWeight(3);
        line(panelX + panelWidth - 6, scrollBarY, panelX + panelWidth - 6, scrollBarY + scrollBarHeight);
    }
    
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
    const panelWidth = PANEL_WIDTH;
    const y = 20; // Same vertical offset as terminal panel
    
    // Calculate responsive height - smaller than before
    const bottomMargin = 100; // Space for buttons and margins
    const maxAvailableHeight = windowHeight - y - bottomMargin;
    const panelHeight = Math.min(300, Math.max(200, maxAvailableHeight)); // Between 200-300px, smaller max
    
    // Find position of help panel in array and calculate its x position
    const panelIndex = panelArray.findIndex(panel => panel.type === 'help');
    if (panelIndex === -1) return; // Panel not in array, shouldn't draw
    
    const x = calculatePanelPosition(panelIndex);
    
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
/**
 * Handle key presses
 */
function keyPressed() {
    switch (key) {
        case ' ':
            showStats = !showStats;
            if (showStats) {
                addPanelToArray('stats');
            } else {
                removePanelFromArray('stats');
            }
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
            break;
        case 'c':
        case 'C':
            showTeamCircles = !showTeamCircles;
            blobs.forEach(blob => blob.showTeamCircles = showTeamCircles);
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
            
            if (showInstructions) {
                addPanelToArray('help');
            } else {
                removePanelFromArray('help');
            }
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
            
            // Create new blobs to replace dead ones, but respect maximum limit
            const maxBlobs = config.maxBlobCount || 500;
            const currentBlobCount = blobs.length;
            const blobsToCreate = Math.min(totalDeadBlobs, maxBlobs - currentBlobCount);
            
            if (blobsToCreate > 0) {
                console.log(`✨ Creating ${blobsToCreate} new blobs to replace dead teams (max: ${maxBlobs})...`);
                for (let i = 0; i < blobsToCreate; i++) {
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
            } else {
                console.log(`❌ Cannot create replacement blobs: Maximum limit of ${maxBlobs} reached`);
            }
            
            const finalBlobCount = blobs.length;
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
    // Check maximum blob count limit
    const maxBlobs = config.maxBlobCount || 500;
    if (blobs.length >= maxBlobs) {
        console.log(`❌ Cannot add new blob: Maximum limit of ${maxBlobs} reached`);
        return;
    }
    
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

// Mouse wheel scrolling for stats panel
function mouseWheel(event) {
    // Check if mouse is over any panel area for horizontal scrolling
    if (panelArray.length > 0) {
        const leftmostPanelX = calculatePanelPosition(0);
        const rightmostPanelX = calculatePanelPosition(panelArray.length - 1) + PANEL_WIDTH;
        
        // If mouse is in the panel area (with some tolerance) and panels extend beyond screen
        if (mouseY >= 20 && mouseY <= windowHeight - 120 && // In panel vertical range
            (leftmostPanelX < 0 || rightmostPanelX > windowWidth)) { // Panels overflow
            
            // Horizontal scroll for panels 
            // Scroll down = increase offset = move panels right = reveal left content
            // Scroll up = decrease offset = move panels left = reveal right content
            horizontalScrollOffset += event.delta * 30; 
            clampHorizontalScroll();
            return false; // Prevent page scrolling
        }
    }
    
    // Vertical scroll for stats panel content (existing functionality)
    const statsPanel = panelArray.find(panel => panel.type === 'stats');
    if (statsPanel && showStats) {
        const statsPanelIndex = panelArray.findIndex(panel => panel.type === 'stats');
        const statsPanelX = calculatePanelPosition(statsPanelIndex);
        
        if (mouseX > statsPanelX && mouseX < statsPanelX + PANEL_WIDTH &&
            mouseY >= 20 && mouseY <= windowHeight - 120) {
            // Scroll in stats panel content
            scrollOffset += event.delta * 3;
            scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
            return false; // Prevent page scrolling
        }
    }
}

/**
 * Panel Array Management System
 */
function addPanelToArray(panelType) {
    // Remove panel if it already exists
    removePanelFromArray(panelType);
    
    // Add new panel to the beginning of array (leftmost position)
    panelArray.unshift({
        type: panelType,
        addedTime: millis()
    });
    
    // Adjust scroll if needed to keep panels visible
    clampHorizontalScroll();
    
    console.log(`Added ${panelType} panel. Array:`, panelArray.map(p => p.type));
}

function removePanelFromArray(panelType) {
    const index = panelArray.findIndex(panel => panel.type === panelType);
    if (index !== -1) {
        panelArray.splice(index, 1);
        
        // Adjust scroll when panels are removed
        clampHorizontalScroll();
        
        console.log(`Removed ${panelType} panel. Array:`, panelArray.map(p => p.type));
    }
}

function calculatePanelPosition(panelIndex) {
    // Calculate position from right side with proper margin and horizontal scroll
    const rightMargin = 20; // Same margin as used for top positioning
    const panelsFromRight = panelArray.length - 1 - panelIndex;
    const baseX = windowWidth - rightMargin - PANEL_WIDTH - (panelsFromRight * (PANEL_WIDTH + PANEL_SPACING));
    
    // Apply horizontal scroll offset (positive scroll moves panels right to reveal left-side content)
    const x = baseX + horizontalScrollOffset;
    return x;
}

function getTotalPanelsWidth() {
    if (panelArray.length === 0) return 0;
    return (PANEL_WIDTH * panelArray.length) + (PANEL_SPACING * (panelArray.length - 1));
}

function getMaxHorizontalScroll() {
    const totalWidth = getTotalPanelsWidth();
    const availableWidth = windowWidth - 40; // 20px margin on each side
    return Math.max(0, totalWidth - availableWidth);
}

function clampHorizontalScroll() {
    const maxScroll = getMaxHorizontalScroll();
    // Horizontal scroll should be between 0 (no scroll) and +maxScroll (scroll right to show left panels)
    horizontalScrollOffset = Math.max(0, Math.min(maxScroll, horizontalScrollOffset));
}