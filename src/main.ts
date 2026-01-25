import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene'
import { GameScene } from './scenes/GameScene'

// Poll for updates and reload when version changes
async function checkForUpdates() {
  try {
    const response = await fetch('./version.json?t=' + Date.now())
    const data = await response.json()
    const currentVersion = localStorage.getItem('appVersion')
    
    if (currentVersion && currentVersion !== data.version) {
      localStorage.setItem('appVersion', data.version)
      window.location.reload()
    } else if (!currentVersion) {
      localStorage.setItem('appVersion', data.version)
    }
  } catch {
    // Ignore fetch errors
  }
}

checkForUpdates()
setInterval(checkForUpdates, 30000)

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 800,
  height: 600,
  render: {
    powerPreference: 'high-performance',
    antialias: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
  backgroundColor: '#87CEEB',
}

new Phaser.Game(config)
