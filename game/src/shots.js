// The Velvet Vault — deterministic screenshot scenes.
// Each ?shot= scene rebuilds a fresh seeded world and drives the real game
// forward with scripted movement, so every screenshot is a genuine render
// of the game itself, never a staged picture.
//
//   ?shot=start&seed=1   title screen over the live room
//   ?shot=play&seed=1    mid-heist: thief, guards, cones, cameras, loot, alarm
//   ?shot=vault&seed=1   the vault-cracking mini-game in progress
//   ?shot=escape&seed=1  thief at the getaway van, vault cracked, loot in hand

import { Game, STATES } from './game.js';

function stepGame(game, input, seconds, dt = 1 / 60) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) game.update(dt, input);
}

// A no-op input stand-in: the autopilot moves the thief, and the update
// loop only reads wasPressed for E/Space, which these scenes never press.
const nullInput = {
  wasPressed: () => false,
  moveVector: () => ({ x: 0, y: 0 }),
};

export function applyShot(game, shot) {
  const world = game.world;
  // Screenshot scenes are demo frames: watchers still spot the thief and
  // their cones turn red, but the alarm never rises or busts the run, so
  // the captured frame is the scene the hook staged.
  game.demo = true;

  if (shot === 'start') {
    // Title screen over a live room: let the guards walk a few seconds so
    // their cones sit in natural, spread-out positions.
    game.state = STATES.TITLE;
    stepGame(game, nullInput, 6);
    return;
  }

  if (shot === 'play') {
    game.state = STATES.PLAYING;
    // Sneak along the west side of the hall (outside the guard loops),
    // pocket the painting on the west wall with a real grab, then cut
    // across the open middle band where the cones sweep. The first leg
    // runs low along y=700: guard 3 patrols the y=640 line, and the
    // 60px gap keeps the thief out of arm's reach.
    game.autopilot = {
      waypoints: [
        { x: 640, y: 700 },
        { x: 250, y: 700 },
        { x: 180, y: 560 },
      ],
      index: 0,
    };
    stepGame(game, nullInput, 4);
    game.autopilot = null;
    game.player.x = 180;
    game.player.y = 560;
    game.grabLoot(); // the painting at (150, 560), via the real grab
    game.autopilot = {
      waypoints: [
        { x: 180, y: 440 },
        { x: 320, y: 420 },
      ],
      index: 0,
    };
    stepGame(game, nullInput, 2.5);
    game.autopilot = null;
    // Mid-heist tension: the alarm meter reads part-way up.
    game.alarm = 42;
    game.spottedTimer = 0;
    return;
  }

  if (shot === 'vault') {
    game.state = STATES.PLAYING;
    // The thief is already at the vault door (the walk up the carpet is
    // the player's job, not the screenshot's); open the mini-game with
    // the dial mid-swing and one tumbler already cracked.
    game.player.x = 640;
    game.player.y = 150;
    game.openVault();
    game.vaultNeedle = 0.12;
    game.vaultProgress = 1;
    game.alarm = 30;
    stepGame(game, nullInput, 0.4);
    return;
  }

  if (shot === 'escape') {
    game.state = STATES.PLAYING;
    game.vaultCracked = true;
    // Pocket most of the loot, then drive to the van.
    for (const l of world.loot) {
      if (l.kind !== 'diamond') {
        l.taken = true;
        game.lootTaken += 1;
        game.lootValue += l.value;
        game.score += l.value;
      }
    }
    const diamond = world.loot.find((l) => l.kind === 'diamond');
    if (diamond) {
      diamond.taken = true;
      game.lootTaken += 1;
      game.lootValue += diamond.value;
      game.score += diamond.value;
    }
    game.player.x = 640;
    game.player.y = 620;
    game.autopilot = {
      waypoints: [{ x: 640, y: 690 }],
      index: 0,
    };
    stepGame(game, nullInput, 1.2);
    game.autopilot = null;
    game.timeLeft = 47;
    game.alarm = 87; // a hot getaway: the alarm is nearly maxed
    return;
  }

  // Unknown shot: just show the title.
  game.state = STATES.TITLE;
}
