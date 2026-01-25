# AI Agent Instructions

## Project Goal & Constraints

- **Audience**: 4-year-old child playing on iPad
- **Style**: Simple Megaman-style platformer
- **Complexity**: Keep it minimal; avoid big refactors
- **Platform**: Must work well on mobile Safari with touch controls
- **Physics**: Phaser 3 Arcade physics only

## Tech Stack

- Phaser 3.80
- TypeScript
- Vite (build tool)
- Bun (package manager)
- GitHub Pages (hosting via gh-pages branch)

## Commands

```bash
bun run dev      # Development server
bun run build    # Production build
./deploy.sh      # Build and deploy to GitHub Pages
```

## Important Behaviors (Do Not Break)

1. **Touch controls are primary** — multi-touch must work (move + jump simultaneously)
2. **Win condition**: Destroy all 5 targets → show "YOU WIN!" text
3. **Max 3 projectiles** on screen at once
4. **Side-scrolling**: World width 2400px, camera follows player
5. **Version polling**: App checks version.json every 30s and reloads on update
6. **Reset button** restarts the scene

## Code Map

### src/main.ts
- Phaser game config (scale, physics, scenes)
- Version polling for auto-reload on deploy

### src/scenes/BootScene.ts
- "Tap to Start" screen (required for iOS audio autoplay restrictions)

### src/scenes/GameScene.ts (~300 lines)
Main gameplay file, organized as:

| Section | Purpose |
|---------|---------|
| Constants | `WORLD_WIDTH`, `TARGET_COUNT` |
| Class properties | Player, platforms, projectiles, targets, UI elements, input state |
| `create()` | Sets up world, platforms, player, targets, camera, UI |
| `createTargets()` | Spawns 5 targets spread across world |
| `createTouchControls()` | Creates touch buttons with scrollFactor(0) |
| `updateTouchState()` | Reads all pointers, sets boolean input flags |
| `update()` | Main loop: movement, jump, shoot, collisions |
| `checkProjectileCollisions()` | Hit detection + cleanup + win condition |
| `shoot()` | Spawns projectile with velocity |
| `relocateTargets()` | Moves remaining active targets |

## Preferred Change Patterns

1. Add new features as small helper methods
2. Keep `update()` short — delegate to helper methods
3. Don't introduce new libraries without asking
4. If splitting files, only when it clearly reduces confusion
5. Use existing patterns (e.g., `wasPressed` for single-fire inputs)

## Testing Checklist

After changes, verify:
- [ ] Touch: Can hold move + tap jump/shoot simultaneously
- [ ] Reset button works
- [ ] Win text appears after destroying all targets
- [ ] Projectiles clean up off-screen
- [ ] Camera follows player through side-scrolling world
- [ ] `bun run build` succeeds with no TypeScript errors
