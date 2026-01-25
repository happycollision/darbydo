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
  private touchState = { left: false, right: false, jump: false }

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

    // Collisions
    this.physics.add.collider(this.player, this.platforms)

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

    // Left button
    this.leftBtn = this.add.circle(80, btnY, btnRadius, 0x000000, 0.5)
      .setScrollFactor(0)
      .setInteractive()
    this.add.text(80, btnY, '◀', { fontSize: '32px' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Right button
    this.rightBtn = this.add.circle(180, btnY, btnRadius, 0x000000, 0.5)
      .setScrollFactor(0)
      .setInteractive()
    this.add.text(180, btnY, '▶', { fontSize: '32px' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Jump button
    this.jumpBtn = this.add.circle(720, btnY, btnRadius * 1.2, 0xff0000, 0.5)
      .setScrollFactor(0)
      .setInteractive()
    this.add.text(720, btnY, 'JUMP', { fontSize: '20px', fontFamily: 'Arial Black' })
      .setOrigin(0.5)
      .setScrollFactor(0)

    // Touch events
    this.leftBtn.on('pointerdown', () => this.touchState.left = true)
    this.leftBtn.on('pointerup', () => this.touchState.left = false)
    this.leftBtn.on('pointerout', () => this.touchState.left = false)

    this.rightBtn.on('pointerdown', () => this.touchState.right = true)
    this.rightBtn.on('pointerup', () => this.touchState.right = false)
    this.rightBtn.on('pointerout', () => this.touchState.right = false)

    this.jumpBtn.on('pointerdown', () => this.touchState.jump = true)
    this.jumpBtn.on('pointerup', () => this.touchState.jump = false)
    this.jumpBtn.on('pointerout', () => this.touchState.jump = false)
  }

  update() {
    const onGround = this.playerBody.blocked.down

    // Horizontal movement
    const leftPressed = this.cursors?.left.isDown || this.touchState.left
    const rightPressed = this.cursors?.right.isDown || this.touchState.right
    const jumpPressed = this.cursors?.up.isDown || this.cursors?.space.isDown || this.touchState.jump

    if (leftPressed) {
      this.playerBody.setVelocityX(-200)
    } else if (rightPressed) {
      this.playerBody.setVelocityX(200)
    } else {
      this.playerBody.setVelocityX(0)
    }

    // Jump
    if (jumpPressed && onGround) {
      this.playerBody.setVelocityY(-400)
    }
  }
}
