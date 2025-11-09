// Trampoline Game Prototype
// Game mechanics prototyping with Pixi.js

// Platform base class
class Platform extends PIXI.Sprite {
    constructor(x, y, type = 'solid') {
        // Create a temporary 1x1 texture to avoid null texture error
        const tempTexture = PIXI.Texture.WHITE;
        super(tempTexture);
        this.x = x;
        this.y = y;
        this.anchor.set(0.5);
        this.platformType = type;
        this.bounceForce = -15; // Default bounce force
        this.originalScale = { x: 1, y: 1 };
        this._graphics = null; // Will store graphics for texture generation
    }
    
    onPlayerCollision(player) {
        // Override in subclasses for specific behavior
        if (this.platformType === 'trampoline') {
            player.vy = this.bounceForce;
            player.y = this.getBounds().y - player.height / 2;
            this.playBounceAnimation();
        } else {
            // Solid platform - stop falling
            player.vy = 0;
            player.y = this.getBounds().y - player.height / 2;
            player.onGround = true;
        }
    }
    
    playBounceAnimation() {
        this.scale.set(1.2, 0.8);
        setTimeout(() => {
            this.scale.set(this.originalScale.x, this.originalScale.y);
        }, 100);
    }
}

// Trampoline class
class Trampoline extends Platform {
    constructor(x, y, bounceForce = -20) {
        super(x, y, 'trampoline');
        this.bounceForce = bounceForce;
        
        // Create graphics for this trampoline
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0x4ECDC4); // Teal color
        graphics.drawRoundedRect(0, 0, 120, 20, 10);
        graphics.endFill();
        this._graphics = graphics;
    }
    
    initTexture(renderer) {
        if (this._graphics) {
            this.texture = renderer.generateTexture(this._graphics);
            this._graphics = null; // Clean up graphics object
        }
    }
}

// Solid Platform class
class SolidPlatform extends Platform {
    constructor(x, y, width = 120, height = 20) {
        super(x, y, 'solid');
        this.platformWidth = width;
        this.platformHeight = height;
        
        // Create graphics for this platform
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0x8B4513); // Brown color
        graphics.drawRect(0, 0, width, height);
        graphics.endFill();
        this._graphics = graphics;
    }
    
    initTexture(renderer) {
        if (this._graphics) {
            this.texture = renderer.generateTexture(this._graphics);
            this._graphics = null; // Clean up graphics object
        }
    }
}

// Star (goal) class
class Star extends Platform {
    constructor(x, y) {
        super(x, y, 'star');
        
        // Create star graphics
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFD700); // Gold color
        // Draw a simple 5-pointed star
        const points = [];
        for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? 15 : 8;
            points.push(Math.cos(angle) * radius + 15, Math.sin(angle) * radius + 15);
        }
        graphics.drawPolygon(points);
        graphics.endFill();
        this._graphics = graphics;
        this.collected = false;
    }
    
    initTexture(renderer) {
        if (this._graphics) {
            this.texture = renderer.generateTexture(this._graphics);
            this._graphics = null;
        }
    }
    
    onPlayerCollision(player) {
        if (!this.collected) {
            this.collected = true;
            this.alpha = 0.5; // Make it semi-transparent when collected
            console.log('Star collected!');
        }
    }
}

// Player Start Position class
class PlayerStart extends Platform {
    constructor(x, y) {
        super(x, y, 'playerStart');
        
        // Create player start marker graphics
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0x00FF00); // Green color
        graphics.drawCircle(15, 15, 12);
        graphics.endFill();
        graphics.beginFill(0xFFFFFF); // White center
        graphics.drawCircle(15, 15, 8);
        graphics.endFill();
        this._graphics = graphics;
    }
    
    initTexture(renderer) {
        if (this._graphics) {
            this.texture = renderer.generateTexture(this._graphics);
            this._graphics = null;
        }
    }
    
    onPlayerCollision(player) {
        // Player start positions don't affect player physics
        return;
    }
}

