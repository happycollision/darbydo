import Phaser from 'phaser'

const WORLD_WIDTH = 2400

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  
  // Game mode (passed from BootScene)
  private letters: string[] = ['D', 'A', 'R', 'B', 'Y']
  private characterName = 'DARBY'
  
  // Touch controls
  private leftBtn!: Phaser.GameObjects.Arc
  private rightBtn!: Phaser.GameObjects.Arc
  private jumpBtn!: Phaser.GameObjects.Arc
  private shootBtn!: Phaser.GameObjects.Arc
  private resetBtn!: Phaser.GameObjects.Arc
  private newTargetBtn!: Phaser.GameObjects.Arc
  private touchState = { left: false, right: false, jump: false, shoot: false, newTarget: false, reset: false }
  private jumpWasPressed = false
  private shootWasPressed = false
  private newTargetWasPressed = false
  private resetWasPressed = false
  
  // Projectiles (player's and enemy's)
  private projectiles!: Phaser.Physics.Arcade.Group
  private enemyProjectiles!: Phaser.Physics.Arcade.Group
  private facingRight = true
  private readonly MAX_PROJECTILES = 3
  
  // Player facing indicator
  private facingIndicator!: Phaser.GameObjects.Triangle
  
  // Targets with letters
  private targets: { circle: Phaser.GameObjects.Arc; letter: string; label: Phaser.GameObjects.Text }[] = []
  private nextLetterIndex = 0
  private letterDisplays: Phaser.GameObjects.Text[] = []
  private winText!: Phaser.GameObjects.Text
  private loseText!: Phaser.GameObjects.Text
  
  // Health
  private health = 3
  private healthDisplay!: Phaser.GameObjects.Text
  private isGameOver = false
  
  // Power-up
  private powerUp!: Phaser.GameObjects.Arc
  private sprayModeActive = false
  private sprayModeTimer?: Phaser.Time.TimerEvent
  private powerUpIndicator!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'GameScene' })
  }

  create(data: { letters?: string[]; name?: string }) {
    const { height } = this.scale

    // Get mode from scene data
    if (data.letters) this.letters = data.letters
    if (data.name) this.characterName = data.name

    // Reset state
    this.nextLetterIndex = 0
    this.health = 3
    this.isGameOver = false

    // Set world bounds for side-scrolling
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, height)

    // Create platforms
    this.platforms = this.physics.add.staticGroup()
    
    // Ground (full world width)
    const ground = this.add.rectangle(WORLD_WIDTH / 2, height - 20, WORLD_WIDTH, 40, 0x4a4a4a)
    this.platforms.add(ground)
    
    // Platforms spread across the level
    this.platforms.add(this.add.rectangle(200, 450, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(500, 350, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(800, 400, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(1100, 300, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(1400, 450, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(1700, 350, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(2000, 400, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(2200, 300, 150, 20, 0x4a4a4a))

    // Create player
    this.player = this.add.rectangle(100, height - 100, 40, 60, 0x3498db)
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

    // Create DARBY targets
    this.createTargets()

    // Create letter displays at top of screen
    this.createLetterDisplays()

    // Create health display
    this.healthDisplay = this.add.text(this.scale.width / 2, 80, '❤️❤️❤️', {
      fontSize: '32px',
    }).setOrigin(0.5).setScrollFactor(0)

    // Create power-up
    this.createPowerUp()

    // Camera follows player
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, height)
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // Win text (hidden initially)
    this.winText = this.add.text(this.scale.width / 2, this.scale.height / 2, '🎉 YOU WIN! 🎉', {
      fontSize: '64px',
      fontFamily: 'Arial Black',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)

    // Lose text (hidden initially)
    this.loseText = this.add.text(this.scale.width / 2, this.scale.height / 2, '💔 TRY AGAIN! 💔', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)

    // Power-up indicator (hidden initially)
    this.powerUpIndicator = this.add.text(this.scale.width / 2, 120, '🔥 SPRAY MODE 🔥', {
      fontSize: '24px',
      fontFamily: 'Arial Black',
      color: '#00ffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setVisible(false)

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
    }

    // Create touch controls
    this.createTouchControls()
  }

  createLetterDisplays() {
    this.letterDisplays = []
    const totalWidth = this.letters.length * 50
    const startX = (this.scale.width - totalWidth) / 2 + 25
    
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
    this.targets = []
    
    // Generate random positions for each target
    // D is always in the first third, others are randomized across the rest
    const positions: { x: number; y: number }[] = []
    
    // D gets a position in the first third of the world (so it's findable first)
    positions.push({
      x: Phaser.Math.Between(200, WORLD_WIDTH / 3),
      y: Phaser.Math.Between(150, this.scale.height - 150)
    })
    
    // A, R, B, Y get randomized positions across the rest of the world
    for (let i = 1; i < this.letters.length; i++) {
      positions.push({
        x: Phaser.Math.Between(WORLD_WIDTH / 3, WORLD_WIDTH - 100),
        y: Phaser.Math.Between(150, this.scale.height - 150)
      })
    }
    
    // Shuffle positions for A, R, B, Y (indices 1-4) so they're not in order
    for (let i = positions.length - 1; i > 1; i--) {
      const j = Phaser.Math.Between(1, i)
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }
    
    for (let i = 0; i < this.letters.length; i++) {
      const { x, y } = positions[i]
      
      const circle = this.add.circle(x, y, 30, 0xff00ff)
      const label = this.add.text(x, y, this.letters[i], {
        fontSize: '32px',
        fontFamily: 'Arial Black',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5)
      
      this.targets.push({ circle, letter: this.letters[i], label })
    }
  }

  createPowerUp() {
    const x = Phaser.Math.Between(WORLD_WIDTH * 0.3, WORLD_WIDTH * 0.7)
    const y = Phaser.Math.Between(150, this.scale.height - 150)
    this.powerUp = this.add.circle(x, y, 20, 0x00ffff)
    
    this.tweens.add({
      targets: this.powerUp,
      scale: 1.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    })
  }

  createTouchControls() {
    const { height } = this.scale
    const btnY = height - 80
    const btnRadius = 40

    this.input.addPointer(1)

    // Reset button (top left)
    this.resetBtn = this.add.circle(40, 40, 30, 0xffaa00, 0.5).setScrollFactor(0)
    this.add.text(40, 40, '↺', { fontSize: '32px' }).setOrigin(0.5).setScrollFactor(0)

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
    }
  }

  update() {
    this.updateTouchState()

    // Reset button always works
    const resetPressed = this.touchState.reset
    if (resetPressed && !this.resetWasPressed) {
      this.scene.restart()
    }
    this.resetWasPressed = resetPressed

    // Don't process other inputs if game over
    if (this.isGameOver) return
    
    const onGround = this.playerBody.blocked.down

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

    // Shoot
    const shootPressed = this.cursors?.space.isDown || this.touchState.shoot
    if (shootPressed && !this.shootWasPressed && this.projectiles.countActive() < this.MAX_PROJECTILES) {
      this.shoot()
    }
    this.shootWasPressed = shootPressed

    // Relocate targets
    const newTargetPressed = this.touchState.newTarget
    if (newTargetPressed && !this.newTargetWasPressed) {
      this.relocateTargets()
    }
    this.newTargetWasPressed = newTargetPressed

    // Update facing indicator
    const indicatorOffsetX = this.facingRight ? 25 : -25
    this.facingIndicator.setPosition(this.player.x + indicatorOffsetX, this.player.y)
    this.facingIndicator.setScale(this.facingRight ? 1 : -1, 1)

    // Check power-up collection
    if (this.powerUp.active && Phaser.Geom.Intersects.RectangleToRectangle(
      this.player.getBounds(),
      this.powerUp.getBounds()
    )) {
      this.collectPowerUp()
    }

    // Check collisions
    this.checkProjectileCollisions()
    this.checkEnemyProjectileCollisions()
  }

  checkProjectileCollisions() {
    const camLeft = this.cameras.main.scrollX - 50
    const camRight = this.cameras.main.scrollX + this.scale.width + 50
    
    const toDestroy: Phaser.GameObjects.GameObject[] = []
    
    this.projectiles.getChildren().forEach((p) => {
      const projectile = p as Phaser.GameObjects.Rectangle
      
      if (projectile.x < camLeft || projectile.x > camRight) {
        toDestroy.push(projectile)
        return
      }
      
      for (const target of this.targets) {
        if (target.circle.active && Phaser.Geom.Intersects.RectangleToRectangle(
          projectile.getBounds(),
          target.circle.getBounds()
        )) {
          toDestroy.push(projectile)
          
          // Check if this is the correct next letter
          const expectedLetter = this.letters[this.nextLetterIndex]
          
          if (target.letter === expectedLetter) {
            // Correct letter hit!
            this.letterDisplays[this.nextLetterIndex].setText(target.letter)
            this.letterDisplays[this.nextLetterIndex].setColor('#00ff00')
            target.circle.destroy()
            target.label.destroy()
            this.nextLetterIndex++
            
            if (this.nextLetterIndex >= this.letters.length) {
              this.winText.setVisible(true)
              this.isGameOver = true
            }
          } else {
            // Wrong letter - target shoots back!
            this.targetShootsBack(target.circle.x, target.circle.y)
          }
          break
        }
      }
    })
    
    toDestroy.forEach((p) => p.destroy())
  }

  checkEnemyProjectileCollisions() {
    const toDestroy: Phaser.GameObjects.GameObject[] = []
    
    this.enemyProjectiles.getChildren().forEach((p) => {
      const projectile = p as Phaser.GameObjects.Rectangle
      
      // Check if off screen
      if (projectile.x < 0 || projectile.x > WORLD_WIDTH) {
        toDestroy.push(projectile)
        return
      }
      
      // Check if hits player
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        projectile.getBounds(),
        this.player.getBounds()
      )) {
        toDestroy.push(projectile)
        this.takeDamage()
      }
    })
    
    toDestroy.forEach((p) => p.destroy())
  }

  targetShootsBack(fromX: number, fromY: number) {
    const projectile = this.add.rectangle(fromX, fromY, 15, 8, 0xff0000)
    this.enemyProjectiles.add(projectile)
    const body = projectile.body as Phaser.Physics.Arcade.Body
    body.setAllowGravity(false)
    
    // Shoot toward player
    const dirX = this.player.x - fromX
    const dirY = this.player.y - fromY
    const length = Math.sqrt(dirX * dirX + dirY * dirY)
    body.setVelocity((dirX / length) * 300, (dirY / length) * 300)
  }

  takeDamage() {
    this.health--
    this.updateHealthDisplay()
    
    // Flash player red
    this.player.setFillStyle(0xff0000)
    this.time.delayedCall(200, () => {
      if (this.player.active) this.player.setFillStyle(0x3498db)
    })
    
    if (this.health <= 0) {
      this.isGameOver = true
      this.loseText.setVisible(true)
    }
  }

  updateHealthDisplay() {
    const hearts = '❤️'.repeat(this.health) + '🖤'.repeat(3 - this.health)
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
      const projectile = this.add.rectangle(baseX, this.player.y, 10, 5, 0x00ffff)
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

  relocateTargets() {
    for (const target of this.targets) {
      if (target.circle.active) {
        const x = Phaser.Math.Between(100, WORLD_WIDTH - 100)
        const y = Phaser.Math.Between(150, this.scale.height - 150)
        target.circle.setPosition(x, y)
        target.label.setPosition(x, y)
      }
    }
  }
}
