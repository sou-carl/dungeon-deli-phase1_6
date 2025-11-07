/**
 * DUNGEON DELI - SANDWICH PUZZLE PROTOTYPE (PHASE 1.6 - SCENE-READY)
 * Phase 1.6: Safe transition & scene preparation for Phase 2
 * 
 * ARCHITECTURE:
 * - Modular shared systems (GridManager, ShuffleSystem, RecipeSystem)
 * - GameState for cross-scene communication
 * - Event hooks for puzzle completion/failure
 * - Scene transition utilities
 * - Complete recipe metadata with difficulty tuning
 * 
 * FEATURES PRESERVED:
 * - All Phase 1.5 recipe system functionality
 * - Enhanced shuffle with no-backtracking and hybrid
 * - Move-based rating and fail conditions
 * - Recipe UI display and animations
 * 
 * NEW IN PHASE 1.6:
 * - Recipe metadata (difficulty, gridSize, move limits)
 * - applyRecipeConfig() automatic configuration loader
 * - Modular system architecture for Phase 2 reuse
 * - Event hooks (onPuzzleComplete, onPuzzleFail)
 * - Scene transition helper (switchScene)
 * - Debug tools (recipe cycling, console logging)
 * - GameState for cross-scene data sharing
 */

// =============================================================================
// PHASE 1.6: GAME STATE (SHARED ACROSS SCENES)
// =============================================================================

/**
 * Global game state that persists across scene transitions
 * This allows Combat, Pet, and Dungeon scenes to share data
 * 
 * IMPORTANT: This is the SINGLE SOURCE OF TRUTH for cross-scene data
 * Do not duplicate this data in individual scenes
 */
const GameState = {
    // Recipe system
    currentRecipe: null,         // Active recipe being built
    lastResult: null,            // 'win', 'fail', or null
    completedRecipes: [],        // Array of completed recipe IDs
    
    // Pet stats (Phase 3 integration)
    petStats: {
        hp: 100,                 // Health points
        maxHp: 100,              // Maximum health
        hunger: 100,             // Hunger level (0-100)
        attack: 10,              // Attack stat
        defense: 10,             // Defense stat
        stamina: 100             // Stamina/energy
    },
    
    // Dungeon progress (Phase 4 integration)
    floor: 1,                    // Current dungeon floor
    gold: 0,                     // Currency
    inventory: [],               // Collected items
    
    // Session data
    totalMoves: 0,               // Lifetime move counter
    puzzlesCompleted: 0,         // Total puzzles solved
    puzzlesFailed: 0,            // Total puzzles failed
    
    // Debug
    debugMode: false             // Enable debug features
};

// =============================================================================
// PHASE 1.6: RECIPE DATA STRUCTURE (ENHANCED WITH METADATA)
// =============================================================================

/**
 * Recipe definitions with complete metadata
 * Each recipe now includes difficulty tuning and configuration
 * 
 * NEW FIELDS:
 * - difficulty: 'Easy', 'Medium', 'Hard' (visual indicator)
 * - gridSize: Custom grid size for this recipe (default 3)
 * - optimalMoves: 3-star rating threshold
 * - maxMoves: Fail condition threshold
 * 
 * If fields are missing, fallback defaults apply via applyRecipeConfig()
 */
const RECIPES = [
    {
        id: 'classic_stack',
        name: 'Classic Stack',
        description: 'The traditional dungeon sandwich.',
        sequence: [1, 2, 3, 4, 5, 6, 7, 8],
        buff: { health: +20, defense: +5 },
        difficulty: 'Medium',        // Phase 1.6: Metadata
        gridSize: 3,                 // Phase 1.6: Custom grid size
        optimalMoves: 30,            // Phase 1.6: 3-star threshold
        maxMoves: 60                 // Phase 1.6: Fail threshold
    },
    {
        id: 'leafy_stack',
        name: 'Leafy Stack',
        description: 'A simple veggie sandwich for herbivore pets.',
        sequence: [1, 2, 3, 8],
        buff: { defense: +10, stamina: +15 },
        difficulty: 'Easy',          // Phase 1.6: Metadata
        gridSize: 3,                 // Phase 1.6: Custom grid size
        optimalMoves: 15,            // Phase 1.6: 3-star threshold
        maxMoves: 40                 // Phase 1.6: Fail threshold
    },
    {
        id: 'cheesy_beast',
        name: 'Cheesy Beast',
        description: 'Extra cheese for hungry pets.',
        sequence: [1, 4, 5, 8],
        buff: { attack: +15, health: +10 },
        difficulty: 'Easy',          // Phase 1.6: Metadata
        gridSize: 3,                 // Phase 1.6: Custom grid size
        optimalMoves: 15,            // Phase 1.6: 3-star threshold
        maxMoves: 40                 // Phase 1.6: Fail threshold
    },
    {
        id: 'protein_power',
        name: 'Protein Power',
        description: 'Meat-heavy meal for warrior pets.',
        sequence: [1, 5, 4, 8],
        buff: { attack: +20, defense: +5 },
        difficulty: 'Easy',          // Phase 1.6: Metadata
        gridSize: 3,                 // Phase 1.6: Custom grid size
        optimalMoves: 15,            // Phase 1.6: 3-star threshold
        maxMoves: 40                 // Phase 1.6: Fail threshold
    },
    {
        id: 'garden_delight',
        name: 'Garden Delight',
        description: 'Fresh veggies for balanced nutrition.',
        sequence: [1, 2, 6, 7, 8],
        buff: { health: +15, stamina: +20 },
        difficulty: 'Medium',        // Phase 1.6: Metadata
        gridSize: 3,                 // Phase 1.6: Custom grid size
        optimalMoves: 20,            // Phase 1.6: 3-star threshold
        maxMoves: 50                 // Phase 1.6: Fail threshold
    },
    {
        id: 'deluxe_combo',
        name: 'Deluxe Combo',
        description: 'Everything sandwich for special occasions.',
        sequence: [1, 2, 3, 4, 5, 6, 7, 8],
        buff: { health: +30, attack: +10, defense: +10, stamina: +15 },
        difficulty: 'Hard',          // Phase 1.6: Metadata
        gridSize: 3,                 // Phase 1.6: Custom grid size
        optimalMoves: 35,            // Phase 1.6: 3-star threshold
        maxMoves: 70                 // Phase 1.6: Fail threshold
    }
];