class Game {
    constructor() {
        this.app = null;
        this.player = null;
        this.platforms = []; // Array to hold all platforms
        this.stars = []; // Array to hold star objects
        this.playerStartPos = { x: 100, y: 100 }; // Default start position
        this.gravity = 0.8;
        this.jumpForce = -15;
        this.keys = {};
        this.lastKeys = {}; // For detecting one-time key presses
        this.gamepad = null;
        this.lastGamepadButtons = {};
        this.gamepadDeadzone = 0.3; // Threshold for analog stick movement
        this.lastTime = 0;
        this.fpsCounter = 0;
        this.fpsTimer = 0;
        this.levelEditor = null;
        
        this.init().catch(console.error);
    }
    
    async init() {
        // Create Pixi application (using async/await for newer Pixi.js versions)
        this.app = new PIXI.Application();
        await this.app.init({
            width: 800,
            height: 600,
            backgroundColor: 0x87CEEB, // Sky blue
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true
        });
        
        // Add canvas to the game area
        document.getElementById('gameArea').appendChild(this.app.canvas);
        
        // Set up keyboard input
        this.setupInput();
        
        // Create game objects
        this.createPlayer();
        this.createPlatforms();
        this.createGround();
        
        // Initialize level editor
        this.levelEditor = new LevelEditor(this);
        await this.levelEditor.setupEditor();
        
        // Start game loop
        this.app.ticker.add(this.gameLoop.bind(this));
        
        console.log('Game initialized!');
    }
    
    setupInput() {
        // Key event listeners
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Gamepad event listeners
        window.addEventListener('gamepadconnected', (e) => {
            console.log(`Gamepad connected: ${e.gamepad.id}`);
            this.gamepad = e.gamepad;
            this.updateGamepadStatus();
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log(`Gamepad disconnected: ${e.gamepad.id}`);
            if (this.gamepad && this.gamepad.index === e.gamepad.index) {
                this.gamepad = null;
                this.updateGamepadStatus();
            }
        });
        
        // Check for already connected gamepads
        this.checkForGamepads();
    }
    
    updateGamepadStatus() {
        const statusElement = document.getElementById('gamepadStatus');
        if (this.gamepad) {
            // Truncate gamepad name if too long
            let name = this.gamepad.id;
            if (name.length > 30) {
                name = name.substring(0, 27) + '...';
            }
            statusElement.textContent = `Gamepad: ${name}`;
        } else {
            statusElement.textContent = 'Gamepad: Not connected';
        }
    }
    
