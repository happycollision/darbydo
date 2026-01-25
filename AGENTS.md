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
2. **DARBY spelling mechanic**: 5 targets with letters D, A, R, B, Y — must shoot in order
3. **D is always in first third** of world; other letters randomized across the rest
4. **Wrong letter = target shoots back** at player
5. **Health system**: 3 hearts, lose one when hit by enemy projectile
6. **Win condition**: Spell DARBY correctly → show "YOU WIN!"
7. **Lose condition**: Health = 0 → show "TRY AGAIN!"
8. **Max 3 projectiles** on screen at once
9. **Side-scrolling**: World width 2400px, camera follows player
10. **Version polling**: App checks version.json every 30s and reloads on update
11. **Reset button** restarts the scene
12. **Spray power-up**: Cyan orb gives 5-projectile spread shot for 15 seconds

## Code Map

### src/main.ts
- Phaser game config (scale, physics, scenes)
- Version polling for auto-reload on deploy

### src/scenes/BootScene.ts
- "Tap to Start" screen (required for iOS audio autoplay restrictions)

### src/scenes/GameScene.ts (~500 lines)
Main gameplay file, organized as:

| Section | Purpose |
|---------|---------|
| Constants | `WORLD_WIDTH`, `DARBY_LETTERS` |
| Class properties | Player, platforms, projectiles, targets, health, UI elements, input state |
| `create()` | Sets up world, platforms, player, targets, camera, UI, health display |
| `createLetterDisplays()` | Creates `_ _ _ _ _` display at top |
| `createTargets()` | Spawns 5 lettered targets (D in first third, others randomized) |
| `createPowerUp()` | Spawns spray power-up with pulsing effect |
| `createTouchControls()` | Creates touch buttons with scrollFactor(0) |
| `updateTouchState()` | Reads all pointers, sets boolean input flags |
| `update()` | Main loop: movement, jump, shoot, collisions |
| `checkProjectileCollisions()` | Hit detection + correct/wrong letter logic + win condition |
| `checkEnemyProjectileCollisions()` | Enemy projectile → player damage |
| `targetShootsBack()` | Fires red projectile at player |
| `takeDamage()` | Reduces health, flashes player, checks lose condition |
| `shoot()` / `shootSingle()` / `shootSpray()` | Player projectile spawning |
| `collectPowerUp()` | Activates spray mode for 15 seconds |
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
- [ ] D target is in first third of world
- [ ] Other letters (A, R, B, Y) are randomized, not in order
- [ ] Hitting correct letter fills in display and destroys target
- [ ] Hitting wrong letter causes target to shoot back
- [ ] Getting hit reduces health
- [ ] Win text appears after spelling DARBY
- [ ] Lose text appears when health = 0
- [ ] Spray power-up works for 15 seconds
- [ ] Projectiles clean up off-screen
- [ ] Camera follows player through side-scrolling world
- [ ] `bun run build` succeeds with no TypeScript errors