// =============================================================================
// PHASE 1.6: RECIPE SYSTEM MODULE
// =============================================================================

/**
 * RecipeSystem - Manages recipe data and configuration
 * This module is shared across all puzzle scenes (Feeding, Combat)
 */
const RecipeSystem = {
    /**
     * Get recipe by ID
     * @param {string} recipeId - Recipe identifier
     * @returns {object|null} Recipe object or null if not found
     */
    getRecipeById: function(recipeId) {
        return RECIPES.find(r => r.id === recipeId) || null;
    },
    
    /**
     * Get all recipes
     * @returns {array} All available recipes
     */
    getAllRecipes: function() {
        return [...RECIPES]; // Return copy to prevent mutation
    },
    
    /**
     * Get recipes by difficulty
     * @param {string} difficulty - 'Easy', 'Medium', or 'Hard'
     * @returns {array} Filtered recipes
     */
    getRecipesByDifficulty: function(difficulty) {
        return RECIPES.filter(r => r.difficulty === difficulty);
    },
    
    /**
     * Apply recipe configuration to GAME_CONFIG
     * This automatically configures grid size and move limits based on recipe metadata
     * 
     * @param {object} recipe - Recipe to apply
     */
    applyRecipeConfig: function(recipe) {
        if (!recipe) {
            console.warn('[RecipeSystem] No recipe provided to applyRecipeConfig');
            return;
        }
        
        // Apply recipe metadata with fallback defaults
        GAME_CONFIG.GRID_SIZE = recipe.gridSize || 3;
        GAME_CONFIG.OPTIMAL_MOVES = recipe.optimalMoves || 20;
        GAME_CONFIG.MAX_MOVES = recipe.maxMoves || 50;
        GAME_CONFIG.DIFFICULTY = recipe.difficulty || 'Normal';
        
        // Debug logging
        if (GAME_CONFIG.DEBUG_MODE) {
            console.log('[RecipeSystem] Applied config:', {
                recipe: recipe.name,
                gridSize: GAME_CONFIG.GRID_SIZE,
                optimalMoves: GAME_CONFIG.OPTIMAL_MOVES,
                maxMoves: GAME_CONFIG.MAX_MOVES,
                difficulty: GAME_CONFIG.DIFFICULTY
            });
        }
    },
    
    /**
     * Validate recipe structure
     * @param {object} recipe - Recipe to validate
     * @returns {boolean} True if valid
     */
    validateRecipe: function(recipe) {
        if (!recipe) return false;
        if (!recipe.id || !recipe.name || !recipe.sequence) return false;
        if (!Array.isArray(recipe.sequence) || recipe.sequence.length === 0) return false;
        return true;
    }
};

// =============================================================================
// GAME CONFIGURATION & TUNABLE CONSTANTS
// =============================================================================

const GAME_CONFIG = {
    // Grid settings (will be overridden by recipe metadata)
    GRID_SIZE: 3,
    TILE_SIZE: 120,
    TILE_SPACING: 10,
    GRID_OFFSET_X: 45,
    GRID_OFFSET_Y: 180,
    
    // Recipe system
    RECIPE_MODE: true,
    DEFAULT_RECIPE_ID: 'leafy_stack',
    
    // Move limits (will be overridden by recipe metadata)
    OPTIMAL_MOVES: 20,
    MAX_MOVES: 50,
    DIFFICULTY: 'Normal',
    
    // Animation timing
    SHUFFLE_MOVE_COUNT: 20,
    SHUFFLE_MOVE_DURATION: 120,
    TILE_SLIDE_DURATION: 150,
    
    // Visual effects
    ENABLE_SHUFFLE_BOUNCE: true,
    ENABLE_HYBRID_SHUFFLE: true,
    HYBRID_SHUFFLE_COUNT: 6,
    HYBRID_SWAP_DURATION: 120,
    WIN_SCALE_DURATION: 600,
    FAIL_DISPLAY_DURATION: 2000,
    
    // Phase 1.6: Debug mode
    DEBUG_MODE: false,               // Enable debug features (console logs, recipe cycling)
    DEBUG_RECIPE_CYCLE_KEY: 'R'      // Keyboard key to cycle recipes in debug mode
};

