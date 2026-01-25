import Phaser from 'phaser'

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
  private touchState = { left: false, right: false, jump: false, shoot: false, newTarget: false }
  private jumpWasPressed = false
  private shootWasPressed = false
  private newTargetWasPressed = false
  
  // Projectiles
  private projectiles!: Phaser.Physics.Arcade.Group
  private facingRight = true
  private readonly MAX_PROJECTILES = 3
  
  // Player facing indicator
  private facingIndicator!: Phaser.GameObjects.Triangle
  
  // Target
  private target!: Phaser.GameObjects.Arc
  private newTargetBtn!: Phaser.GameObjects.Arc

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    const { width, height } = this.scale

    // Create platforms
    this.platforms = this.physics.add.staticGroup()
    
    // Ground
    const ground = this.add.rectangle(width / 2, height - 20, width, 40, 0x4a4a4a)
    this.platforms.add(ground)
    
    // Some platforms
    this.platforms.add(this.add.rectangle(200, 450, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(500, 350, 150, 20, 0x4a4a4a))
    this.platforms.add(this.add.rectangle(300, 250, 150, 20, 0x4a4a4a))

    // Create player (placeholder rectangle - replace with sprite later)
    this.player = this.add.rectangle(100, height - 100, 40, 60, 0x3498db)
    this.physics.add.existing(this.player)
    this.playerBody = this.player.body as Phaser.Physics.Arcade.Body
    this.playerBody.setCollideWorldBounds(true)
    
    // Facing indicator (small triangle pointing in direction)
    this.facingIndicator = this.add.triangle(0, 0, 0, 0, 12, 8, 0, 16, 0xffffff)

    // Collisions
    this.physics.add.collider(this.player, this.platforms)

    // Projectiles group
    this.projectiles = this.physics.add.group()

    // Create target (start near ground for easy testing)
    this.target = this.add.circle(400, height - 80, 25, 0xff00ff)
    this.physics.add.existing(this.target, true)

    // Keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys()
    }

    // Create touch controls
    this.createTouchControls()
  }

  createTouchControls() {
    const { height } = this.scale
    const btnY = height - 80
    const btnRadius = 40

    // Enable multi-touch
    this.input.addPointer(1)

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

    // New target button (only on initial press)
    const newTargetPressed = this.touchState.newTarget
    if (newTargetPressed && !this.newTargetWasPressed) {
      this.spawnTarget()
    }
    this.newTargetWasPressed = newTargetPressed

    // Update facing indicator position
    const indicatorOffsetX = this.facingRight ? 25 : -25
    this.facingIndicator.setPosition(this.player.x + indicatorOffsetX, this.player.y)
    this.facingIndicator.setScale(this.facingRight ? 1 : -1, 1)

    // Check projectile-target collisions and clean up off-screen projectiles
    const toDestroy: Phaser.GameObjects.GameObject[] = []
    this.projectiles.getChildren().forEach((p) => {
      const projectile = p as Phaser.GameObjects.Rectangle
      if (projectile.x < -20 || projectile.x > this.scale.width + 20) {
        toDestroy.push(projectile)
      } else if (this.target.active && Phaser.Geom.Intersects.RectangleToRectangle(
        projectile.getBounds(),
        this.target.getBounds()
      )) {
        toDestroy.push(projectile)
        this.spawnTarget()
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

  spawnTarget() {
    const { width, height } = this.scale
    const margin = 60
    const x = Phaser.Math.Between(margin, width - margin)
    const y = Phaser.Math.Between(100, height - 150)
    
    // Destroy old target and create new one
    this.target.destroy()
    this.target = this.add.circle(x, y, 25, 0xff00ff)
    this.physics.add.existing(this.target, true)
  }
}
