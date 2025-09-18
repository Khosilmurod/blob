# Blob Simulation - Generative Art Installation

## Project Overview

[Brief description of your generative art piece and artistic vision]

## Technical Implementation

### Generative Elements
- [Describe what makes this art generative]
- [Explain the algorithmic/procedural aspects]
- [Detail the emergent behaviors]

### Responsive Design Features
- **Conditional 1**: [Describe first conditional based on screen size/resolution]
- **Conditional 2**: [Describe second conditional based on display parameters]
- **Aspect Ratio Handling**: [Explain how the work adapts to different aspect ratios]

### Display Specifications
- Works correctly at any aspect ratio
- Responsive to screen resolution and canvas size
- No input required (digital output only)

## Installation & Usage

### Requirements
- Modern web browser with JavaScript enabled
- No external dependencies (uses local p5.js file)

### Local Installation
```bash
# Clone the repository
git clone [repository-url]

# Navigate to project directory
cd p5.js

# Start local server
npm start
# OR
npx serve . -p 8080
```

### Raspberry Pi Installation
```bash
# TODO: Add Raspberry Pi specific setup instructions
# - Auto-start on boot configuration
# - Full screen display setup
# - System requirements
```

### Controls
- [V] - Toggle direction arrows
- [C] - Toggle configuration panel
- [Space] - Toggle terminal visibility
- [Additional controls as needed]

## Creative Vision

### Artistic Concept
[Describe your artistic vision and what you're trying to express]

### Specialization for Display Space
[Explain how this work is specialized for the installation space]
[Describe creative decisions made for the physical context]

### Technical Challenges & Solutions
[Document technical issues encountered and how they were resolved]
[Include insights that would help other artists working in similar spaces]

## Documentation

### Video Documentation
- **Main Installation Video**: [TODO: Add video link]
- **Process Documentation**: [TODO: Add additional video links as needed]

### Blog Post
- **Portfolio Link**: [TODO: Add link to blog post]

## Technical Details

### File Structure
```
├── index.html          # Main application entry point
├── sketch.js           # Main p5.js simulation logic
├── p5.js              # Local p5.js library (offline capability)
├── config.json        # Configuration parameters
├── src/
│   ├── Team.js        # Team class implementation
│   └── Blob.js        # Blob class implementation
├── assets/            # Audio and visual assets
└── README.md          # This file
```

### Configuration Parameters
[List key configuration options available in config.json]
- Initial blob count
- Team dynamics settings
- Visual parameters
- Performance settings

## Development Notes

### Technology Stack
- p5.js for graphics and animation
- HTML5 Canvas for rendering
- JavaScript ES6+ features
- Local file serving (no CDN dependencies)

### Performance Considerations
- [Note any performance optimizations]
- [Scaling behavior for different screen sizes]
- [Resource usage considerations]

## Future Enhancements

- [ ] [TODO: List potential improvements]
- [ ] [TODO: Additional features to implement]
- [ ] [TODO: Performance optimizations]

## Credits

**Artist**: [Your Name]
**Course**: [Course Name/Number]
**Institution**: [Institution Name]
**Date**: [Project Date]

## License

[Specify license if applicable]

---

*This generative art installation was created as part of Module 1: Generative Art assignment, designed to work on any canvas while meeting the technical constraints of digital-only output and responsive display adaptation.*