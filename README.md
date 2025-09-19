# Blob Simulation

## Project Overview

This is an interactive generative art piece featuring autonomous blob entities that form dynamic teams, engage in emergent behaviors, and create an ever-evolving visual ecosystem. The simulation explores themes of cooperation, competition, leadership, and collective behavior through algorithmic agents that make real-time decisions about alliances and conflicts.

## Creative Vision

### Artistic Concept
The blob simulation represents a digital ecosystem where simple entities exhibit complex emergent behaviors through local interactions. Each blob operates as an autonomous agent with unique characteristics (leadership, strength, aggression) that drive their decision-making processes. The visual outcome is a constantly changing landscape of colorful entities forming alliances, engaging in conflicts, and adapting to their environment.

### Generative Elements
- **Emergent Team Formation**: Individual blobs autonomously decide to cooperate or compete based on their intrinsic properties
- **Dynamic Color Harmonization**: Teams develop visual cohesion through synchronized color palettes
- **Procedural Combat System**: Strength-based interactions with random elements create unpredictable outcomes
- **Adaptive Leadership**: Teams dynamically select leaders based on leadership values, affecting movement patterns
- **Life Cycle Management**: Teams age, evolve, split through rebellion, and eventually dissolve, ensuring constant turnover

### Responsive Design Features
- **Conditional Formation Scaling**: Team formations adapt from linear arrangements (small teams) to circular patterns (medium teams) to double-circle structures (large teams)
- **Canvas-Responsive Movement**: Blob movement boundaries and wrapping behavior adjust automatically to any screen resolution
- **Population Density Management**: Simulation maintains optimal blob density regardless of canvas size, with configurable maximum limits

### Display Specifications
- Works seamlessly at any aspect ratio from mobile screens to large displays
- Responsive to screen resolution with automatic canvas sizing
- Optimized for digital-only output with no input required for core functionality
- Performance scaling based on available screen real estate

## Technical Implementation

### Core System Architecture
The simulation implements an object-oriented design with two primary classes:

- **Blob Class**: Individual entities with autonomous behavior, featuring:
  - Steering behaviors (seek, wander, separation, cohesion, formation)
  - Interaction system for cooperation/combat decisions  
  - Visual rendering with personal colors and status indicators
  
- **Team Class**: Collective entities managing group behavior:
  - Dynamic leadership selection based on blob attributes
  - Life/health system affecting team survival
  - Combat coordination and formation management
  - Rebellion and splitting mechanisms for large teams

### Generative Color System
Uses a high-contrast palette with intelligent color assignment:
- 20 predefined high-contrast colors for maximum visual distinction
- Team color harmonization when blobs form alliances
- Leader crown indicators with pulsing gold animations
- Combat glow effects and formation connection lines

### Emergent Behaviors
- **Cooperation Probability**: Inversely related to team aggression levels
- **Combat Outcomes**: Strength-based with random elements and team size modifiers
- **Team Rebellions**: High-aggression teams spontaneously split into factions
- **Life Cycle Events**: Random positive/negative events affect team health and behavior

## Installation & Usage

### Requirements
- Modern web browser with JavaScript enabled (Chrome, Firefox, Safari)
- Node.js and npm (for development server)
- No external dependencies - uses local p5.js library for offline capability

### Quick Start
```bash
# Clone or download the project
cd blob-simulation

# Install dependencies
npm install

# Start development server
npm start
```

The simulation will be available at `http://localhost:8080`

### Development Server Script
For automated setup with browser launching:
```bash
# Make script executable
chmod +x run-blob-dev.sh

# Run development environment
./run-blob-dev.sh
```

This script automatically:
- Installs Node.js if not present
- Installs npm dependencies
- Starts the server on port 8080
- Launches browser in kiosk mode for full-screen experience

### Configuration Options
Edit `config.json` to customize simulation parameters:

```json
{
    "initialBlobCount": 200,        // Starting number of blobs
    "maxBlobCount": 500,            // Maximum population limit
    "teamMaxSizeMin": 6,            // Minimum team capacity
    "teamMaxSizeMax": 14,           // Maximum team capacity
    "teamStartAggression": {        // Initial aggression range
        "min": 10, 
        "max": 50 
    },
    "combat": {                     // Combat damage parameters
        "baseDamage": 8, 
        "strengthDivisor": 8, 
        "randomDamageRange": 6 
    },
    "winnerLifeGain": 0.4,          // Life gained by combat winners
    "teamSizeProtection": 0.05,     // Protection from team size
    "largePenaltyThreshold": 6,     // Size threshold for penalties
    "largePenaltyRate": 0.15        // Extra damage for large teams
}
```

### Interactive Controls
- **[Space]** - Toggle statistics terminal panel
- **[V]** - Toggle individual direction arrows
- **[C]** - Toggle team formation circles
- **[H]** - Toggle help/instructions panel
- **[R]** - Reset simulation with new random populations
- **[D]** - Toggle debug information overlay
- **[F]** - Toggle fullscreen mode
- **Mouse Click** - Add new blob at cursor position
- **Shift + Click** - Remove nearest blob (debugging)
- **Mouse Wheel** - Scroll through statistics or panels

## File Structure
```
├── index.html              # Main HTML entry point
├── sketch.js               # Core p5.js simulation logic
├── p5.js                   # Local p5.js library (v1.7.0)
├── config.json             # Configurable simulation parameters
├── package.json            # Node.js dependencies and scripts
├── run-blob-dev.sh         # Automated development setup script
├── src/
│   ├── Blob.js            # Individual blob entity class
│   └── Team.js            # Team collective behavior class
└── README.md              # This documentation
```