    checkForGamepads() {
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                this.gamepad = gamepads[i];
                console.log(`Found existing gamepad: ${this.gamepad.id}`);
                this.updateGamepadStatus();
                break;
            }
        }
    }
    
    updateGamepadInput() {
        if (!this.gamepad) return;
        
        // Get the latest gamepad state
        const gamepads = navigator.getGamepads();
        this.gamepad = gamepads[this.gamepad.index];
        
        if (!this.gamepad) return;
        
        // Store current button states for edge detection
        const currentButtons = {};
        for (let i = 0; i < this.gamepad.buttons.length; i++) {
            currentButtons[i] = this.gamepad.buttons[i].pressed;
        }
        
        // Handle gamepad input in handleInput method
        this.currentGamepadButtons = currentButtons;
    }
    
    createPlayer() {
        // Create a simple player sprite (colored rectangle)
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFF6B6B); // Red color
        graphics.drawRect(0, 0, 40, 40);
        graphics.endFill();
        
        this.player = new PIXI.Sprite(this.app.renderer.generateTexture(graphics));
        this.player.x = 100;
        this.player.y = 100;
        this.player.anchor.set(0.5);
        
        // Player physics properties
        this.player.vx = 0; // Velocity X
        this.player.vy = 0; // Velocity Y
        this.player.onGround = false;
        this.player.speed = 5;
        
        this.app.stage.addChild(this.player);
    }
    
    createPlatforms() {
        // Create various platforms and trampolines
        
        // Trampolines with different bounce forces
        const trampoline1 = new Trampoline(200, 450, -18);
        const trampoline2 = new Trampoline(400, 350, -25); // Higher bounce
        const trampoline3 = new Trampoline(600, 400, -15); // Lower bounce
        
        // Solid platforms
        const platform1 = new SolidPlatform(150, 300, 100, 15);
        const platform2 = new SolidPlatform(500, 250, 150, 15);
        const platform3 = new SolidPlatform(300, 200, 80, 15);
        
        // Initialize textures and add to platforms array
        this.platforms = [trampoline1, trampoline2, trampoline3, platform1, platform2, platform3];
        
        this.platforms.forEach(platform => {
            platform.initTexture(this.app.renderer);
            this.app.stage.addChild(platform);
        });
        
        console.log(`Created ${this.platforms.length} platforms`);
    }
    
    // Method to add a new platform at runtime
    addPlatform(platform) {
        platform.initTexture(this.app.renderer);
        this.platforms.push(platform);
        this.app.stage.addChild(platform);
    }
    
    // Method to remove a platform at runtime
    removePlatform(index) {
        if (index >= 0 && index < this.platforms.length) {
            const platform = this.platforms[index];
            this.app.stage.removeChild(platform);
            this.platforms.splice(index, 1);
            return platform;
        }
        return null;
    }
    
    // Method to remove platform by reference
    removePlatformByRef(platform) {
        const index = this.platforms.indexOf(platform);
        if (index !== -1) {
            return this.removePlatform(index);
        }
        return null;
    }
    
    createGround() {
        // Create ground
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0x45B7D1); // Blue ground
        graphics.drawRect(0, 0, this.app.screen.width, 100);
        graphics.endFill();
        
        this.ground = new PIXI.Sprite(this.app.renderer.generateTexture(graphics));
        this.ground.y = this.app.screen.height - 100;
        
        this.app.stage.addChild(this.ground);
    }
    
    handleInput() {
        // Update gamepad state
        this.updateGamepadInput();
        
        // Get input states from both keyboard and gamepad
        const moveLeft = this.keys['KeyA'] || this.keys['ArrowLeft'] || this.getGamepadAxisLeft();
        const moveRight = this.keys['KeyD'] || this.keys['ArrowRight'] || this.getGamepadAxisRight();
        const jump = (this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['Space'] || this.getGamepadJump()) && this.player.onGround;
        
        // Horizontal movement
        if (moveLeft) {
            this.player.vx = -this.player.speed;
        } else if (moveRight) {
            this.player.vx = this.player.speed;
        } else {
            this.player.vx *= 0.8; // Friction
        }
        
        // Jump
        if (jump) {
            this.player.vy = this.jumpForce;
            this.player.onGround = false;
        }
        
        // Platform manipulation (one-time key presses)
        this.handlePlatformControls();
    }
    
    getGamepadAxisLeft() {
        if (!this.gamepad) return false;
        const leftStickX = this.gamepad.axes[0];
        const dpadLeft = this.gamepad.buttons[14]?.pressed;
        return leftStickX < -this.gamepadDeadzone || dpadLeft;
    }
    
    getGamepadAxisRight() {
        if (!this.gamepad) return false;
        const leftStickX = this.gamepad.axes[0];
        const dpadRight = this.gamepad.buttons[15]?.pressed;
        return leftStickX > this.gamepadDeadzone || dpadRight;
    }
    
    getGamepadJump() {
        if (!this.gamepad) return false;
        // A button (0), B button (1), or dpad up (12)
        return this.gamepad.buttons[0]?.pressed || 
               this.gamepad.buttons[1]?.pressed || 
               this.gamepad.buttons[12]?.pressed;
    }
    
    handlePlatformControls() {
        // Get gamepad button states for one-time presses
        const addTrampolinePressed = (this.keys['KeyT'] && !this.lastKeys['KeyT']) || 
                                   this.getGamepadButtonPressed(2); // X button
        const addPlatformPressed = (this.keys['KeyP'] && !this.lastKeys['KeyP']) || 
                                 this.getGamepadButtonPressed(3); // Y button
        const removePlatformPressed = (this.keys['KeyR'] && !this.lastKeys['KeyR']) || 
                                    this.getGamepadButtonPressed(4) || // Left bumper
                                    this.getGamepadButtonPressed(5);   // Right bumper
        
        // Add trampoline at random position
        if (addTrampolinePressed) {
            const x = Utils.random(100, this.app.screen.width - 100);
            const y = Utils.random(150, this.app.screen.height - 150);
            const bounceForce = Utils.random(-15, -30);
            this.addPlatform(new Trampoline(x, y, bounceForce));
            console.log(`Added trampoline at (${Math.round(x)}, ${Math.round(y)}) with bounce force ${bounceForce}`);
        }
        
        // Add solid platform at random position
        if (addPlatformPressed) {
            const x = Utils.random(100, this.app.screen.width - 100);
            const y = Utils.random(150, this.app.screen.height - 150);
            const width = Utils.random(80, 150);
            this.addPlatform(new SolidPlatform(x, y, width, 15));
            console.log(`Added solid platform at (${Math.round(x)}, ${Math.round(y)}) with width ${Math.round(width)}`);
        }
        
        // Remove last added platform
        if (removePlatformPressed) {
            if (this.platforms.length > 0) {
                const removed = this.removePlatform(this.platforms.length - 1);
                console.log(`Removed platform: ${removed?.platformType}`);
            }
        }
        
        // Toggle level editor
        const toggleEditorPressed = (this.keys['KeyE'] && !this.lastKeys['KeyE']) ||
                                   this.getGamepadButtonPressed(8); // Select button
        
        if (toggleEditorPressed) {
            this.levelEditor.toggle();
        }
        
        // Store current key states for next frame
        this.lastKeys = { ...this.keys };
        this.lastGamepadButtons = { ...this.currentGamepadButtons };
    }
    
    getGamepadButtonPressed(buttonIndex) {
        if (!this.gamepad || !this.currentGamepadButtons) return false;
        return this.currentGamepadButtons[buttonIndex] && !this.lastGamepadButtons[buttonIndex];
    }
    
    updatePhysics() {
        // Apply gravity
        this.player.vy += this.gravity;
        
        // Update position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Platform collisions
        this.checkPlatformCollisions();
        
        // Ground collision
        const groundY = this.app.screen.height - 100 - this.player.height / 2;
        if (this.player.y >= groundY) {
            this.player.y = groundY;
            this.player.vy = 0;
            this.player.onGround = true;
        }
        
        // Screen boundaries
        if (this.player.x < this.player.width / 2) {
            this.player.x = this.player.width / 2;
        } else if (this.player.x > this.app.screen.width - this.player.width / 2) {
            this.player.x = this.app.screen.width - this.player.width / 2;
        }
        
        // Reset if player falls off screen
        if (this.player.y > this.app.screen.height + 100) {
            this.resetPlayer();
        }
    }
    
    checkPlatformCollisions() {
        const playerBounds = this.player.getBounds();
        
        // Check collision with each platform
        for (let platform of this.platforms) {
            const platformBounds = platform.getBounds();
            
            // AABB collision detection
            if (playerBounds.x < platformBounds.x + platformBounds.width &&
                playerBounds.x + playerBounds.width > platformBounds.x &&
                playerBounds.y < platformBounds.y + platformBounds.height &&
                playerBounds.y + playerBounds.height > platformBounds.y) {
                
                // Special handling for different platform types
                if (platform.platformType === 'star') {
                    // Stars are always collected on contact
                    platform.onPlayerCollision(this.player);
                } else if (platform.platformType === 'playerStart') {
                    // Player start positions don't affect physics
                    continue;
                } else if (this.player.vy > 0) {
                    // Only interact with solid platforms/trampolines when falling
                    platform.onPlayerCollision(this.player);
                    break; // Break after first solid collision
                }
            }
        }
    }
    
    resetPlayer() {
        // Find player start position or use default
        const startPos = this.platforms.find(p => p.platformType === 'playerStart');
        if (startPos) {
            this.player.x = startPos.x;
            this.player.y = startPos.y;
        } else {
            this.player.x = this.playerStartPos.x;
            this.player.y = this.playerStartPos.y;
        }
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.onGround = false;
        
        // Reset all stars
        this.platforms.forEach(platform => {
            if (platform.platformType === 'star') {
                platform.collected = false;
                platform.alpha = 1.0;
            }
        });
    }
    
    updateFPS(deltaTime) {
        this.fpsTimer += deltaTime;
        this.fpsCounter++;
        
        if (this.fpsTimer >= 1000) { // Update every second
            const fps = Math.round(this.fpsCounter * 1000 / this.fpsTimer);
            document.getElementById('fps').textContent = `FPS: ${fps}`;
            this.fpsTimer = 0;
            this.fpsCounter = 0;
        }
    }
    
    gameLoop(deltaTime) {
        // Convert deltaTime from frames to milliseconds
        const dt = deltaTime * 16.67; // Approximate 60fps
        
        this.handleInput();
        this.updatePhysics();
        this.updateFPS(dt);
    }
}