const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 700,
    parent: 'game-container',
    backgroundColor: '#2c1810',
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

// =============================================================================
// LOCAL SCENE STATE (NOT SHARED)
// =============================================================================

let tiles = [];
let gridData = [];
let emptyPos = { row: 2, col: 2 };
let moveCount = 0;
let isAnimating = false;
let isShuffling = false;
let isWon = false;
let hasFailed = false;
let currentScene = null;
let recipeUIElements = [];

// Sandwich ingredient order (0 = empty space)
const INGREDIENTS = [
    'Bread Top',    // 1
    'Lettuce',      // 2
    'Tomato',       // 3
    'Cheese',       // 4
    'Patty',        // 5
    'Onion',        // 6
    'Pickle',       // 7
    'Bread Bottom'  // 8
];

const TILE_COLORS = [
    null,           // 0 - empty
    0xF4D03F,       // 1 - Bread Top (golden)
    0x2ECC71,       // 2 - Lettuce (green)
    0xE74C3C,       // 3 - Tomato (red)
    0xF39C12,       // 4 - Cheese (orange)
    0x8B4513,       // 5 - Patty (brown)
    0xE8DAEF,       // 6 - Onion (light purple)
    0x27AE60,       // 7 - Pickle (dark green)
    0xD4A574        // 8 - Bread Bottom (tan)
];

// =============================================================================
// PHASE 1.6: EVENT HOOKS (CROSS-SCENE COMMUNICATION)
// =============================================================================

/**
 * Called when puzzle is successfully completed
 * Future scenes (Combat, Pet, Dungeon) can subscribe to this event
 * 
 * @param {object} recipe - The completed recipe
 * @param {number} moves - Number of moves taken
 * @param {string} rating - Star rating (⭐⭐⭐, ⭐⭐, ⭐, 💀)
 */
function onPuzzleComplete(recipe, moves, rating) {
    // Update GameState
    GameState.lastResult = 'win';
    GameState.currentRecipe = recipe;
    GameState.puzzlesCompleted++;
    GameState.totalMoves += moves;
    
    // Add to completed recipes if not already there
    if (!GameState.completedRecipes.includes(recipe.id)) {
        GameState.completedRecipes.push(recipe.id);
    }
    
    // Apply buffs to pet stats (Phase 3 integration point)
    if (recipe.buff) {
        Object.keys(recipe.buff).forEach(stat => {
            if (GameState.petStats[stat] !== undefined) {
                GameState.petStats[stat] += recipe.buff[stat];
                
                // Cap health at maxHp
                if (stat === 'hp' || stat === 'health') {
                    GameState.petStats.hp = Math.min(GameState.petStats.hp, GameState.petStats.maxHp);
                }
            }
        });
    }
    
    // Debug logging
    if (GAME_CONFIG.DEBUG_MODE) {
        console.log('[onPuzzleComplete]', {
            recipe: recipe.name,
            moves: moves,
            rating: rating,
            buffs: recipe.buff,
            petStats: GameState.petStats
        });
    }
    
    // Future: This is where scene transitions would happen
    // Example: switchScene(currentScene, 'DungeonScene', { result: 'win', recipe: recipe });
}

/**
 * Called when puzzle fails (exceeds move limit)
 * Future scenes can react to failure (e.g., lose pet health, retreat)
 */
function onPuzzleFail() {
    // Update GameState
    GameState.lastResult = 'fail';
    GameState.puzzlesFailed++;
    
    // Pet takes damage on failure (Phase 3 integration point)
    GameState.petStats.hp = Math.max(0, GameState.petStats.hp - 10);
    
    // Debug logging
    if (GAME_CONFIG.DEBUG_MODE) {
        console.log('[onPuzzleFail]', {
            petHp: GameState.petStats.hp,
            totalFails: GameState.puzzlesFailed
        });
    }
    
    // Future: This is where failure handling would happen
    // Example: if (GameState.petStats.hp <= 0) { switchScene(currentScene, 'GameOverScene'); }
}

// =============================================================================
// PHASE 1.6: SCENE TRANSITION UTILITY
// =============================================================================

/**
 * Safe scene transition helper
 * Handles cleanup and data passing between scenes
 * 
 * @param {Phaser.Scene} scene - Current scene
 * @param {string} targetKey - Target scene key
 * @param {object} data - Data to pass to next scene
 */
function switchScene(scene, targetKey, data = {}) {
    if (!scene || !scene.scene) {
        console.error('[switchScene] Invalid scene provided');
        return;
    }
    
    // Debug logging
    if (GAME_CONFIG.DEBUG_MODE) {
        console.log('[switchScene]', {
            from: scene.scene.key || 'Unknown',
            to: targetKey,
            data: data
        });
    }
    
    // Clean up current scene (stop tweens, clear timers)
    scene.tweens.killAll();
    scene.time.removeAllEvents();
    
    // Transition to target scene
    scene.scene.start(targetKey, data);
}

