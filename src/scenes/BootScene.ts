import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create() {
    const { width, height } = this.scale

    // Title
    this.add.text(width / 2, height / 8, '🦸 DARBY DO! 🦸', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5)

    // Instructions
    this.add.text(width / 2, height / 4, 'Choose who to play:', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
    }).setOrigin(0.5)

    // Darby button (easiest)
    const darbyBtn = this.add.rectangle(width / 2, height / 2 - 80, 300, 70, 0x27ae60)
      .setInteractive({ useHandCursor: true })
    this.add.text(width / 2, height / 2 - 80, '👦 DARBY', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 - 45, '(easy)', {
      fontSize: '14px',
      color: '#aaffaa',
    }).setOrigin(0.5)

    // Trilby button (easy - no jumping)
    const trilbyBtn = this.add.rectangle(width / 2, height / 2 + 20, 300, 70, 0x3498db)
      .setInteractive({ useHandCursor: true })
    this.add.text(width / 2, height / 2 + 20, '👧 TRILBY', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 + 55, '(no jumping)', {
      fontSize: '14px',
      color: '#aaddff',
    }).setOrigin(0.5)

    // Marvin button (hard - original mode)
    const marvinBtn = this.add.rectangle(width / 2, height / 2 + 120, 300, 70, 0xe74c3c)
      .setInteractive({ useHandCursor: true })
    this.add.text(width / 2, height / 2 + 120, '👨 MARVIN', {
      fontSize: '32px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 + 155, '(hard)', {
      fontSize: '14px',
      color: '#ffaaaa',
    }).setOrigin(0.5)

    // Button hover effects
    darbyBtn.on('pointerover', () => darbyBtn.setFillStyle(0x2ecc71))
    darbyBtn.on('pointerout', () => darbyBtn.setFillStyle(0x27ae60))
    trilbyBtn.on('pointerover', () => trilbyBtn.setFillStyle(0x5dade2))
    trilbyBtn.on('pointerout', () => trilbyBtn.setFillStyle(0x3498db))
    marvinBtn.on('pointerover', () => marvinBtn.setFillStyle(0xec7063))
    marvinBtn.on('pointerout', () => marvinBtn.setFillStyle(0xe74c3c))

    // Start game with selected mode
    darbyBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { 
        letters: ['D', 'A', 'R', 'B', 'Y'], 
        name: 'DARBY',
        difficulty: 'easy'
      })
    })

    trilbyBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { 
        letters: ['T', 'R', 'I', 'L', 'B', 'Y'], 
        name: 'TRILBY',
        difficulty: 'noJump'
      })
    })

    marvinBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { 
        letters: ['M', 'A', 'R', 'V', 'I', 'N'], 
        name: 'MARVIN',
        difficulty: 'hard'
      })
    })
  }
}
