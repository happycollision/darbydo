import Phaser from 'phaser'

const WORLD_WIDTH = 2400
const BASE_WIDTH = 800
const BASE_HEIGHT = 600

// State machine enums
enum PlayerState {
  Alive = 'alive',
  Invulnerable = 'invulnerable',
  Dead = 'dead',
  LevelComplete = 'levelComplete',
}

enum ProjectileState {
  Flying = 'flying',
  Consumed = 'consumed',
}

enum TargetState {
  Idle = 'idle',
  Preparing = 'preparing',
  Cooldown = 'cooldown',
  Destroyed = 'destroyed',
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  
  // Game mode (passed from BootScene)
  private letters: string[] = ['D', 'A', 'R', 'B', 'Y']
  private characterName = 'DARBY'
  private difficulty: 'easy' | 'noJump' | 'hard' = 'hard'
  
  // Touch controls
  private leftBtn!: Phaser.GameObjects.Arc
  private rightBtn!: Phaser.GameObjects.Arc
  private jumpBtn!: Phaser.GameObjects.Arc
  private shootBtn!: Phaser.GameObjects.Arc
  private resetBtn!: Phaser.GameObjects.Arc
  private exitBtn!: Phaser.GameObjects.Arc
  private newTargetBtn!: Phaser.GameObjects.Arc
  private touchState = { left: false, right: false, jump: false, shoot: false, newTarget: false, reset: false, exit: false }
  private jumpWasPressed = false
  private shootWasPressed = false
  private newTargetWasPressed = false
  private resetWasPressed = false
  private exitWasPressed = false
  
  // Projectiles (player's and enemy's)
  private projectiles!: Phaser.Physics.Arcade.Group
  private enemyProjectiles!: Phaser.Physics.Arcade.Group
  private facingRight = true
  private readonly MAX_PROJECTILES = 3
  
  // Player facing indicator
  private facingIndicator!: Phaser.GameObjects.Triangle
  
  // Targets with letters
  private targetsGroup!: Phaser.Physics.Arcade.StaticGroup
  private targetData: Map<Phaser.GameObjects.Arc, {
    letter: string
    label: Phaser.GameObjects.Text
    originX: number
    originY: number
    moveAngle: number
    state: TargetState
    stateUntil: number
  }> = new Map()
  private nextLetterIndex = 0
  private letterDisplays: Phaser.GameObjects.Text[] = []
  private winText!: Phaser.GameObjects.Text
  private loseText!: Phaser.GameObjects.Text
  
  // Player state
  private playerState = PlayerState.Alive
  private playerStateUntil = 0
  private readonly HIT_IFRAMES_MS = 500
  
  // Health
  private health = 3
  private healthDisplay!: Phaser.GameObjects.Text
  
  // Power-up
  private powerUp!: Phaser.GameObjects.Arc
  private sprayModeActive = false
  private sprayModeTimer?: Phaser.Time.TimerEvent
  private powerUpIndicator!: Phaser.GameObjects.Text
  
  // Heart power-ups (Marvin mode only)
  private heartPowerUps: { obj: Phaser.GameObjects.Text; value: number }[] = []
  private readonly MAX_HEALTH = 10
  
  // FPS display
  private fpsText!: Phaser.GameObjects.Text
  
  // Background and birds
  private birds: { body: Phaser.GameObjects.Ellipse; leftWing: Phaser.GameObjects.Triangle; rightWing: Phaser.GameObjects.Triangle; speed: number }[] = []
  private nextBirdTime = 0
  private farMountains!: Phaser.GameObjects.Graphics
  private nearMountains!: Phaser.GameObjects.Graphics
  
  // Level system
  private level = 1
  private exitDoor!: Phaser.GameObjects.Rectangle
  private exitDoorGlow!: Phaser.GameObjects.Rectangle
  private exitArrow!: Phaser.GameObjects.Text
  
  // Boss fight (Marvin level 3)
  private isBossLevel = false
  private boss!: Phaser.GameObjects.Rectangle
  private bossBody!: Phaser.Physics.Arcade.Body
  private bossHealth = 21
  private bossHealthText!: Phaser.GameObjects.Text
  private bossState: 'idle' | 'attacking' | 'hurt' | 'dead' = 'idle'
  private bossStateUntil = 0
  private bossAttackCooldown = 0

  constructor() {
    super({ key: 'GameScene' })
  }

  create(data: { letters?: string[]; name?: string; difficulty?: 'easy' | 'noJump' | 'hard'; level?: number; health?: number }) {
    // Get mode from scene data
    if (data.letters) this.letters = data.letters
    if (data.name) this.characterName = data.name
    if (data.difficulty) this.difficulty = data.difficulty
    this.level = data.level ?? 1
    
    // Check if this is a boss level (Marvin level 3) - set early for background
    this.isBossLevel = this.difficulty === 'hard' && this.level === 3

    // Reset state
    this.nextLetterIndex = 0
    this.health = data.health ?? 3 // Keep health from previous level, or start with 3
    this.playerState = PlayerState.Alive
    this.playerStateUntil = 0

    // Set world bounds for side-scrolling
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, BASE_HEIGHT)

    // Create background based on level
    this.createBackground()

    // Create platforms
    this.platforms = this.physics.add.staticGroup()
    
    // Ground (full world width) - tall enough to be above touch controls
    const groundHeight = 120
    const ground = this.add.rectangle(WORLD_WIDTH / 2, BASE_HEIGHT - groundHeight / 2, WORLD_WIDTH, groundHeight, 0x4a4a4a)
    this.platforms.add(ground)
    