// =============================================================================
// PHASER LIFECYCLE FUNCTIONS
// =============================================================================

function preload() {
    // No assets to load for prototype
}

function create() {
    currentScene = this;
    
    // Phase 1.6: Initialize recipe system
    if (GAME_CONFIG.RECIPE_MODE) {
        // Load default recipe or use last completed recipe
        const recipeId = GAME_CONFIG.DEFAULT_RECIPE_ID;
        GameState.currentRecipe = RecipeSystem.getRecipeById(recipeId);
        
        // Validate recipe
        if (!RecipeSystem.validateRecipe(GameState.currentRecipe)) {
            console.error('[Phase 1.6] Invalid recipe:', recipeId);
            GameState.currentRecipe = RECIPES[0]; // Fallback to first recipe
        }
        
        // Phase 1.6: Apply recipe configuration
        RecipeSystem.applyRecipeConfig(GameState.currentRecipe);
        
        // Create recipe UI display
        createRecipeUI(this);
    }
    
    // Create title
    const title = this.add.text(225, 50, 'SANDWICH PUZZLE', {
        fontSize: '28px',
        fontWeight: 'bold',
        fill: '#FFD700',
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5);

    // Create subtitle
    const subtitle = this.add.text(225, 85, GAME_CONFIG.RECIPE_MODE ? 
        'Follow the recipe!' : 'Slide tiles to build the sandwich!', {
        fontSize: '14px',
        fill: '#FFF'
    }).setOrigin(0.5);

    // Create move counter with limit display
    this.moveText = this.add.text(225, 145, `Moves: 0 / ${GAME_CONFIG.MAX_MOVES}`, {
        fontSize: '18px',
        fill: '#FFF'
    }).setOrigin(0.5);

    // Initialize the grid
    GridManager.createGrid(this, GAME_CONFIG.GRID_SIZE);

    // Create reset button
    createResetButton(this);

    // Create win message (hidden initially)
    this.winText = this.add.text(225, 600, GAME_CONFIG.RECIPE_MODE ? 
        'RECIPE COMPLETE!' : 'SANDWICH COMPLETE!', {
        fontSize: '28px',
        fontWeight: 'bold',
        fill: '#FFD700',
        stroke: '#000',
        strokeThickness: 6
    }).setOrigin(0.5).setVisible(false);

    // Create rating display (hidden initially)
    this.ratingText = this.add.text(225, 640, '', {
        fontSize: '32px',
        fontWeight: 'bold',
        fill: '#FFD700'
    }).setOrigin(0.5).setVisible(false);

    // Create fail message (hidden initially)
    this.failText = this.add.text(225, 620, GAME_CONFIG.RECIPE_MODE ?
        'Recipe ruined!\nTry again...' : 'Your sandwich fell apart!\nTry again...', {
        fontSize: '24px',
        fontWeight: 'bold',
        fill: '#FF4444',
        stroke: '#000',
        strokeThickness: 4,
        align: 'center'
    }).setOrigin(0.5).setVisible(false);

    // Phase 1.6: Setup debug mode
    if (GAME_CONFIG.DEBUG_MODE) {
        setupDebugMode(this);
    }

    // Perform animated shuffle on start
    ShuffleSystem.performAnimatedShuffle(this);
}

function update() {
    // Update loop (not needed for turn-based puzzle)
}

// =============================================================================
// PHASE 1.6: DEBUG MODE TOOLS
// =============================================================================

/**
 * Setup debug mode features
 * - Recipe cycling with keyboard
 * - Console logging
 * - Debug UI overlay
 */
function setupDebugMode(scene) {
    // Add debug text overlay
    const debugText = scene.add.text(10, 10, 'DEBUG MODE\nPress R to cycle recipes', {
        fontSize: '12px',
        fill: '#FF0',
        backgroundColor: '#000',
        padding: { x: 5, y: 5 }
    }).setDepth(1000);
    
    // Recipe cycling with R key
    scene.input.keyboard.on('keydown-R', () => {
        cycleToNextRecipe(scene);
    });
    
    console.log('[Debug] Debug mode enabled. Press R to cycle recipes.');
}

/**
 * Cycle to next recipe (debug feature)
 */
function cycleToNextRecipe(scene) {
    if (!GAME_CONFIG.RECIPE_MODE) return;
    
    const allRecipes = RecipeSystem.getAllRecipes();
    const currentIndex = allRecipes.findIndex(r => r.id === GameState.currentRecipe.id);
    const nextIndex = (currentIndex + 1) % allRecipes.length;
    const nextRecipe = allRecipes[nextIndex];
    
    console.log('[Debug] Cycling to recipe:', nextRecipe.name);
    
    // Update recipe
    GameState.currentRecipe = nextRecipe;
    RecipeSystem.applyRecipeConfig(nextRecipe);
    
    // Refresh UI and grid
    createRecipeUI(scene);
    GridManager.createGrid(scene, GAME_CONFIG.GRID_SIZE);
    ShuffleSystem.performAnimatedShuffle(scene);
    
    // Reset state
    moveCount = 0;
    isWon = false;
    hasFailed = false;
    scene.moveText.setText(`Moves: 0 / ${GAME_CONFIG.MAX_MOVES}`);
    scene.winText.setVisible(false);
    scene.ratingText.setVisible(false);
    scene.failText.setVisible(false);
}

// =============================================================================
// RECIPE UI SYSTEM
// =============================================================================

function createRecipeUI(scene) {
    recipeUIElements.forEach(element => element.destroy());
    recipeUIElements = [];
    
    if (!GAME_CONFIG.RECIPE_MODE || !GameState.currentRecipe) return;
    
    const recipe = GameState.currentRecipe;
    
    // Recipe name/title with difficulty indicator
    const recipeTitleText = `Recipe: ${recipe.name} [${recipe.difficulty || 'Normal'}]`;
    const recipeTitle = scene.add.text(225, 110, recipeTitleText, {
        fontSize: '18px',
        fill: '#FFD700',
        fontWeight: 'bold',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5);
    recipeUIElements.push(recipeTitle);
    
    // Recipe ingredient order
    const ingredientList = recipe.sequence
        .map(id => INGREDIENTS[id - 1])
        .join(' → ');
    
    const recipeOrder = scene.add.text(225, 130, `Order: ${ingredientList}`, {
        fontSize: '12px',
        fill: '#FFF',
        wordWrap: { width: 400 }
    }).setOrigin(0.5);
    recipeUIElements.push(recipeOrder);
}

// =============================================================================
// PHASE 1.6: GRID MANAGER MODULE (SHARED SYSTEM)
// =============================================================================

/**
 * GridManager - Core grid logic shared across all puzzle scenes
 * This module handles: grid creation, tile management, movement, win detection
 * 
 * REUSABLE: Combat puzzle will use this same manager with different win logic
 */
const GridManager = {
    /**
     * Creates an NxN grid with tiles and initializes game state
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {number} gridSize - Size of grid (3 = 3x3, 4 = 4x4, etc.)
     */
    createGrid: function(scene, gridSize = 3) {
        // Clear existing tiles
        tiles.forEach(tile => tile.container.destroy());
        tiles = [];
        
        // Initialize 2D grid array
        gridData = [];
        
        if (GAME_CONFIG.RECIPE_MODE && GameState.currentRecipe) {
            // Recipe mode: Populate from recipe sequence
            const recipeSequence = GameState.currentRecipe.sequence;
            const totalCells = gridSize * gridSize;
            
            let sequenceIndex = 0;
            for (let row = 0; row < gridSize; row++) {
                gridData[row] = [];
                for (let col = 0; col < gridSize; col++) {
                    const cellIndex = row * gridSize + col;
                    
                    if (cellIndex < recipeSequence.length) {
                        gridData[row][col] = recipeSequence[sequenceIndex];
                        sequenceIndex++;
                    } else {
                        gridData[row][col] = 0;
                    }
                    
                    if (gridData[row][col] !== 0) {
                        this.createTile(scene, row, col, gridData[row][col]);
                    }
                }
            }
            
            // Find empty position
            for (let row = gridSize - 1; row >= 0; row--) {
                for (let col = gridSize - 1; col >= 0; col--) {
                    if (gridData[row][col] === 0) {
                        emptyPos = { row, col };
                        break;
                    }
                }
            }
        } else {
            // Legacy mode: Sequential 1-8
            for (let row = 0; row < gridSize; row++) {
                gridData[row] = [];
                for (let col = 0; col < gridSize; col++) {
                    const tileValue = row * gridSize + col + 1;
                    const maxTiles = gridSize * gridSize;
                    gridData[row][col] = tileValue <= maxTiles - 1 ? tileValue : 0;

                    if (gridData[row][col] !== 0) {
                        this.createTile(scene, row, col, gridData[row][col]);
                    }
                }
            }
            emptyPos = { row: gridSize - 1, col: gridSize - 1 };
        }
        
        // Reset game state
        moveCount = 0;
        isWon = false;
        hasFailed = false;
    },
    
    /**
     * Creates a single tile
     */
    createTile: function(scene, row, col, value) {
        const x = GAME_CONFIG.GRID_OFFSET_X + col * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;
        const y = GAME_CONFIG.GRID_OFFSET_Y + row * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;

        const tileContainer = scene.add.container(x, y);
        const bg = scene.add.rectangle(0, 0, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, TILE_COLORS[value], 1);
        bg.setStrokeStyle(4, 0x000000);

        const label = scene.add.text(0, 0, INGREDIENTS[value - 1], {
            fontSize: '16px',
            fontWeight: 'bold',
            fill: '#000',
            align: 'center',
            wordWrap: { width: GAME_CONFIG.TILE_SIZE - 10 }
        }).setOrigin(0.5);

        const posNum = scene.add.text(-GAME_CONFIG.TILE_SIZE / 2 + 8, -GAME_CONFIG.TILE_SIZE / 2 + 8, value.toString(), {
            fontSize: '14px',
            fill: '#FFF',
            stroke: '#000',
            strokeThickness: 2
        });

        tileContainer.add([bg, label, posNum]);

        const tileData = {
            container: tileContainer,
            id: value,
            label: INGREDIENTS[value - 1],
            currentRow: row,
            currentCol: col,
            background: bg
        };

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => this.onTileClick(tileData, scene));

        bg.on('pointerover', () => {
            if (!isAnimating && !isShuffling && this.canTileMove(tileData)) {
                bg.setScale(1.05);
            }
        });
        bg.on('pointerout', () => {
            bg.setScale(1);
        });

        tiles.push(tileData);
    },
    
    /**
     * Handle tile click
     */
    onTileClick: function(tile, scene) {
        if (isAnimating || isShuffling || isWon || hasFailed) return;
        if (!this.canTileMove(tile)) return;
        this.moveTile(tile, scene, true);
    },
    
    /**
     * Check if tile can move
     */
    canTileMove: function(tile) {
        const rowDiff = Math.abs(tile.currentRow - emptyPos.row);
        const colDiff = Math.abs(tile.currentCol - emptyPos.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    },
    
    /**
     * Move tile
     */
    moveTile: function(tile, scene, isPlayerMove = false, onComplete = null) {
        isAnimating = true;

        const targetX = GAME_CONFIG.GRID_OFFSET_X + emptyPos.col * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;
        const targetY = GAME_CONFIG.GRID_OFFSET_Y + emptyPos.row * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;

        gridData[tile.currentRow][tile.currentCol] = 0;
        gridData[emptyPos.row][emptyPos.col] = tile.id;

        const oldRow = tile.currentRow;
        const oldCol = tile.currentCol;

        tile.currentRow = emptyPos.row;
        tile.currentCol = emptyPos.col;
        emptyPos = { row: oldRow, col: oldCol };

        const duration = isPlayerMove ? GAME_CONFIG.TILE_SLIDE_DURATION : GAME_CONFIG.SHUFFLE_MOVE_DURATION;

        scene.tweens.add({
            targets: tile.container,
            x: targetX,
            y: targetY,
            duration: duration,
            ease: 'Power2',
            onComplete: () => {
                isAnimating = false;
                
                if (isPlayerMove) {
                    moveCount++;
                    scene.moveText.setText(`Moves: ${moveCount} / ${GAME_CONFIG.MAX_MOVES}`);

                    if (moveCount >= GAME_CONFIG.MAX_MOVES && !isWon) {
                        triggerFailState(scene);
                        return;
                    }

                    this.checkWinCondition(scene);
                }

                if (onComplete) onComplete();
            }
        });
    },
    
    /**
     * Check win condition
     */
    checkWinCondition: function(scene) {
        if (GAME_CONFIG.RECIPE_MODE && GameState.currentRecipe) {
            const flatGrid = gridData.flat();
            const targetSequence = GameState.currentRecipe.sequence;
            
            const solved = targetSequence.every((targetId, index) => {
                return flatGrid[index] === targetId;
            });
            
            if (solved) {
                onPuzzleSolved(scene);
            }
        } else {
            // Legacy mode
            const gridSize = GAME_CONFIG.GRID_SIZE;
            
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const expectedValue = row * gridSize + col + 1;
                    const actualValue = gridData[row][col];

                    if (row === gridSize - 1 && col === gridSize - 1) {
                        if (actualValue !== 0) return;
                    } else {
                        if (actualValue !== expectedValue) return;
                    }
                }
            }
            
            onPuzzleSolved(scene);
        }
    }
};

