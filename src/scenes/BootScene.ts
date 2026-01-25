import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    const { width, height } = this.scale

    // Title
    this.add.text(width / 2, height / 3, '🦸 DARBY DO! 🦸', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5)

    // Tap to start (required for iOS audio)
    const startText = this.add.text(width / 2, height / 2 + 50, 'TAP TO START', {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    // Pulsing animation
    this.tweens.add({
      targets: startText,
      scale: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
    })

    // Start game on tap/click
    this.input.once('pointerdown', () => {
      this.scene.start('GameScene')
    })
  }
}