// Initialize game when page loads
window.addEventListener('load', async () => {
    try {
        new Game();
    } catch (error) {
        console.error('Failed to initialize game:', error);
    }
});

// Utility functions for future expansion
const Utils = {
    // Distance between two points
    distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    },
    
    // Random number between min and max
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    // Clamp value between min and max
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    // Linear interpolation
    lerp(start, end, t) {
        return start + t * (end - start);
    }
};

// Level Editor class
class LevelEditor {
    constructor(game) {
        this.game = game;
        this.isEnabled = false;
        this.selectedTool = 'platform';
        this.paletteApp = null;
        this.paletteContainer = null;
        this.tools = {
            'platform': { name: 'Platform', color: 0x8B4513, class: SolidPlatform },
            'trampoline': { name: 'Trampoline', color: 0x4ECDC4, class: Trampoline },
            'star': { name: 'Star', color: 0xFFD700, class: Star },
            'playerStart': { name: 'Start', color: 0x00FF00, class: PlayerStart },
            'erase': { name: 'Erase', color: 0xFF0000, class: null }
        };
        // setupEditor will be called async from Game.init()
    }
    
    async setupEditor() {
        await this.createPaletteCanvas();
        this.setupMouseEvents();
    }
    
    async createPaletteCanvas() {
        // Create separate Pixi application for palette
        this.paletteApp = new PIXI.Application();
        await this.paletteApp.init({
            width: 140,
            height: 600,
            backgroundColor: 0x333333,
            antialias: true
        });
        
        // Add palette canvas to container
        this.paletteContainer = document.getElementById('paletteContainer');
        this.paletteContainer.appendChild(this.paletteApp.canvas);
        
        // Create tool buttons
        this.createToolButtons();
        
        // Start hidden
        this.paletteContainer.style.display = 'none';
    }
    
