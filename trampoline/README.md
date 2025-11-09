# Trampoline Game Prototype

A simple game mechanics prototype built with Pixi.js featuring a player character that can jump and bounce on a trampoline.

## Features

- Player movement with arrow keys or WASD
- Physics-based jumping and gravity
- Trampoline bouncing mechanics
- FPS counter
- Responsive design

## Controls

- **Movement**: Arrow keys or WASD
- **Jump**: Spacebar, W, or Up arrow
- The player will bounce higher when landing on the trampoline

## Running the Game

### Local Development
1. Clone this repository
2. Open `index.html` in a modern web browser
3. No build process required - everything runs client-side

### GitHub Pages Setup

To publish this game on GitHub Pages:

1. Push this code to a GitHub repository
2. Go to your repository's Settings
3. Scroll to "Pages" section
4. Under "Source", select "Deploy from a branch"
5. Choose "main" (or "master") branch
6. Select "/ (root)" as the folder
7. Click "Save"

Your game will be available at: `https://[your-username].github.io/[repository-name]/`

## Development Notes

- Uses Pixi.js from CDN for easy deployment
- All game logic is in `game.js`
- Modular structure makes it easy to add new mechanics
- Utility functions included for common game development tasks

## Adding New Features

The code is structured to make it easy to add new game mechanics:

1. **New Objects**: Create them in the `init()` method
2. **Physics**: Add new behaviors in `updatePhysics()`
3. **Input**: Extend the `handleInput()` method
4. **Collisions**: Add new collision checks similar to `checkTrampolineCollision()`

## File Structure

```
trampoline/
├── index.html    # Main HTML file
├── game.js       # Game logic and mechanics
└── README.md     # This file
```