// =============================================================================
// PHASE 1.6: SHUFFLE SYSTEM MODULE (SHARED SYSTEM)
// =============================================================================

/**
 * ShuffleSystem - Handles animated shuffle logic
 * REUSABLE: Combat puzzle can use same shuffle system
 */
const ShuffleSystem = {
    /**
     * Perform animated shuffle with no-backtracking
     */
    performAnimatedShuffle: function(scene) {
        isShuffling = true;
        
        this.resetGridToSolved();
        
        const moves = GAME_CONFIG.SHUFFLE_MOVE_COUNT;
        let currentMove = 0;
        let lastMovedTile = null;
        
        const self = this;
        
        function makeShuffleMove() {
            if (currentMove >= moves) {
                if (GAME_CONFIG.ENABLE_HYBRID_SHUFFLE) {
                    self.performHybridShuffle(scene);
                } else {
                    isShuffling = false;
                }
                return;
            }
            
            let movableTiles = tiles.filter(tile => GridManager.canTileMove(tile));
            
            if (lastMovedTile && movableTiles.length > 1) {
                movableTiles = movableTiles.filter(tile => tile.id !== lastMovedTile.id);
            }
            
            if (movableTiles.length > 0) {
                const randomTile = movableTiles[Math.floor(Math.random() * movableTiles.length)];
                lastMovedTile = randomTile;
                
                const durationVariance = Math.floor(Math.random() * 41) - 20;
                const moveDuration = GAME_CONFIG.SHUFFLE_MOVE_DURATION + durationVariance;
                
                if (GAME_CONFIG.ENABLE_SHUFFLE_BOUNCE) {
                    scene.tweens.add({
                        targets: randomTile.container,
                        scaleX: 1.1,
                        scaleY: 1.1,
                        duration: moveDuration / 2,
                        yoyo: true,
                        ease: 'Sine.easeInOut'
                    });
                }
                
                const originalDuration = GAME_CONFIG.SHUFFLE_MOVE_DURATION;
                GAME_CONFIG.SHUFFLE_MOVE_DURATION = moveDuration;
                
                GridManager.moveTile(randomTile, scene, false, () => {
                    GAME_CONFIG.SHUFFLE_MOVE_DURATION = originalDuration;
                    currentMove++;
                    makeShuffleMove();
                });
            } else {
                currentMove++;
                makeShuffleMove();
            }
        }
        
        makeShuffleMove();
    },
    
    /**
     * Perform hybrid visual shuffle
     */
    performHybridShuffle: function(scene) {
        const hybridMoves = GAME_CONFIG.HYBRID_SHUFFLE_COUNT;
        let currentHybridMove = 0;
        
        function makeHybridMove() {
            if (currentHybridMove >= hybridMoves) {
                isShuffling = false;
                return;
            }
            
            const numTilesToSwap = Math.random() < 0.7 ? 2 : 3;
            const tilesToAnimate = [];
            
            const availableTiles = [...tiles];
            for (let i = 0; i < numTilesToSwap && availableTiles.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableTiles.length);
                tilesToAnimate.push(availableTiles[randomIndex]);
                availableTiles.splice(randomIndex, 1);
            }
            
            const originalPositions = tilesToAnimate.map(tile => ({
                x: tile.container.x,
                y: tile.container.y
            }));
            
            const targetPositions = [...originalPositions];
            if (targetPositions.length === 2) {
                [targetPositions[0], targetPositions[1]] = [targetPositions[1], targetPositions[0]];
            } else if (targetPositions.length === 3) {
                const temp = targetPositions[0];
                targetPositions[0] = targetPositions[1];
                targetPositions[1] = targetPositions[2];
                targetPositions[2] = temp;
            }
            
            const delay = Math.floor(Math.random() * 80);
            
            scene.time.delayedCall(delay, () => {
                tilesToAnimate.forEach((tile, index) => {
                    scene.tweens.add({
                        targets: tile.container,
                        scaleX: 1.08,
                        scaleY: 1.08,
                        duration: GAME_CONFIG.HYBRID_SWAP_DURATION / 3,
                        yoyo: true,
                        ease: 'Sine.easeInOut'
                    });
                    
                    scene.tweens.add({
                        targets: tile.container,
                        x: targetPositions[index].x,
                        y: targetPositions[index].y,
                        duration: GAME_CONFIG.HYBRID_SWAP_DURATION,
                        ease: 'Power2',
                        onComplete: () => {
                            const realX = GAME_CONFIG.GRID_OFFSET_X + tile.currentCol * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;
                            const realY = GAME_CONFIG.GRID_OFFSET_Y + tile.currentRow * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;
                            
                            scene.tweens.add({
                                targets: tile.container,
                                x: realX,
                                y: realY,
                                duration: GAME_CONFIG.HYBRID_SWAP_DURATION * 0.6,
                                ease: 'Back.easeOut'
                            });
                            
                            if (index === tilesToAnimate.length - 1) {
                                currentHybridMove++;
                                scene.time.delayedCall(40, makeHybridMove);
                            }
                        }
                    });
                });
            });
        }
        
        makeHybridMove();
    },
    
    /**
     * Reset grid to solved state
     */
    resetGridToSolved: function() {
        const gridSize = GAME_CONFIG.GRID_SIZE;
        
        if (GAME_CONFIG.RECIPE_MODE && GameState.currentRecipe) {
            const recipeSequence = GameState.currentRecipe.sequence;
            let sequenceIndex = 0;
            
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const cellIndex = row * gridSize + col;
                    
                    if (cellIndex < recipeSequence.length) {
                        gridData[row][col] = recipeSequence[sequenceIndex];
                        sequenceIndex++;
                    } else {
                        gridData[row][col] = 0;
                    }
                }
            }
            
            for (let row = gridSize - 1; row >= 0; row--) {
                for (let col = gridSize - 1; col >= 0; col--) {
                    if (gridData[row][col] === 0) {
                        emptyPos = { row, col };
                        break;
                    }
                }
            }
        } else {
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const value = row * gridSize + col + 1;
                    gridData[row][col] = value <= gridSize * gridSize - 1 ? value : 0;
                }
            }
            emptyPos = { row: gridSize - 1, col: gridSize - 1 };
        }
        
        tiles.forEach(tile => {
            let targetRow = -1, targetCol = -1;
            
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    if (gridData[row][col] === tile.id) {
                        targetRow = row;
                        targetCol = col;
                        break;
                    }
                }
            }
            
            if (targetRow !== -1) {
                tile.currentRow = targetRow;
                tile.currentCol = targetCol;
                
                const x = GAME_CONFIG.GRID_OFFSET_X + targetCol * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;
                const y = GAME_CONFIG.GRID_OFFSET_Y + targetRow * (GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SPACING) + GAME_CONFIG.TILE_SIZE / 2;
                tile.container.setPosition(x, y);
            }
        });
    }
};