    // Add platforms based on difficulty
    if (this.difficulty === 'easy') {
      // Easy mode: just a couple platforms
      this.platforms.add(this.add.rectangle(400, 450, 200, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(1200, 450, 200, 20, 0x4a4a4a))
    } else if (this.difficulty === 'hard') {
      // Hard mode: full platform set
      this.platforms.add(this.add.rectangle(200, 450, 150, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(500, 350, 150, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(800, 400, 150, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(1100, 300, 150, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(1400, 450, 150, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(1700, 350, 150, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(2000, 400, 150, 20, 0x4a4a4a))
      this.platforms.add(this.add.rectangle(2200, 300, 150, 20, 0x4a4a4a))
    }
    // noJump mode: no platforms, just ground

    // Create player (spawn above ground)
    this.player = this.add.rectangle(100, BASE_HEIGHT - groundHeight - 50, 40, 60, 0x3498db)
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    
    // Facing indicator
    this.facingIndicator = this.add.triangle(0, 0, 0, 0, 12, 8, 0, 16, 0xffffff)

    // Collisions
    this.physics.add.collider(this.player, this.platforms)

    // Projectiles groups
    this.projectiles = this.physics.add.group()
    this.enemyProjectiles = this.physics.add.group()

    // Targets group
    this.targetsGroup = this.physics.add.staticGroup()
    this.targetData = new Map()

    // Check if this is a boss level (Marvin level 3)
    if (this.isBossLevel) {
      // Boss fight setup
      this.createBoss()
    } else {
      // Create letter targets
      this.createTargets()

      // Set up physics overlap for projectile-target collisions
      this.physics.add.overlap(this.projectiles, this.targetsGroup, this.onProjectileHitTarget, undefined, this)
    }
    
    // Set up physics overlap for enemy projectile-player collisions
    this.physics.add.overlap(this.enemyProjectiles, this.player, this.onEnemyProjectileHitPlayer, undefined, this)

    // Create letter displays at top of screen (not for boss level)
    if (!this.isBossLevel) {
      this.createLetterDisplays()
    }

    // Create health display
    this.healthDisplay = this.add.text(BASE_WIDTH / 2, 80, '❤️❤️❤️', {
      fontSize: '32px',
    }).setOrigin(0.5).setScrollFactor(0)

    // Create power-up (not for boss level)
    if (!this.isBossLevel) {
      this.createPowerUp()
    }
    
    // Create heart power-ups on all levels
    this.createHeartPowerUps()

    // Camera follows player
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, BASE_HEIGHT)
    this.cameras.main.startFollow(this.player, true, 1, 1)
    this.cameras.main.roundPixels = true

    // Exit arrow (hidden initially, shows when level complete)
    this.exitArrow = this.add.text(BASE_WIDTH - 60, BASE_HEIGHT / 2, '➡️', {
      fontSize: '64px',
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)
    
    // Exit door (hidden initially, appears past end of level)
    const doorX = WORLD_WIDTH + 100
    const doorGroundHeight = 120
    this.exitDoorGlow = this.add.rectangle(doorX, BASE_HEIGHT - doorGroundHeight - 60, 70, 120, 0x00ffff, 0.3)
    this.exitDoorGlow.setVisible(false)
    this.exitDoor = this.add.rectangle(doorX, BASE_HEIGHT - doorGroundHeight - 60, 60, 100, 0x8B4513)
    this.exitDoor.setStrokeStyle(4, 0xffff00)
    this.exitDoor.setVisible(false)
    
    // Win text (hidden initially)
    this.winText = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2, '🎉 YOU WIN! 🎉', {
      fontSize: '64px',
      fontFamily: 'Arial Black',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)

    // Lose text (hidden initially)
    this.loseText = this.add.text(BASE_WIDTH / 2, BASE_HEIGHT / 2, '💔 TRY AGAIN! 💔', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)

    // Power-up indicator (hidden initially)
    this.powerUpIndicator = this.add.text(BASE_WIDTH / 2, 120, '🔥 SPRAY MODE 🔥', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)

    // FPS display
    this.fpsText = this.add.text(10, BASE_HEIGHT - 30, 'FPS: 0', {
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setScrollFactor(0)

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
      
      // Dev shortcuts: 1, 2, 3 to jump to levels
      this.input.keyboard.on('keydown-ONE', () => this.jumpToLevel(1))
      this.input.keyboard.on('keydown-TWO', () => this.jumpToLevel(2))
      this.input.keyboard.on('keydown-THREE', () => this.jumpToLevel(3))
    }

    // Create touch controls
    this.createTouchControls()
  }

  jumpToLevel(level: number) {
    this.scene.restart({
      letters: this.letters,
      name: this.characterName,
      difficulty: this.difficulty,
      level: level,
    })
  }

  createBackground() {
    if (this.isBossLevel) {
      this.createJungleBackground()
    } else if (this.level % 2 === 0) {
      this.createForestBackground()
    } else {
      this.createMountainBackground()
    }
    
    // Reset birds
    this.birds = []
    this.nextBirdTime = this.time.now + Phaser.Math.Between(2000, 5000)
  }

  createMountainBackground() {
    // Sky gradient (static, doesn't scroll)
    const sky = this.add.graphics()
    for (let y = 0; y < BASE_HEIGHT; y += 10) {
      const t = y / BASE_HEIGHT
      const r = Math.floor(135 + t * 20)
      const g = Math.floor(206 + t * 10)
      const b = Math.floor(235 - t * 30)
      sky.fillStyle(Phaser.Display.Color.GetColor(r, g, b))
      sky.fillRect(0, y, BASE_WIDTH, 10)
    }
    sky.setScrollFactor(0)
    sky.setDepth(-12)
    
    // Far mountains (darker, smaller) - slow parallax (0.2)
    this.farMountains = this.add.graphics()
    const farMountainColor = 0x8899aa
    this.farMountains.fillStyle(farMountainColor)
    for (let x = 0; x < WORLD_WIDTH * 1.5; x += 300) {
      const peakHeight = Phaser.Math.Between(150, 250)
      const baseWidth = Phaser.Math.Between(250, 350)
      this.farMountains.fillTriangle(
        x, BASE_HEIGHT - 120,
        x + baseWidth / 2, BASE_HEIGHT - 120 - peakHeight,
        x + baseWidth, BASE_HEIGHT - 120
      )
    }
    this.farMountains.setScrollFactor(0.2)
    this.farMountains.setDepth(-11)
    
    // Near mountains (lighter with snow caps) - medium parallax (0.5)
    this.nearMountains = this.add.graphics()
    const nearMountainColor = 0x667788
    const snowColor = 0xffffff
    for (let x = -100; x < WORLD_WIDTH * 1.2; x += 400) {
      const peakHeight = Phaser.Math.Between(200, 350)
      const baseWidth = Phaser.Math.Between(350, 500)
      const peakX = x + baseWidth / 2
      const peakY = BASE_HEIGHT - 120 - peakHeight
      
      // Mountain body
      this.nearMountains.fillStyle(nearMountainColor)
      this.nearMountains.fillTriangle(
        x, BASE_HEIGHT - 120,
        peakX, peakY,
        x + baseWidth, BASE_HEIGHT - 120
      )
      
      // Snow cap
      this.nearMountains.fillStyle(snowColor)
      const snowHeight = peakHeight * 0.3
      this.nearMountains.fillTriangle(
        peakX - baseWidth * 0.15, peakY + snowHeight,
        peakX, peakY,
        peakX + baseWidth * 0.15, peakY + snowHeight
      )
    }
    this.nearMountains.setScrollFactor(0.5)
    this.nearMountains.setDepth(-10)
  }

  createForestBackground() {
    // Forest sky gradient (warmer tones)
    const sky = this.add.graphics()
    for (let y = 0; y < BASE_HEIGHT; y += 10) {
      const t = y / BASE_HEIGHT
      const r = Math.floor(180 + t * 30)
      const g = Math.floor(200 + t * 20)
      const b = Math.floor(180 - t * 40)
      sky.fillStyle(Phaser.Display.Color.GetColor(r, g, b))
      sky.fillRect(0, y, BASE_WIDTH, 10)
    }
    sky.setScrollFactor(0)
    sky.setDepth(-12)
    
    // Far trees (darker, smaller) - slow parallax (0.2)
    this.farMountains = this.add.graphics()
    const farTreeColor = 0x2d5a27
    for (let x = 0; x < WORLD_WIDTH * 1.5; x += 80) {
      const treeHeight = Phaser.Math.Between(100, 180)
      const treeWidth = Phaser.Math.Between(40, 60)
      
      // Tree trunk
      this.farMountains.fillStyle(0x4a3728)
      this.farMountains.fillRect(x + treeWidth / 2 - 5, BASE_HEIGHT - 120 - 30, 10, 30)
      
      // Tree foliage (triangle)
      this.farMountains.fillStyle(farTreeColor)
      this.farMountains.fillTriangle(
        x, BASE_HEIGHT - 120 - 30,
        x + treeWidth / 2, BASE_HEIGHT - 120 - treeHeight,
        x + treeWidth, BASE_HEIGHT - 120 - 30
      )
    }
    this.farMountains.setScrollFactor(0.2)
    this.farMountains.setDepth(-11)
    
    // Near trees (lighter, larger) - medium parallax (0.5)
    this.nearMountains = this.add.graphics()
    const nearTreeColor = 0x3d7a37
    for (let x = -50; x < WORLD_WIDTH * 1.2; x += 120) {
      const treeHeight = Phaser.Math.Between(150, 280)
      const treeWidth = Phaser.Math.Between(60, 100)
      
      // Tree trunk
      this.nearMountains.fillStyle(0x5d4a3a)
      this.nearMountains.fillRect(x + treeWidth / 2 - 8, BASE_HEIGHT - 120 - 40, 16, 40)
      
      // Tree foliage (layered triangles for pine tree look)
      this.nearMountains.fillStyle(nearTreeColor)
      // Bottom layer
      this.nearMountains.fillTriangle(
        x - 10, BASE_HEIGHT - 120 - 40,
        x + treeWidth / 2, BASE_HEIGHT - 120 - treeHeight * 0.5,
        x + treeWidth + 10, BASE_HEIGHT - 120 - 40
      )
      // Middle layer
      this.nearMountains.fillTriangle(
        x, BASE_HEIGHT - 120 - treeHeight * 0.4,
        x + treeWidth / 2, BASE_HEIGHT - 120 - treeHeight * 0.8,
        x + treeWidth, BASE_HEIGHT - 120 - treeHeight * 0.4
      )
      // Top layer
      this.nearMountains.fillTriangle(
        x + 10, BASE_HEIGHT - 120 - treeHeight * 0.65,
        x + treeWidth / 2, BASE_HEIGHT - 120 - treeHeight,
        x + treeWidth - 10, BASE_HEIGHT - 120 - treeHeight * 0.65
      )
    }
    this.nearMountains.setScrollFactor(0.5)
    this.nearMountains.setDepth(-10)
  }

  createJungleBackground() {
    // Dark jungle sky (filtered through canopy)
    const sky = this.add.graphics()
    for (let y = 0; y < BASE_HEIGHT; y += 10) {
      const t = y / BASE_HEIGHT
      const r = Math.floor(40 + t * 30)
      const g = Math.floor(80 + t * 40)
      const b = Math.floor(40 + t * 20)
      sky.fillStyle(Phaser.Display.Color.GetColor(r, g, b))
      sky.fillRect(0, y, BASE_WIDTH, 10)
    }
    sky.setScrollFactor(0)
    sky.setDepth(-12)
    
    // Dense jungle trees in background - slow parallax (0.2)
    this.farMountains = this.add.graphics()
    for (let x = 0; x < WORLD_WIDTH * 1.5; x += 60) {
      const treeHeight = Phaser.Math.Between(200, 350)
      
      // Dark tree trunk
      this.farMountains.fillStyle(0x2a1a0a)
      this.farMountains.fillRect(x + 15, BASE_HEIGHT - 120 - 50, 20, 50)
      
      // Dense foliage (darker green)
      this.farMountains.fillStyle(0x1a4a1a)
      this.farMountains.fillCircle(x + 25, BASE_HEIGHT - 120 - treeHeight * 0.4, 40)
      this.farMountains.fillCircle(x + 10, BASE_HEIGHT - 120 - treeHeight * 0.3, 35)
      this.farMountains.fillCircle(x + 40, BASE_HEIGHT - 120 - treeHeight * 0.35, 30)
    }
    this.farMountains.setScrollFactor(0.2)
    this.farMountains.setDepth(-11)
    
    // Foreground jungle with vines - medium parallax (0.5)
    this.nearMountains = this.add.graphics()
    for (let x = -50; x < WORLD_WIDTH * 1.2; x += 150) {
      const treeHeight = Phaser.Math.Between(300, 450)
      
      // Thick tree trunk
      this.nearMountains.fillStyle(0x3d2817)
      this.nearMountains.fillRect(x + 30, BASE_HEIGHT - 120 - 80, 40, 80)
      
      // Large canopy
      this.nearMountains.fillStyle(0x2d6a2d)
      this.nearMountains.fillCircle(x + 50, BASE_HEIGHT - 120 - treeHeight * 0.5, 70)
      this.nearMountains.fillCircle(x + 20, BASE_HEIGHT - 120 - treeHeight * 0.4, 55)
      this.nearMountains.fillCircle(x + 80, BASE_HEIGHT - 120 - treeHeight * 0.45, 50)
      
      // Hanging vines
      this.nearMountains.lineStyle(3, 0x228822)
      for (let v = 0; v < 4; v++) {
        const vineX = x + 20 + v * 25
        const vineStartY = BASE_HEIGHT - 120 - treeHeight * 0.3
        const vineLength = Phaser.Math.Between(100, 200)
        
        // Wavy vine
        this.nearMountains.beginPath()
        this.nearMountains.moveTo(vineX, vineStartY)
        for (let vy = 0; vy < vineLength; vy += 20) {
          const wave = Math.sin(vy * 0.1) * 10
          this.nearMountains.lineTo(vineX + wave, vineStartY + vy)
        }
        this.nearMountains.strokePath()
      }
    }
    this.nearMountains.setScrollFactor(0.5)
    this.nearMountains.setDepth(-10)
    
    // Extra foreground vines hanging from top (no scroll)
    const foregroundVines = this.add.graphics()
    foregroundVines.lineStyle(4, 0x116611)
    for (let x = 50; x < BASE_WIDTH; x += 120) {
      const vineLength = Phaser.Math.Between(80, 150)
      foregroundVines.beginPath()
      foregroundVines.moveTo(x, 0)
      for (let vy = 0; vy < vineLength; vy += 15) {
        const wave = Math.sin(vy * 0.15 + x * 0.01) * 15
        foregroundVines.lineTo(x + wave, vy)
      }
      foregroundVines.strokePath()
    }
    foregroundVines.setScrollFactor(0)
    foregroundVines.setDepth(-9)
  }

  createLetterDisplays() {
    this.letterDisplays = []
    const totalWidth = this.letters.length * 50
    const startX = (BASE_WIDTH - totalWidth) / 2 + 25
    
    for (let i = 0; i < this.letters.length; i++) {
      const display = this.add.text(startX + i * 50, 40, '_', {
        fontSize: '48px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0)
      this.letterDisplays.push(display)
    }
  }

  createTargets() {
    const positions: { x: number; y: number }[] = []
    const groundSurface = BASE_HEIGHT - 120 // Top of the ground platform
    const groundY = groundSurface - 30 // Targets float just above ground
    
    if (this.difficulty === 'noJump') {
      // Trilby mode: all targets at ground level, spread evenly
      const spacing = WORLD_WIDTH / (this.letters.length + 1)
      for (let i = 0; i < this.letters.length; i++) {
        positions.push({
          x: spacing * (i + 1),
          y: groundSurface - 50 // At player height on ground
        })
      }
    } else if (this.difficulty === 'easy') {
      // Darby mode: targets near ground, spread into zones
      // First letter in first third, others spread across remaining zones
      positions.push({
        x: Phaser.Math.Between(200, WORLD_WIDTH / 3),
        y: Phaser.Math.Between(groundY - 100, groundY)
      })
      
      // Divide remaining world into zones for other letters
      const remainingLetters = this.letters.length - 1
      const zoneStart = WORLD_WIDTH / 3
      const zoneWidth = (WORLD_WIDTH - 100 - zoneStart) / remainingLetters
      
      for (let i = 1; i < this.letters.length; i++) {
        const zoneLeft = zoneStart + (i - 1) * zoneWidth
        const zoneRight = zoneLeft + zoneWidth
        positions.push({
          x: Phaser.Math.Between(zoneLeft + 50, zoneRight - 50),
          y: Phaser.Math.Between(groundY - 100, groundY)
        })
      }
      
      // Shuffle non-first positions
      for (let i = positions.length - 1; i > 1; i--) {
        const j = Phaser.Math.Between(1, i)
        ;[positions[i], positions[j]] = [positions[j], positions[i]]
      }
    } else {
      // Hard mode (Marvin): spread targets into zones across the world
      // First letter in first third, others spread across remaining zones
      positions.push({
        x: Phaser.Math.Between(200, WORLD_WIDTH / 3),
        y: Phaser.Math.Between(150, BASE_HEIGHT - 150)
      })
      
      // Divide remaining world into zones for other letters
      const remainingLetters = this.letters.length - 1
      const zoneStart = WORLD_WIDTH / 3
      const zoneWidth = (WORLD_WIDTH - 100 - zoneStart) / remainingLetters
      
      for (let i = 1; i < this.letters.length; i++) {
        const zoneLeft = zoneStart + (i - 1) * zoneWidth
        const zoneRight = zoneLeft + zoneWidth
        positions.push({
          x: Phaser.Math.Between(zoneLeft + 50, zoneRight - 50),
          y: Phaser.Math.Between(150, BASE_HEIGHT - 150)
        })
      }
      
      // Shuffle non-first positions
      for (let i = positions.length - 1; i > 1; i--) {
        const j = Phaser.Math.Between(1, i)
        ;[positions[i], positions[j]] = [positions[j], positions[i]]
      }
    }
    
    for (let i = 0; i < this.letters.length; i++) {
      const { x, y } = positions[i]
      
      const circle = this.add.circle(x, y, 30, 0xff00ff)
      this.physics.add.existing(circle, true) // Add as static body
      this.targetsGroup.add(circle)
      
      const label = this.add.text(x, y, this.letters[i], {
        fontSize: '32px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5)
      
      this.targetData.set(circle, {
        letter: this.letters[i], 
        label,
        originX: x,
        originY: y,
        moveAngle: Phaser.Math.Between(0, 360),
        state: TargetState.Idle,
        stateUntil: this.time.now + Phaser.Math.Between(0, 8000), // Random initial cooldown
      })
    }
  }

  createPowerUp() {
    const x = Phaser.Math.Between(WORLD_WIDTH * 0.3, WORLD_WIDTH * 0.7)
    const y = Phaser.Math.Between(150, BASE_HEIGHT - 150)
    this.powerUp = this.add.circle(x, y, 20, 0x00ffff)
    
    this.tweens.add({
      targets: this.powerUp,
      scale: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    })
  }

  createHeartPowerUps() {
    this.heartPowerUps = []
    
    // More hearts on higher levels
    const powerUpConfigs: { value: number; label: string }[] = []
    
    // Level 1: 1 heart (+1)
    // Level 2: 2 hearts (+1 and +2)
    // Level 3+: 4 hearts (+1, +1, +2, +3)
    if (this.level >= 3) {
      powerUpConfigs.push(
        { value: 1, label: '❤️+1' },
        { value: 1, label: '❤️+1' },
        { value: 2, label: '❤️+2' },
        { value: 3, label: '❤️+3' },
      )
    } else if (this.level === 2) {
      powerUpConfigs.push(
        { value: 1, label: '❤️+1' },
        { value: 2, label: '❤️+2' },
      )
    } else {
      powerUpConfigs.push(
        { value: 1, label: '❤️+1' },
      )
    }
    
    for (const config of powerUpConfigs) {
      const x = Phaser.Math.Between(WORLD_WIDTH * 0.2, WORLD_WIDTH * 0.8)
      const y = Phaser.Math.Between(150, BASE_HEIGHT - 150)
      
      const obj = this.add.text(x, y, config.label, {
        fontSize: '28px',
      }).setOrigin(0.5)
      
      this.tweens.add({
        targets: obj,
        scale: 1.2,
        duration: 600,
        yoyo: true,
        repeat: -1,
      })
      
      this.heartPowerUps.push({ obj, value: config.value })
    }
  }

  createTouchControls() {
    const btnY = BASE_HEIGHT - 80
    const btnRadius = 40

    this.input.addPointer(1)

    // Exit button (top left)
    this.exitBtn = this.add.circle(40, 40, 30, 0x666666, 0.5).setScrollFactor(0)
    this.add.text(40, 40, '✕', { fontSize: '28px' }).setOrigin(0.5).setScrollFactor(0)

    // Reset button (next to exit)
    this.resetBtn = this.add.circle(100, 40, 30, 0xffaa00, 0.5).setScrollFactor(0)
    this.add.text(100, 40, '↺', { fontSize: '32px' }).setOrigin(0.5).setScrollFactor(0)

    // Left button
    this.leftBtn = this.add.circle(80, btnY, btnRadius, 0x000000, 0.5).setScrollFactor(0)
    this.add.text(80, btnY, '◀', { fontSize: '32px' }).setOrigin(0.5).setScrollFactor(0)

    // Right button
    this.rightBtn = this.add.circle(180, btnY, btnRadius, 0x000000, 0.5).setScrollFactor(0)
    this.add.text(180, btnY, '▶', { fontSize: '32px' }).setOrigin(0.5).setScrollFactor(0)

    // Shoot button
    this.shootBtn = this.add.circle(620, btnY, btnRadius * 1.2, 0x00aa00, 0.5).setScrollFactor(0)
    this.add.text(620, btnY, 'SHOOT', { fontSize: '16px', fontFamily: 'Arial Black' }).setOrigin(0.5).setScrollFactor(0)

    // Jump button
    this.jumpBtn = this.add.circle(720, btnY, btnRadius * 1.2, 0xff0000, 0.5).setScrollFactor(0)
    this.add.text(720, btnY, 'JUMP', { fontSize: '20px', fontFamily: 'Arial Black' }).setOrigin(0.5).setScrollFactor(0)

    // Relocate targets button (top right)
    this.newTargetBtn = this.add.circle(760, 40, 30, 0xff00ff, 0.5).setScrollFactor(0)
    this.add.text(760, 40, '🎯', { fontSize: '24px' }).setOrigin(0.5).setScrollFactor(0)
  }

  updateTouchState() {
    this.touchState.left = false
    this.touchState.right = false
    this.touchState.jump = false
    this.touchState.shoot = false
    this.touchState.newTarget = false
    this.touchState.reset = false
    this.touchState.exit = false

    const pointers = [this.input.activePointer, this.input.pointer1, this.input.pointer2]
    
    for (const pointer of pointers) {
      if (!pointer.isDown) continue
      
      const x = pointer.x
      const y = pointer.y
      
      if (this.leftBtn.getBounds().contains(x, y)) this.touchState.left = true
      if (this.rightBtn.getBounds().contains(x, y)) this.touchState.right = true
      if (this.jumpBtn.getBounds().contains(x, y)) this.touchState.jump = true
      if (this.shootBtn.getBounds().contains(x, y)) this.touchState.shoot = true
      if (this.newTargetBtn.getBounds().contains(x, y)) this.touchState.newTarget = true
      if (this.resetBtn.getBounds().contains(x, y)) this.touchState.reset = true
      if (this.exitBtn.getBounds().contains(x, y)) this.touchState.exit = true
    }
  }

  update() {
    this.updateTouchState()

    // Exit button always works - go back to start screen
    const exitPressed = this.touchState.exit
    if (exitPressed && !this.exitWasPressed) {
      this.scene.start('BootScene')
    }
    this.exitWasPressed = exitPressed

    // Reset button always works
    const resetPressed = this.touchState.reset
    if (resetPressed && !this.resetWasPressed) {
      this.scene.restart()
    }
    this.resetWasPressed = resetPressed

    // Update player state machine
    this.updatePlayerState()
    
    // Always update facing indicator to stay with player
    const indicatorOffsetX = this.facingRight ? 25 : -25
    this.facingIndicator.setPosition(this.player.x + indicatorOffsetX, this.player.y)
    this.facingIndicator.setScale(this.facingRight ? 1 : -1, 1)

    // When dead, stop player movement and ignore gameplay inputs
    // But continue updating birds and FPS display
    if (this.playerState === PlayerState.Dead) {
      this.playerBody.setVelocity(0, 0)
      this.updateBirds()
      this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`)
      return
    }
    
    const onGround = this.playerBody.blocked.down
    const isLevelComplete = this.playerState === PlayerState.LevelComplete

    // Horizontal movement
    const leftPressed = this.cursors?.left.isDown || this.touchState.left
    const rightPressed = this.cursors?.right.isDown || this.touchState.right
    const jumpPressed = this.cursors?.up.isDown || this.touchState.jump

    if (leftPressed) {
      this.playerBody.setVelocityX(-200)
      this.facingRight = false
    } else if (rightPressed) {
      this.playerBody.setVelocityX(200)
      this.facingRight = true
    } else {
      this.playerBody.setVelocityX(0)
    }

    // Jump
    if (jumpPressed && onGround && !this.jumpWasPressed) {
      this.playerBody.setVelocityY(-550)
    }
    this.jumpWasPressed = jumpPressed

    // Shoot (disabled during level complete)
    const shootPressed = this.cursors?.space.isDown || this.touchState.shoot
    if (!isLevelComplete && shootPressed && !this.shootWasPressed && this.projectiles.countActive() < this.MAX_PROJECTILES) {
      this.shoot()
    }
    this.shootWasPressed = shootPressed

    // Relocate targets (disabled during level complete)
    const newTargetPressed = this.touchState.newTarget
    if (!isLevelComplete && newTargetPressed && !this.newTargetWasPressed) {
      this.relocateTargets()
    }
    this.newTargetWasPressed = newTargetPressed

    // Check power-up collection (disabled during level complete)
    if (!isLevelComplete && this.powerUp.active && Phaser.Geom.Intersects.RectangleToRectangle(
      this.player.getBounds(),
      this.powerUp.getBounds()
    )) {
      this.collectPowerUp()
    }

    // Check heart power-up collection
    if (!isLevelComplete) {
      this.checkHeartPowerUpCollection()
    }

    // Update target movement and behavior (disabled during level complete)
    if (!isLevelComplete && !this.isBossLevel) {
      this.updateTargets()
    }
    
    // Update boss (if boss level)
    if (this.isBossLevel && !isLevelComplete) {
      this.updateBoss()
      this.checkBossProjectileCollisions()
    }

    // Check door entry during level complete
    this.checkDoorEntry()

    // Clean up off-screen projectiles
    this.cleanupOffscreenProjectiles()

    // Update birds
    this.updateBirds()

    // Update FPS display
    this.fpsText.setText(`FPS: ${Math.round(this.game.loop.actualFps)}`)
  }

  updateBirds() {
    const now = this.time.now
    const camLeft = this.cameras.main.scrollX
    const camRight = camLeft + BASE_WIDTH
    
    // Spawn new bird if it's time
    if (now >= this.nextBirdTime) {
      this.spawnBird()
      this.nextBirdTime = now + Phaser.Math.Between(3000, 8000)
    }
    
    // Update existing birds and remove off-screen ones
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i]
      
      // Move bird
      bird.body.x += bird.speed
      bird.leftWing.x = bird.body.x - 8
      bird.rightWing.x = bird.body.x + 8
      bird.leftWing.y = bird.body.y
      bird.rightWing.y = bird.body.y
      
      // Flap animation - wings rotate up and down
      const flapAngle = Math.sin(now * 0.015 + i * 2) * 0.6
      bird.leftWing.rotation = -flapAngle - 0.3
      bird.rightWing.rotation = flapAngle + 0.3
      
      // Remove if off screen
      if ((bird.speed > 0 && bird.body.x > camRight + 100) || (bird.speed < 0 && bird.body.x < camLeft - 100)) {
        bird.body.destroy()
        bird.leftWing.destroy()
        bird.rightWing.destroy()
        this.birds.splice(i, 1)
      }
    }
  }

  spawnBird() {
    const camLeft = this.cameras.main.scrollX
    const camRight = camLeft + BASE_WIDTH
    
    // Randomly spawn from left or right
    const fromLeft = Phaser.Math.Between(0, 1) === 0
    const x = fromLeft ? camLeft - 50 : camRight + 50
    const y = Phaser.Math.Between(50, BASE_HEIGHT / 3)
    const speed = fromLeft ? Phaser.Math.Between(2, 4) : Phaser.Math.Between(-4, -2)
    
    // Create bird body (small ellipse)
    const body = this.add.ellipse(x, y, 12, 6, 0x222222)
    body.setDepth(-5)
    
    // Create wings (triangles that will flap)
    const wingColor = 0x333333
    const leftWing = this.add.triangle(x - 8, y, 0, 8, 12, 0, 12, 8, wingColor)
    const rightWing = this.add.triangle(x + 8, y, 0, 0, 0, 8, 12, 8, wingColor)
    leftWing.setDepth(-5)
    rightWing.setDepth(-5)
    
    // Flip bird if going right to left
    if (!fromLeft) {
      body.setScale(-1, 1)
    }
    
    this.birds.push({ body, leftWing, rightWing, speed })
  }

  updatePlayerState() {
    const now = this.time.now
    
    // Handle state transitions based on time
    if (this.playerState === PlayerState.Invulnerable && now >= this.playerStateUntil) {
      this.playerState = PlayerState.Alive
      this.player.setAlpha(1)
    }
    
    // Visual feedback for invulnerability (flashing)
    if (this.playerState === PlayerState.Invulnerable) {
      this.player.setAlpha(Math.sin(now * 0.02) * 0.3 + 0.7)
    }
  }

  updateTargets() {
    const now = this.time.now
    
    for (const [circle, data] of this.targetData) {
      if (!circle.active || data.state === TargetState.Destroyed) continue
      
      // Update target state machine
      this.updateTargetState(circle, data, now)
      
      if (this.difficulty === 'easy') {
        // Darby mode: slow movement in small area (radius 50)
        data.moveAngle += 0.5
        const radius = 50
        const newX = data.originX + Math.cos(Phaser.Math.DegToRad(data.moveAngle)) * radius
        const newY = data.originY + Math.sin(Phaser.Math.DegToRad(data.moveAngle * 0.7)) * (radius * 0.5)
        circle.setPosition(newX, newY)
        data.label.setPosition(newX, newY)
        // Update static body position
        const body = circle.body as Phaser.Physics.Arcade.StaticBody
        body.updateFromGameObject()
        
      } else if (this.difficulty === 'hard') {
        // Marvin mode: larger movement area (radius 100) and random shooting
        data.moveAngle += 0.8
        const radius = 100
        const newX = data.originX + Math.cos(Phaser.Math.DegToRad(data.moveAngle)) * radius
        const newY = data.originY + Math.sin(Phaser.Math.DegToRad(data.moveAngle * 0.6)) * (radius * 0.6)
        
        // Clamp to world bounds
        const clampedX = Phaser.Math.Clamp(newX, 50, WORLD_WIDTH - 50)
        const clampedY = Phaser.Math.Clamp(newY, 100, BASE_HEIGHT - 100)
        circle.setPosition(clampedX, clampedY)
        data.label.setPosition(clampedX, clampedY)
        // Update static body position
        const body = circle.body as Phaser.Physics.Arcade.StaticBody
        body.updateFromGameObject()
      }
      // Trilby mode: no movement
    }
  }

  updateTargetState(circle: Phaser.GameObjects.Arc, data: { state: TargetState; stateUntil: number }, now: number) {
    const camLeft = this.cameras.main.scrollX
    const camRight = camLeft + BASE_WIDTH
    const isOnScreen = circle.x > camLeft && circle.x < camRight
    
    switch (data.state) {
      case TargetState.Idle:
        // Only Marvin mode targets shoot randomly
        if (this.difficulty === 'hard' && isOnScreen && now >= data.stateUntil && Phaser.Math.Between(0, 500) < 1) {
          data.state = TargetState.Preparing
          data.stateUntil = now + 500 // 0.5s warning
          circle.setFillStyle(0xff8800) // Orange warning
        }
        break
        
      case TargetState.Preparing:
        if (now >= data.stateUntil) {
          // Fire and transition to cooldown
          this.targetShootsAtPlayer(circle.x, circle.y, 150)
          data.state = TargetState.Cooldown
          data.stateUntil = now + 8000 // 8s cooldown
          circle.setFillStyle(0xff00ff) // Back to pink
        }
        break
        
      case TargetState.Cooldown:
        if (now >= data.stateUntil) {
          data.state = TargetState.Idle
        }
        break
        
      case TargetState.Destroyed:
        // Terminal state, no transitions
        break
    }
  }

  onProjectileHitTarget(projectile: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile, targetCircle: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile) {
    const proj = projectile as Phaser.GameObjects.Rectangle
    const circle = targetCircle as Phaser.GameObjects.Arc
    const data = this.targetData.get(circle)
    
    // Guard: check projectile and target states
    if (!data || !circle.active || data.state === TargetState.Destroyed) return
    const projState = proj.getData('state') as ProjectileState | undefined
    if (projState === ProjectileState.Consumed) return
    
    // Mark projectile as consumed
    proj.setData('state', ProjectileState.Consumed)
    proj.destroy()
    
    // Check if this is the correct next letter
    const expectedLetter = this.letters[this.nextLetterIndex]
    
    if (data.letter === expectedLetter) {
      // Correct letter hit - transition target to destroyed
      data.state = TargetState.Destroyed
      this.letterDisplays[this.nextLetterIndex].setText(data.letter)
      this.letterDisplays[this.nextLetterIndex].setColor('#00ff00')
      circle.destroy()
      data.label.destroy()
      this.nextLetterIndex++
      
      if (this.nextLetterIndex >= this.letters.length) {
        this.onLevelComplete()
      }
    } else {
      // Wrong letter - reaction depends on difficulty
      // Only retaliate if projectile can trigger retaliation (not blue spray bullets)
      const canRetaliate = proj.getData('canRetaliate') !== false
      if (canRetaliate) {
        this.onWrongLetter(circle, data)
      }
    }
  }

  onEnemyProjectileHitPlayer(
    obj1: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile,
    obj2: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Tilemaps.Tile
  ) {
    // Guard: player must be alive to take damage
    if (this.playerState === PlayerState.Dead) return
    if (this.playerState === PlayerState.Invulnerable) {
      // Still consume the projectile, but don't take damage
      const projectile = (obj1 === this.player ? obj2 : obj1) as Phaser.GameObjects.Rectangle
      if (projectile.active) {
        const body = projectile.body as Phaser.Physics.Arcade.Body | null
        if (body) body.enable = false
        projectile.setActive(false).setVisible(false)
        this.enemyProjectiles.remove(projectile, true, true)
      }
      return
    }
    
    // Determine which object is the projectile (not the player)
    const projectile = (obj1 === this.player ? obj2 : obj1) as Phaser.GameObjects.Rectangle
    
    // Guard: check projectile state
    const projState = projectile.getData('state') as ProjectileState | undefined
    if (!projectile.active || projState === ProjectileState.Consumed) return
    
    // Mark projectile as consumed and remove
    projectile.setData('state', ProjectileState.Consumed)
    const body = projectile.body as Phaser.Physics.Arcade.Body | null
    if (body) body.enable = false
    projectile.setActive(false).setVisible(false)
    this.enemyProjectiles.remove(projectile, true, true)
    
    // Transition player to invulnerable and take damage
    this.playerState = PlayerState.Invulnerable
    this.playerStateUntil = this.time.now + this.HIT_IFRAMES_MS
    
    this.takeDamage()
  }

  cleanupOffscreenProjectiles() {
    const camLeft = this.cameras.main.scrollX - 100
    const camRight = this.cameras.main.scrollX + BASE_WIDTH + 100
    
    this.projectiles.getChildren().forEach((p) => {
      const proj = p as Phaser.GameObjects.Rectangle
      if (proj.x < camLeft || proj.x > camRight) {
        proj.destroy()
      }
    })
    
    this.enemyProjectiles.getChildren().forEach((p) => {
      const proj = p as Phaser.GameObjects.Rectangle
      if (proj.x < 0 || proj.x > WORLD_WIDTH) {
        proj.destroy()
      }
    })
  }

  onWrongLetter(circle: Phaser.GameObjects.Arc, data: { label: Phaser.GameObjects.Text }) {
    if (this.difficulty === 'noJump') {
      // Trilby mode: just shake the target
      this.shakeTarget(circle, data.label)
    } else if (this.difficulty === 'easy') {
      // Darby mode: shoot horizontally only
      this.targetShootsHorizontal(circle.x, circle.y)
    } else {
      // Marvin mode: shoot directly at player
      this.targetShootsAtPlayer(circle.x, circle.y)
    }
  }

  shakeTarget(circle: Phaser.GameObjects.Arc, label: Phaser.GameObjects.Text) {
    // Quick shake animation
    const originalX = circle.x
    this.tweens.add({
      targets: [circle, label],
      x: originalX + 10,
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        circle.setPosition(originalX, circle.y)
        label.setPosition(originalX, label.y)
      }
    })
  }

  targetShootsHorizontal(fromX: number, fromY: number) {
    const projectile = this.add.rectangle(fromX, fromY, 15, 8, 0xff0000)
    projectile.setData('state', ProjectileState.Flying)
    this.enemyProjectiles.add(projectile)
    const body = projectile.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    
    // Shoot horizontally toward player (no vertical component)
    const dirX = this.player.x > fromX ? 1 : -1
    body.setVelocity(dirX * 300, 0)
  }

  targetShootsAtPlayer(fromX: number, fromY: number, speed = 300) {
    const projectile = this.add.rectangle(fromX, fromY, 15, 8, 0xff0000)
    projectile.setData('state', ProjectileState.Flying)
    this.enemyProjectiles.add(projectile)
    const body = projectile.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    
    // Shoot toward player at any angle
    const dirX = this.player.x - fromX
    const dirY = this.player.y - fromY
    const length = Math.sqrt(dirX * dirX + dirY * dirY)
    body.setVelocity((dirX / length) * speed, (dirY / length) * speed)
  }

  takeDamage() {
    this.health = Math.max(0, this.health - 1)
    this.updateHealthDisplay()
    
    // Flash player red briefly (invulnerability flashing will take over)
    this.player.setFillStyle(0xff0000)
    this.time.delayedCall(100, () => {
      if (this.player.active) this.player.setFillStyle(0x3498db)
    })
    
    if (this.health <= 0) {
      this.playerState = PlayerState.Dead
      this.loseText.setVisible(true)
    }
  }

  updateHealthDisplay() {
    const hearts = '❤️'.repeat(this.health)
    this.healthDisplay.setText(hearts)
  }

  shoot() {
    if (this.sprayModeActive) {
      this.shootSpray()
    } else {
      this.shootSingle()
    }
  }

  shootSingle() {
    const offsetX = this.facingRight ? 25 : -25
    const projectile = this.add.rectangle(
      this.player.x + offsetX,
      this.player.y,
      12,
      6,
      0xffff00
    )
    projectile.setData('state', ProjectileState.Flying)
    projectile.setData('canRetaliate', true)
    this.projectiles.add(projectile)
    const body = projectile.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    body.setVelocityX(this.facingRight ? 400 : -400)
  }

  shootSpray() {
    const offsetX = this.facingRight ? 25 : -25
    const baseX = this.player.x + offsetX
    const baseVelX = this.facingRight ? 400 : -400
    const angles = [-20, -10, 0, 10, 20]
    
    for (const angle of angles) {
      // Center bullet (angle 0) is yellow and can trigger retaliation
      // Other bullets are blue and cannot trigger retaliation
      const isCenter = angle === 0
      const color = isCenter ? 0xffff00 : 0x00ffff
      const projectile = this.add.rectangle(baseX, this.player.y, 10, 5, color)
      projectile.setData('state', ProjectileState.Flying)
      projectile.setData('canRetaliate', isCenter)
      this.projectiles.add(projectile)
      const body = projectile.body as Phaser.Physics.Arcade.Body
      body.setAllowGravity(false)
      
      const radians = Phaser.Math.DegToRad(angle)
      const velX = baseVelX * Math.cos(radians)
      const velY = baseVelX * Math.sin(radians)
      body.setVelocity(velX, velY)
    }
  }

  collectPowerUp() {
    this.powerUp.destroy()
    this.sprayModeActive = true
    this.powerUpIndicator.setVisible(true)
    
    this.sprayModeTimer = this.time.delayedCall(15000, () => {
      this.sprayModeActive = false
      this.powerUpIndicator.setVisible(false)
    })
  }

  checkHeartPowerUpCollection() {
    const playerBounds = this.player.getBounds()
    
    for (let i = this.heartPowerUps.length - 1; i >= 0; i--) {
      const heartPowerUp = this.heartPowerUps[i]
      if (!heartPowerUp.obj.active) continue
      
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, heartPowerUp.obj.getBounds())) {
        this.collectHeartPowerUp(heartPowerUp.value)
        heartPowerUp.obj.destroy()
        this.heartPowerUps.splice(i, 1)
      }
    }
  }

  collectHeartPowerUp(value: number) {
    this.health = Math.min(this.health + value, this.MAX_HEALTH)
    this.updateHealthDisplay()
    
    // Flash player green briefly
    this.player.setFillStyle(0x00ff00)
    this.time.delayedCall(200, () => {
      if (this.player.active) this.player.setFillStyle(0x3498db)
    })
  }

  relocateTargets() {
    for (const [circle, data] of this.targetData) {
      if (circle.active) {
        const x = Phaser.Math.Between(100, WORLD_WIDTH - 100)
        const y = Phaser.Math.Between(150, BASE_HEIGHT - 150)
        circle.setPosition(x, y)
        data.label.setPosition(x, y)
        data.originX = x
        data.originY = y
        // Update static body position
        const body = circle.body as Phaser.Physics.Arcade.StaticBody
        body.updateFromGameObject()
      }
    }
  }

  isFinalLevel(): boolean {
    // Trilby and Darby: level 2 is final
    // Marvin: level 3 (boss) is final
    if (this.difficulty === 'hard') {
      return this.level >= 3
    }
    return this.level >= 2
  }

  onLevelComplete() {
    // Check if this is the final level
    if (this.isFinalLevel()) {
      this.winText.setVisible(true)
      this.playerState = PlayerState.Dead
      return
    }
    
    this.playerState = PlayerState.LevelComplete
    
    // Show exit arrow and door
    this.exitArrow.setVisible(true)
    this.exitDoor.setVisible(true)
    this.exitDoorGlow.setVisible(true)
    
    // Extend world and camera bounds to include door
    this.physics.world.setBounds(0, 0, WORLD_WIDTH + 300, BASE_HEIGHT)
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH + 300, BASE_HEIGHT)
    
    // Extend ground to reach the door
    const groundHeight = 120
    const groundExtension = this.add.rectangle(WORLD_WIDTH + 150, BASE_HEIGHT - groundHeight / 2, 300, groundHeight, 0x4a4a4a)
    this.platforms.add(groundExtension)
    
    // Pulse the door glow
    this.tweens.add({
      targets: this.exitDoorGlow,
      alpha: { from: 0.3, to: 0.8 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    })
    
    // Pulse the arrow
    this.tweens.add({
      targets: this.exitArrow,
      x: BASE_WIDTH - 40,
      duration: 300,
      yoyo: true,
      repeat: -1,
    })
  }

  checkDoorEntry() {
    if (this.playerState !== PlayerState.LevelComplete) return
    
    const playerBounds = this.player.getBounds()
    const doorBounds = this.exitDoor.getBounds()
    
    if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, doorBounds)) {
      // Transition to next level, keeping current health
      this.scene.restart({
        letters: this.letters,
        name: this.characterName,
        difficulty: this.difficulty,
        level: this.level + 1,
        health: this.health,
      })
    }
  }

  createBoss() {
    // Reset boss state
    this.bossHealth = 21
    this.bossState = 'idle'
    this.bossStateUntil = 0
    this.bossAttackCooldown = this.time.now + 2000
    
    // Create the gorilla boss (large brown rectangle as body)
    const groundHeight = 120
    const bossX = WORLD_WIDTH - 200
    const bossY = BASE_HEIGHT - groundHeight - 90 // Center of boss body
    
    this.boss = this.add.rectangle(bossX, bossY, 120, 180, 0x8B4513)
    this.physics.add.existing(this.boss)
    this.bossBody = this.boss.body as Phaser.Physics.Arcade.Body
    this.bossBody.setCollideWorldBounds(true)
    this.bossBody.setImmovable(false) // Allow boss to move/jump
    this.bossBody.checkCollision.left = false
    this.bossBody.checkCollision.right = false
    
    // Add gorilla face at TOP of body
    const face = this.add.rectangle(bossX, bossY - 60, 80, 60, 0x654321)
    const leftEye = this.add.circle(bossX - 20, bossY - 70, 10, 0xffffff)
    const rightEye = this.add.circle(bossX + 20, bossY - 70, 10, 0xffffff)
    const leftPupil = this.add.circle(bossX - 20, bossY - 70, 5, 0x000000)
    const rightPupil = this.add.circle(bossX + 20, bossY - 70, 5, 0x000000)
    const nose = this.add.ellipse(bossX, bossY - 50, 30, 20, 0x333333)
    
    // Add frown (angled eyebrows - angry, not worried)
    const leftBrow = this.add.rectangle(bossX - 20, bossY - 82, 20, 4, 0x000000)
    leftBrow.setAngle(20) // Angled down on outer edge
    const rightBrow = this.add.rectangle(bossX + 20, bossY - 82, 20, 4, 0x000000)
    rightBrow.setAngle(-20) // Angled down on outer edge
    
    // Add hands (always visible, positioned at sides)
    const leftHand = this.add.rectangle(bossX - 80, bossY + 20, 40, 50, 0x8B4513)
    const rightHand = this.add.rectangle(bossX + 80, bossY + 20, 40, 50, 0x8B4513)
    
    // Store face parts and hands for animation
    this.boss.setData('faceParts', [face, leftEye, rightEye, leftPupil, rightPupil, nose, leftBrow, rightBrow])
    this.boss.setData('hands', [leftHand, rightHand])
    
    // Boss health display (hidden until boss appears on screen)
    this.bossHealthText = this.add.text(BASE_WIDTH / 2, 40, '🦍 BOSS: 21/21', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)
    
    this.boss.setData('revealed', false)
    
    // Collider with platforms (only vertical, boss can walk through)
    this.physics.add.collider(this.boss, this.platforms)
  }

  updateBoss() {
    if (!this.isBossLevel || this.bossState === 'dead') return
    
    const now = this.time.now
    
    // Check if boss is on screen for the first time - reveal health bar
    if (!this.boss.getData('revealed')) {
      const camLeft = this.cameras.main.scrollX
      const camRight = camLeft + BASE_WIDTH
      if (this.boss.x > camLeft && this.boss.x < camRight) {
        this.boss.setData('revealed', true)
        this.bossHealthText.setVisible(true)
      }
    }
    
    const faceParts = this.boss.getData('faceParts') as Phaser.GameObjects.Shape[]
    
    // Update face parts position to follow boss
    if (faceParts) {
      const bossX = this.boss.x
      const bossY = this.boss.y
      faceParts[0].setPosition(bossX, bossY - 60) // face
      faceParts[1].setPosition(bossX - 20, bossY - 70) // left eye
      faceParts[2].setPosition(bossX + 20, bossY - 70) // right eye
      faceParts[3].setPosition(bossX - 20, bossY - 70) // left pupil
      faceParts[4].setPosition(bossX + 20, bossY - 70) // right pupil
      faceParts[5].setPosition(bossX, bossY - 50) // nose
      if (faceParts[6]) faceParts[6].setPosition(bossX - 20, bossY - 82) // left brow
      if (faceParts[7]) faceParts[7].setPosition(bossX + 20, bossY - 82) // right brow
    }
    
    // Update hands position to follow boss
    const hands = this.boss.getData('hands') as Phaser.GameObjects.Rectangle[]
    if (hands && this.bossState !== 'attacking') {
      const bossX = this.boss.x
      const bossY = this.boss.y
      hands[0].setPosition(bossX - 80, bossY + 20) // left hand
      hands[1].setPosition(bossX + 80, bossY + 20) // right hand
    }
    
    // Boss AI
    if (this.bossState === 'hurt' && now >= this.bossStateUntil) {
      this.bossState = 'idle'
      this.boss.setFillStyle(0x8B4513)
    }
    
    if (this.bossState === 'attacking' && now >= this.bossStateUntil) {
      this.bossState = 'idle'
    }
    
    // Move towards player
    const bossOnGround = this.bossBody.blocked.down
    
    if (this.bossState === 'idle') {
      const distToPlayer = this.player.x - this.boss.x
      if (Math.abs(distToPlayer) > 150) {
        this.bossBody.setVelocityX(distToPlayer > 0 ? 100 : -100)
        
        // Randomly jump while chasing (20% chance per frame when on ground)
        if (bossOnGround && Phaser.Math.Between(0, 100) < 2) {
          this.bossBody.setVelocityY(-400)
        }
      } else {
        this.bossBody.setVelocityX(0)
        
        // Attack if close enough and cooldown passed
        if (now >= this.bossAttackCooldown && bossOnGround) {
          // Sometimes jump attack
          if (Phaser.Math.Between(0, 2) === 0) {
            this.bossBody.setVelocityY(-500)
          }
          this.bossAttack()
        }
      }
    }
    
    // Check if player touches boss (contact damage)
    if (this.playerState === PlayerState.Alive) {
      const playerBounds = this.player.getBounds()
      const bossBounds = this.boss.getBounds()
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, bossBounds)) {
        this.playerState = PlayerState.Invulnerable
        this.playerStateUntil = now + this.HIT_IFRAMES_MS
        this.takeDamage()
        // Knockback
        this.playerBody.setVelocityX(this.player.x < this.boss.x ? -300 : 300)
        this.playerBody.setVelocityY(-200)
      }
    }
  }

  bossAttack() {
    this.bossState = 'attacking'
    this.bossStateUntil = this.time.now + 800
    this.bossAttackCooldown = this.time.now + 1500
    
    // Flash boss orange during attack windup
    this.boss.setFillStyle(0xff6600)
    
    const smackDirection = this.player.x < this.boss.x ? -1 : 1
    const hands = this.boss.getData('hands') as Phaser.GameObjects.Rectangle[]
    const attackingHand = smackDirection === -1 ? hands[0] : hands[1]
    const bossX = this.boss.x
    const bossY = this.boss.y
    
    // Phase 1: Shake hands (telegraph)
    this.tweens.add({
      targets: hands,
      x: '+=5',
      duration: 50,
      yoyo: true,
      repeat: 3,
    })
    
    // Phase 2: Swat forward after shake
    this.time.delayedCall(300, () => {
      if (this.bossState !== 'attacking') return
      
      // Swat the attacking hand forward
      const targetX = bossX + (smackDirection * 140)
      const targetY = bossY + 40
      
      this.tweens.add({
        targets: attackingHand,
        x: targetX,
        y: targetY,
        duration: 100,
        onComplete: () => {
          // Create smack hitbox at hand position
          const smackHitbox = this.add.rectangle(targetX, targetY, 80, 70, 0xff0000, 0.5)
          
          // Check if player is hit
          if (this.playerState === PlayerState.Alive) {
            const playerBounds = this.player.getBounds()
            const smackBounds = smackHitbox.getBounds()
            
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, smackBounds)) {
              this.playerState = PlayerState.Invulnerable
              this.playerStateUntil = this.time.now + this.HIT_IFRAMES_MS
              this.takeDamage()
              // Knockback away from boss
              this.playerBody.setVelocityX(smackDirection * 400)
              this.playerBody.setVelocityY(-300)
            }
          }
          
          // Remove hitbox after brief display
          this.time.delayedCall(150, () => {
            smackHitbox.destroy()
          })
          
          // Return hand to normal position
          this.time.delayedCall(200, () => {
            attackingHand.setPosition(
              bossX + (smackDirection === -1 ? -80 : 80),
              bossY + 20
            )
          })
        }
      })
    })
  }

  onProjectileHitBoss(projectile: Phaser.GameObjects.Rectangle) {
    if (this.bossState === 'dead') return
    
    // Mark projectile as consumed
    projectile.setData('state', ProjectileState.Consumed)
    projectile.destroy()
    
    // Damage boss
    this.bossHealth--
    this.bossHealthText.setText(`🦍 BOSS: ${this.bossHealth}/21`)
    
    // Hurt state
    this.bossState = 'hurt'
    this.bossStateUntil = this.time.now + 200
    this.boss.setFillStyle(0xffffff)
    
    // Check if boss defeated
    if (this.bossHealth <= 0) {
      this.bossState = 'dead'
      this.boss.setFillStyle(0x444444)
      this.bossHealthText.setText('🦍 DEFEATED!')
      
      // Hide boss face
      const faceParts = this.boss.getData('faceParts') as Phaser.GameObjects.Shape[]
      if (faceParts) {
        faceParts.forEach(part => part.setVisible(false))
      }
      
      // Trigger level complete
      this.onLevelComplete()
    }
  }

  checkBossProjectileCollisions() {
    if (!this.isBossLevel || this.bossState === 'dead') return
    
    const bossBounds = this.boss.getBounds()
    
    this.projectiles.getChildren().forEach((p) => {
      const proj = p as Phaser.GameObjects.Rectangle
      const projState = proj.getData('state') as ProjectileState
      if (projState === ProjectileState.Consumed) return
      
      if (Phaser.Geom.Intersects.RectangleToRectangle(proj.getBounds(), bossBounds)) {
        this.onProjectileHitBoss(proj)
      }
    })
  }
}
