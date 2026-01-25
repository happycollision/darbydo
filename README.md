# Darby Do!

A simple Megaman-style platformer for a 4-year-old, built with Phaser 3 + TypeScript + Vite.

**Play it:** https://happycollision.github.io/darbydo/

## Game Modes

Choose your character at the start screen:

| Mode | Difficulty | Letters | Notes |
|------|------------|---------|-------|
| 👦 **Darby** | Easy | D-A-R-B-Y | Targets move slowly, shoot horizontal |
| 👧 **Trilby** | No jumping | T-R-I-L-B-Y | Stationary targets, just shake when wrong |
| 👨 **Marvin** | Hard | M-A-R-V-I-N | Targets move fast, shoot aimed + randomly |

## Goal

Spell the name by shooting letter targets **in order**! The first letter is always in the first third of the level.

- ✅ Hit the correct letter → it fills in at the top
- ❌ Hit the wrong letter → response varies by difficulty
- 💔 Lose all 3 hearts → Game Over

## Controls

**Keyboard:**
- Arrow keys: move left/right, jump (up)
- Space: shoot

**Touch (iPad):**
- Left/Right buttons: move
- JUMP button: jump
- SHOOT button: fire projectile
- ✕ (top left): exit to character select
- ↺ (top left): reset game
- 🎯 (top right): relocate remaining targets

## Power-Up

Collect the **cyan pulsing orb** to activate **Spray Mode** for 15 seconds — shoots 5 projectiles in a spread!

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
| `src/scenes/BootScene.ts` | Character selection screen |
| `src/scenes/GameScene.ts` | All gameplay: player, platforms, targets, health, controls |

### Main Tunables (in GameScene.ts)

- `WORLD_WIDTH` — side-scrolling world size (default: 2400)
- `MAX_PROJECTILES` — max bullets on screen (default: 3)
- Jump velocity: `-550`
- Move speed: `200`
- Projectile speed: `400` (retaliation), `150` (random shots)
- Health: 3 hearts

## Future Ideas

- [ ] Add sprite for the player (photos of the kids!)
- [ ] Add sound effects
- [ ] Collectible items