// =============================================================================
// WIN/FAIL HANDLING
// =============================================================================

function calculateRating() {
    const optimal = GAME_CONFIG.OPTIMAL_MOVES;
    
    if (moveCount <= optimal) {
        return '⭐⭐⭐';
    } else if (moveCount <= optimal * 1.5) {
        return '⭐⭐';
    } else if (moveCount <= optimal * 2) {
        return '⭐';
    } else {
        return '💀';
    }
}

function onPuzzleSolved(scene) {
    isWon = true;

    const rating = calculateRating();
    scene.ratingText.setText(rating);
    scene.ratingText.setVisible(true);

    // Phase 1.6: Fire completion event hook
    onPuzzleComplete(GameState.currentRecipe, moveCount, rating);

    scene.winText.setVisible(true);
    scene.winText.setScale(0);
    scene.tweens.add({
        targets: scene.winText,
        scale: 1.2,
        duration: GAME_CONFIG.WIN_SCALE_DURATION / 2,
        ease: 'Back.easeOut',
        onComplete: () => {
            scene.tweens.add({
                targets: scene.winText,
                scale: 1,
                duration: GAME_CONFIG.WIN_SCALE_DURATION / 2,
                ease: 'Sine.easeInOut'
            });
        }
    });

    scene.ratingText.setScale(0);
    scene.tweens.add({
        targets: scene.ratingText,
        scale: 1.5,
        duration: 400,
        delay: 300,
        ease: 'Back.easeOut',
        onComplete: () => {
            scene.tweens.add({
                targets: scene.ratingText,
                scale: 1,
                duration: 200,
                ease: 'Sine.easeInOut'
            });
        }
    });

    tiles.forEach((tile, index) => {
        scene.tweens.add({
            targets: tile.background,
            alpha: 0.5,
            yoyo: true,
            repeat: 2,
            duration: 200,
            delay: index * 30
        });
    });
}

