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

class Game {
    constructor() {
        this.app = null;
        this.player = null;
        this.platforms = []; // Array to hold all platforms
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
        
        // Add canvas to the game container
        document.getElementById('gameContainer').appendChild(this.app.canvas);
        
        // Set up keyboard input
        this.setupInput();
        
        // Create game objects
        this.createPlayer();
        this.createPlatforms();
        this.createGround();
        
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
                playerBounds.y + playerBounds.height > platformBounds.y &&
                this.player.vy > 0) { // Only interact when falling
                
                // Let the platform handle the collision
                platform.onPlayerCollision(this.player);
                
                // Break after first collision to avoid multiple interactions per frame
                break;
            }
        }
    }
    
    resetPlayer() {
        this.player.x = 100;
        this.player.y = 100;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.onGround = false;
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
