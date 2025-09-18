# P5.js Blob Simulation

An object-oriented blob simulation built with p5.js and npm. Features autonomous blobs with leadership and strength properties that form teams and exhibit complex movement behaviors.

## Features

### Blob Properties
- **Leadership (1-100)**: Affects steering force and team cohesion behavior
- **Strength (1-100)**: Determines maximum speed and blob size
- **Movement System**: Autonomous navigation with random target selection
- **Team Association**: Blobs can belong to colored teams or remain independent

### Movement Behaviors
- **Seek**: Move towards randomly selected target points
- **Wander**: Natural wandering behavior for organic movement
- **Separation**: Avoid crowding with other blobs
- **Cohesion**: Stay close to team members (leadership-based)
- **Edge Wrapping**: Seamless movement across screen boundaries

### Team System
- **5 Default Teams**: Alpha, Beta, Gamma, Delta, Epsilon
- **Team Colors**: Distinct colors for visual identification
- **Team Statistics**: Average leadership, strength, leaders, etc.
- **Dynamic Membership**: Add/remove blobs from teams

## Getting Started

### Prerequisites
- Node.js and npm installed
- Modern web browser

### Installation
```bash
# Navigate to project directory
cd p5.js

# Install dependencies
npm install

# Start the development server
npm start
```

### Running the Simulation
1. Open your browser to `http://localhost:8080`
2. Watch the blobs move around autonomously
3. Use the interactive controls to modify the simulation

## Controls

| Key/Action | Function |
|------------|----------|
| **Space** | Toggle statistics panel |
| **D** | Toggle debug mode (shows targets and paths) |
| **R** | Reset simulation with new random blobs |
| **F** | Toggle fullscreen mode |
| **Click** | Add new blob at mouse position |
| **Shift+Click** | Remove nearest blob |

## Project Structure

```
p5.js/
├── src/
│   ├── Blob.js          # Main Blob class with movement and properties
│   └── Team.js          # Team management class
├── sketch.js            # Main p5.js sketch and simulation logic
├── index.html           # Web page with canvas and UI
├── package.json         # npm configuration and dependencies
└── README.md           # This file
```

## Architecture

### Object-Oriented Design
- **Blob Class**: Encapsulates individual blob behavior, properties, and rendering
- **Team Class**: Manages groups of blobs with shared properties and statistics
- **Modular Structure**: Separate files for different concerns

### Movement Algorithm
Each blob uses a combination of steering behaviors:
1. **Seek Force** (60%): Direct movement towards target
2. **Wander Force** (20%): Random exploration
3. **Separation Force** (150%): Collision avoidance
4. **Cohesion Force** (Leadership-based): Team coordination

### Visual Indicators
- **Blob Size**: Proportional to strength
- **Team Colors**: Inherited from team assignment
- **Leadership Ring**: Golden ring for high-leadership blobs (>75)
- **Strength Fill**: Inner circle opacity based on strength

## Customization

### Adding New Teams
```javascript
// In sketch.js, modify the initializeTeams function
const teamNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta'];
```

### Adjusting Blob Properties
```javascript
// In Blob.js constructor, modify property ranges
this.leadership = Math.floor(Math.random() * 100) + 1;  // 1-100
this.strength = Math.floor(Math.random() * 100) + 1;    // 1-100
```

### Modifying Movement Behavior
```javascript
// In Blob.js update method, adjust force weights
seekForce.mult(0.6);      // Target seeking strength
wanderForce.mult(0.2);    // Random exploration
separateForce.mult(1.5);  // Collision avoidance
cohesionForce.mult(...);  // Team cohesion (leadership-based)
```

## Performance Notes

- Automatically scales blob count based on screen size for optimal performance
- Optimized for modern hardware with responsive fullscreen support
- Uses efficient vector calculations and force-based movement
- Separation behavior uses spatial optimization for better performance
- Responsive canvas that adapts to window resizing
- UI elements scale with screen size for better readability

## Browser Compatibility

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge

Requires modern JavaScript features (ES6+) and HTML5 Canvas support.

## License

MIT License - feel free to modify and use for your own projects!