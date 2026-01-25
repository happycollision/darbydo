import Phaser from 'phaser'

const WORLD_WIDTH = 2400
const TARGET_COUNT = 5

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle
  private playerBody!: Phaser.Physics.Arcade.Body
  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  
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
  
  // Projectiles
  private projectiles!: Phaser.Physics.Arcade.Group
  private facingRight = true
  private readonly MAX_PROJECTILES = 3
  
  // Player facing indicator
  private facingIndicator!: Phaser.GameObjects.Triangle
  
  // Targets
  private targets: Phaser.GameObjects.Arc[] = []
  private targetsRemaining = TARGET_COUNT
  private winText!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { height } = this.scale

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

    // Projectiles group
    this.projectiles = this.physics.add.group()

    // Create targets spread across the world
    this.createTargets()

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

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
    }

    // Create touch controls
    this.createTouchControls()
  }

  createTargets() {
    this.targets = []
    this.targetsRemaining = TARGET_COUNT
    
    // Spread targets across the world
    const spacing = WORLD_WIDTH / (TARGET_COUNT + 1)
    for (let i = 0; i < TARGET_COUNT; i++) {
      const x = spacing * (i + 1)
      const y = Phaser.Math.Between(150, this.scale.height - 150)
      const target = this.add.circle(x, y, 25, 0xff00ff)
      this.targets.push(target)
    }
  }

  createTouchControls() {
    const { height } = this.scale
    const btnY = height - 80
    const btnRadius = 40

    // Enable multi-touch
    this.input.addPointer(1)

    // Reset button (top left)
    this.resetBtn = this.add.circle(40, 40, 30, 0xffaa00, 0.5)
      .setScrollFactor(0)
    this.add.text(40, 40, '↺', { fontSize: '32px' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Left button
    this.leftBtn = this.add.circle(80, btnY, btnRadius, 0x000000, 0.5)
      .setScrollFactor(0)
    this.add.text(80, btnY, '◀', { fontSize: '32px' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Right button
    this.rightBtn = this.add.circle(180, btnY, btnRadius, 0x000000, 0.5)
      .setScrollFactor(0)
    this.add.text(180, btnY, '▶', { fontSize: '32px' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Shoot button
    this.shootBtn = this.add.circle(620, btnY, btnRadius * 1.2, 0x00aa00, 0.5)
      .setScrollFactor(0)
    this.add.text(620, btnY, 'SHOOT', { fontSize: '16px', fontFamily: 'Arial Black' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Jump button
    this.jumpBtn = this.add.circle(720, btnY, btnRadius * 1.2, 0xff0000, 0.5)
      .setScrollFactor(0)
    this.add.text(720, btnY, 'JUMP', { fontSize: '20px', fontFamily: 'Arial Black' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // New target button (top right)
    this.newTargetBtn = this.add.circle(760, 40, 30, 0xff00ff, 0.5)
      .setScrollFactor(0)
    this.add.text(760, 40, '🎯', { fontSize: '24px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
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
      
      if (this.leftBtn.getBounds().contains(x, y)) {
        this.touchState.left = true
      }
      if (this.rightBtn.getBounds().contains(x, y)) {
        this.touchState.right = true
      }
      if (this.jumpBtn.getBounds().contains(x, y)) {
        this.touchState.jump = true
      }
      if (this.shootBtn.getBounds().contains(x, y)) {
        this.touchState.shoot = true
      }
      if (this.newTargetBtn.getBounds().contains(x, y)) {
        this.touchState.newTarget = true
      }
      if (this.resetBtn.getBounds().contains(x, y)) {
        this.touchState.reset = true
      }
    }
  }

  update() {
    this.updateTouchState()
    
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

    // Jump (only on initial press, not hold)
    if (jumpPressed && onGround && !this.jumpWasPressed) {
      this.playerBody.setVelocityY(-550)
    }
    this.jumpWasPressed = jumpPressed

    // Shoot (only on initial press, max 3 projectiles)
    const shootPressed = this.cursors?.space.isDown || this.touchState.shoot
    if (shootPressed && !this.shootWasPressed && this.projectiles.countActive() < this.MAX_PROJECTILES) {
      this.shoot()
    }
    this.shootWasPressed = shootPressed

    // New target button (only on initial press) - relocates remaining targets
    const newTargetPressed = this.touchState.newTarget
    if (newTargetPressed && !this.newTargetWasPressed) {
      this.relocateTargets()
    }
    this.newTargetWasPressed = newTargetPressed

    // Reset button (only on initial press)
    const resetPressed = this.touchState.reset
    if (resetPressed && !this.resetWasPressed) {
      this.scene.restart()
    }
    this.resetWasPressed = resetPressed

    // Update facing indicator position
    const indicatorOffsetX = this.facingRight ? 25 : -25
    this.facingIndicator.setPosition(this.player.x + indicatorOffsetX, this.player.y)
    this.facingIndicator.setScale(this.facingRight ? 1 : -1, 1)

    // Check projectile-target collisions and clean up off-screen projectiles
    this.checkProjectileCollisions()
  }

  checkProjectileCollisions() {
    const camLeft = this.cameras.main.scrollX - 50
    const camRight = this.cameras.main.scrollX + this.scale.width + 50
    
    const toDestroy: Phaser.GameObjects.GameObject[] = []
    
    this.projectiles.getChildren().forEach((p) => {
      const projectile = p as Phaser.GameObjects.Rectangle
      
      // Clean up off-screen projectiles
      if (projectile.x < camLeft || projectile.x > camRight) {
        toDestroy.push(projectile)
        return
      }
      
      // Check collision with each active target
      for (const target of this.targets) {
        if (target.active && Phaser.Geom.Intersects.RectangleToRectangle(
          projectile.getBounds(),
          target.getBounds()
        )) {
          toDestroy.push(projectile)
          target.destroy()
          this.targetsRemaining--
          
          if (this.targetsRemaining <= 0) {
            this.winText.setVisible(true)
          }
          break
        }
      }
    })
    
    toDestroy.forEach((p) => p.destroy())
  }

  shoot() {
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

  relocateTargets() {
    // Only relocate targets that are still active
    for (const target of this.targets) {
      if (target.active) {
        const x = Phaser.Math.Between(100, WORLD_WIDTH - 100)
        const y = Phaser.Math.Between(150, this.scale.height - 150)
        target.setPosition(x, y)
      }
    }
  }
}
