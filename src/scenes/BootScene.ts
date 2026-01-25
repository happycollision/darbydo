import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    const { width, height } = this.scale

    // Title
    this.add.text(width / 2, height / 5, '🦸 DARBY DO! 🦸', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5)

    // Instructions
    this.add.text(width / 2, height / 3, 'Choose who to play:', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    // Darby button
    const darbyBtn = this.add.rectangle(width / 2, height / 2, 300, 80, 0x3498db)
      .setInteractive({ useHandCursor: true })
    this.add.text(width / 2, height / 2, '👦 DARBY', {
      fontSize: '36px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    // Trilby button
    const trilbyBtn = this.add.rectangle(width / 2, height / 2 + 120, 300, 80, 0xe74c3c)
      .setInteractive({ useHandCursor: true })
    this.add.text(width / 2, height / 2 + 120, '👧 TRILBY', {
      fontSize: '36px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)

    // Button hover effects
    darbyBtn.on('pointerover', () => darbyBtn.setFillStyle(0x5dade2))
    darbyBtn.on('pointerout', () => darbyBtn.setFillStyle(0x3498db))
    trilbyBtn.on('pointerover', () => trilbyBtn.setFillStyle(0xec7063))
    trilbyBtn.on('pointerout', () => trilbyBtn.setFillStyle(0xe74c3c))

    // Start game with selected mode
    darbyBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { letters: ['D', 'A', 'R', 'B', 'Y'], name: 'DARBY' })
    })

    trilbyBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { letters: ['T', 'R', 'I', 'L', 'B', 'Y'], name: 'TRILBY' })
    })
  }
}
