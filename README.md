# Darby Do!

A simple Megaman-style platformer for a 4-year-old, built with Phaser 3 + TypeScript + Vite.

**Play it:** https://happycollision.github.io/darbydo/

## Controls

**Keyboard:**
- Arrow keys: move left/right, jump (up)
- Space: shoot

**Touch (iPad):**
- Left/Right buttons: move
- JUMP button: jump
- SHOOT button: fire projectile
- ↺ (top left): reset game
- 🎯 (top right): relocate remaining targets

## Goal

Destroy all 5 pink targets to win!

## Development

```bash
bun install
bun run dev      # Start dev server
bun run build    # Build for production
```

## Deploy

```bash
./deploy.sh      # Builds, bumps version, pushes to gh-pages
```

The game auto-reloads on iPads when a new version is deployed (polls version.json every 30s).

## Code Map

| File | Purpose |
|------|---------|
| `src/main.ts` | Phaser config, scale/physics settings, version polling |
| `src/scenes/BootScene.ts` | "Tap to Start" screen (required for iOS audio) |
| `src/scenes/GameScene.ts` | All gameplay: player, platforms, targets, controls, win condition |

### Main Tunables (in GameScene.ts)

- `WORLD_WIDTH` — side-scrolling world size (default: 2400)
- `TARGET_COUNT` — targets to destroy to win (default: 5)
- `MAX_PROJECTILES` — max bullets on screen (default: 3)
- Jump velocity: `-550`
- Move speed: `200`
- Projectile speed: `400`

## Future Ideas

- [ ] Add sprite for the player (photos of Darby!)
- [ ] Add enemies that move
- [ ] Add sound effects
- [ ] Add health/lives
- [ ] Multiple levels
- [ ] Collectible items