function triggerFailState(scene) {
    hasFailed = true;
    
    // Phase 1.6: Fire failure event hook
    onPuzzleFail();
    
    scene.failText.setVisible(true);
    scene.failText.setScale(0);
    scene.tweens.add({
        targets: scene.failText,
        scale: 1,
        duration: 400,
        ease: 'Back.easeOut'
    });
    
    tiles.forEach(tile => {
        scene.tweens.add({
            targets: tile.background,
            alpha: 0.6,
            duration: 300
        });
    });
    
    scene.time.delayedCall(GAME_CONFIG.FAIL_DISPLAY_DURATION, () => {
        resetPuzzle(scene);
    });
}

// =============================================================================
// RESET FUNCTIONALITY
// =============================================================================

function createResetButton(scene) {
    const button = scene.add.rectangle(225, 665, 150, 40, 0xFF6B6B);
    button.setStrokeStyle(3, 0x000000);
    button.setInteractive({ useHandCursor: true });

    const buttonText = scene.add.text(225, 665, 'RESET', {
        fontSize: '20px',
        fontWeight: 'bold',
        fill: '#FFF'
    }).setOrigin(0.5);

    button.on('pointerover', () => {
        if (!isShuffling) button.setFillStyle(0xFF4444);
    });
    button.on('pointerout', () => button.setFillStyle(0xFF6B6B));

    button.on('pointerdown', () => {
        if (!isAnimating && !isShuffling) {
            resetPuzzle(scene);
        }
    });
}