    createToolButtons() {
        let yOffset = 10;
        Object.keys(this.tools).forEach((toolKey, index) => {
            const tool = this.tools[toolKey];
            const button = this.createToolButton(toolKey, tool, yOffset);
            this.paletteApp.stage.addChild(button);
            yOffset += 60;
        });
    }
    
    createToolButton(toolKey, tool, yOffset) {
        const button = new PIXI.Container();
        button.x = 10;
        button.y = yOffset;
        button.interactive = true;
        button.cursor = 'pointer';
        
        // Button background
        const bg = new PIXI.Graphics();
        bg.beginFill(toolKey === this.selectedTool ? 0x666666 : 0x444444);
        bg.drawRoundedRect(0, 0, 120, 50, 5);
        bg.endFill();
        button.addChild(bg);
        
        // Tool icon
        const icon = new PIXI.Graphics();
        if (toolKey === 'erase') {
            // Draw X for erase tool
            icon.lineStyle(3, tool.color);
            icon.moveTo(10, 10);
            icon.lineTo(30, 30);
            icon.moveTo(30, 10);
            icon.lineTo(10, 30);
        } else {
            // Draw simple shape for other tools
            icon.beginFill(tool.color);
            if (toolKey === 'star') {
                const points = [];
                for (let i = 0; i < 10; i++) {
                    const angle = (i * Math.PI) / 5;
                    const radius = i % 2 === 0 ? 8 : 4;
                    points.push(Math.cos(angle) * radius + 20, Math.sin(angle) * radius + 20);
                }
                icon.drawPolygon(points);
            } else if (toolKey === 'playerStart') {
                icon.drawCircle(20, 20, 8);
            } else {
                icon.drawRoundedRect(10, 15, 20, 10, 2);
            }
            icon.endFill();
        }
        button.addChild(icon);
        
        // Tool label
        const text = new PIXI.Text(tool.name, {
            fontSize: 12,
            fill: 0xFFFFFF,
            fontFamily: 'Arial'
        });
        text.x = 45;
        text.y = 20;
        button.addChild(text);
        
        // Click handler
        button.on('pointerdown', () => {
            this.selectTool(toolKey);
        });
        
        button.toolKey = toolKey;
        button.bg = bg;
        
        return button;
    }
    