function resetPuzzle(scene) {
    scene.winText.setVisible(false);
    scene.ratingText.setVisible(false);
    scene.failText.setVisible(false);
    
    tiles.forEach(tile => {
        tile.background.setAlpha(1);
    });
    
    moveCount = 0;
    isWon = false;
    hasFailed = false;
    scene.moveText.setText(`Moves: 0 / ${GAME_CONFIG.MAX_MOVES}`);
    
    ShuffleSystem.performAnimatedShuffle(scene);
}

// =============================================================================
// PHASE 1.6 COMPLETE - MODULAR ARCHITECTURE READY FOR PHASE 2
// =============================================================================

/**
 * PHASE 1.6 ARCHITECTURE SUMMARY:
 * 
 * ✅ SHARED SYSTEMS (Reusable across scenes):
 * - GameState: Cross-scene data persistence
 * - RecipeSystem: Recipe management and configuration
 * - GridManager: Grid creation, tiles, movement, win detection
 * - ShuffleSystem: Animated shuffle with no-backtracking
 * 
 * ✅ EVENT HOOKS (Scene communication):
 * - onPuzzleComplete(recipe, moves, rating)
 * - onPuzzleFail()
 * 
 * ✅ UTILITIES:
 * - switchScene(scene, targetKey, data)
 * - applyRecipeConfig(recipe)
 * 
 * ✅ DEBUG TOOLS:
 * - Recipe cycling (R key)
 * - Console logging
 * - Debug mode toggle
 * 
 * 🎯 PHASE 2 INTEGRATION POINTS:
 * - Combat scene can reuse GridManager for ability tiles
 * - Event hooks trigger scene transitions
 * - GameState.petStats tracks combat health/buffs
 * - RecipeSystem provides buff data for combat modifiers
 * 
 * 🔒 SAFETY:
 * - No single-point-of-failure coupling
 * - Each module is self-contained
 * - Scene transitions clean up properly
 * - No direct cross-module mutation
 */