    selectTool(toolKey) {
        this.selectedTool = toolKey;
        this.updatePaletteSelection();
    }
    
    updatePaletteSelection() {
        this.paletteApp.stage.children.forEach(child => {
            if (child.toolKey) {
                child.bg.clear();
                child.bg.beginFill(child.toolKey === this.selectedTool ? 0x666666 : 0x444444);
                child.bg.drawRoundedRect(0, 0, 120, 50, 5);
                child.bg.endFill();
            }
        });
    }
    
    setupMouseEvents() {
        this.game.app.canvas.addEventListener('click', (e) => {
            if (this.isEnabled) {
                this.handleCanvasClick(e);
            }
        });
    }
    
    handleCanvasClick(e) {
        const rect = this.game.app.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // No restrictions now - can place anywhere on the game canvas
        if (this.selectedTool === 'erase') {
            this.eraseAtPosition(x, y);
        } else {
            this.placeObject(x, y, this.selectedTool);
        }
    }
    
    placeObject(x, y, toolType) {
        const tool = this.tools[toolType];
        if (!tool || !tool.class) return;
        
        let newObject;
        if (toolType === 'platform') {
            newObject = new tool.class(x, y, 100, 15);
        } else if (toolType === 'trampoline') {
            newObject = new tool.class(x, y, -20);
        } else if (toolType === 'playerStart') {
            // Remove existing player start positions
            this.game.platforms = this.game.platforms.filter(platform => {
                if (platform.platformType === 'playerStart') {
                    this.game.app.stage.removeChild(platform);
                    return false;
                }
                return true;
            });
            newObject = new tool.class(x, y);
        } else {
            newObject = new tool.class(x, y);
        }
        
        this.game.addPlatform(newObject);
    }
    
    eraseAtPosition(x, y) {
        const clickBounds = new PIXI.Rectangle(x - 5, y - 5, 10, 10);
        
        for (let i = this.game.platforms.length - 1; i >= 0; i--) {
            const platform = this.game.platforms[i];
            const bounds = platform.getBounds();
            
            if (clickBounds.intersects(bounds)) {
                this.game.removePlatform(i);
                break; // Only remove one object per click
            }
        }
    }
    
    toggle() {
        this.isEnabled = !this.isEnabled;
        this.paletteContainer.style.display = this.isEnabled ? 'block' : 'none';
        console.log(`Level editor ${this.isEnabled ? 'enabled' : 'disabled'}`);
    }
}
