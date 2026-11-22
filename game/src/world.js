// The Velvet Vault — builds the heist floor from a seed.
// One big vault hall: marble floor, display cases and crates as cover,
// patrolling guards, sweeping wall cameras, loot on pedestals, the vault
// door at the far end and the getaway van waiting outside the exit.

import { ROOM, LOOT_KINDS } from './config.js';
import { mulberry32, range, pick } from './random.js';

// Axis-aligned rectangle helper used for walls and cover.
export function rect(x, y, w, h) {
  return { x, y, w, h };
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Does a circle at (x, y) with radius r overlap any solid rectangle?
export function hitsSolid(world, x, y, r) {
  for (const s of world.solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Line-of-sight between two points, blocked by solid rectangles.
// Sampled in small steps; cheap and good enough for vision cones.
export function lineBlocked(world, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    for (const s of world.solids) {
      if (pointInRect(px, py, s)) return true;
    }
  }
  return false;
}

export function buildWorld(seed) {
  const rng = mulberry32(seed);
  const world = {
    seed,
    // Solid rectangles: the outer walls are handled by clamping, these are
    // the interior cover pieces (display cases, crates, pillars).
    solids: [],
    guards: [],
    cameras: [],
    loot: [],
    // The vault door sits on the top wall; the van waits below the exit.
    vault: { x: ROOM.x + ROOM.w / 2 - 90, y: ROOM.y, w: 180, h: 26 },
    van: { x: ROOM.x + ROOM.w / 2 - 70, y: ROOM.y + ROOM.h + 14, w: 140, h: 52 },
    exit: { x: ROOM.x + ROOM.w / 2 - 60, y: ROOM.y + ROOM.h - 6, w: 120, h: 12 },
    spawn: { x: ROOM.x + ROOM.w / 2, y: ROOM.y + ROOM.h - 60 },
  };

  // --- Cover: a scatter of display cases and crates, kept out of the
  // spawn lane, the vault approach and the loot pedestals.
  const coverSpots = [
    [300, 250, 150, 46], [560, 210, 46, 150], [830, 300, 150, 46],
    [240, 470, 46, 130], [470, 460, 150, 46], [760, 500, 46, 130],
    [980, 470, 150, 46], [1080, 210, 46, 130], [380, 620, 150, 46],
    [880, 620, 150, 46],
  ];
  for (const [cx, cy, cw, ch] of coverSpots) {
    world.solids.push(rect(cx, cy, cw, ch));
  }
  // Two round pillars in the middle of the hall (drawn as circles, solid
  // as a small square so collision stays rectangular).
  world.solids.push(rect(620, 330, 44, 44));
  world.solids.push(rect(620, 540, 44, 44));
  // The vault door itself is solid: you cannot walk through it, and it
  // blocks the top camera's sightline to a thief working the dial.
  world.solids.push(rect(world.vault.x, world.vault.y, world.vault.w, world.vault.h));
  world.pillars = [
    { x: 642, y: 352, r: 26 },
    { x: 642, y: 562, r: 26 },
  ];

  // --- Guards: patrol waypoints drawn as loops around the hall.
  // The loops are threaded between the display cases and pillars (a guard
  // must never walk through solid cover), and the two lower loops stop
  // short of the centre carpet, so the spawn and the carpet route are
  // watched by the cameras rather than walked by a guard.
  const patrols = [
    [
      { x: 200, y: 180 }, { x: 520, y: 180 }, { x: 520, y: 380 }, { x: 200, y: 380 },
    ],
    [
      { x: 1040, y: 180 }, { x: 760, y: 180 }, { x: 760, y: 380 }, { x: 1040, y: 380 },
    ],
    [
      { x: 300, y: 600 }, { x: 430, y: 600 }, { x: 430, y: 470 }, { x: 300, y: 470 },
    ],
    [
      { x: 980, y: 600 }, { x: 740, y: 600 }, { x: 740, y: 470 }, { x: 960, y: 470 },
    ],
  ];
  patrols.forEach((waypoints, i) => {
    const start = waypoints[0];
    world.guards.push({
      id: i,
      x: start.x,
      y: start.y,
      angle: range(rng, 0, Math.PI * 2),
      waypointIndex: 1,
      waypoints,
      pause: 0,
      // Each guard pauses at waypoints for a slightly different beat.
      pauseTime: 0.9 + rng() * 1.1,
      spotted: false,
    });
  });

  // --- Wall cameras: mounted on the top and side walls, sweeping arcs.
  const cameraDefs = [
    { x: 260, y: ROOM.y + 4, base: Math.PI / 2, sweep: 0.85, phase: 0 },
    { x: 640, y: ROOM.y + 4, base: Math.PI / 2, sweep: 0.7, phase: 1.4 },
    { x: 1020, y: ROOM.y + 4, base: Math.PI / 2, sweep: 0.85, phase: 2.6 },
    { x: ROOM.x + 4, y: 420, base: 0, sweep: 0.7, phase: 0.7 },
    { x: ROOM.x + ROOM.w - 4, y: 420, base: Math.PI, sweep: 0.7, phase: 2.1 },
  ];
  cameraDefs.forEach((c, i) => {
    world.cameras.push({ ...c, id: i, angle: c.base, spotted: false });
  });

  // --- Loot: paintings on the side walls, gold on pedestals, the diamond
  // inside the vault (only reachable once the vault is cracked).
  const lootDefs = [
    { kind: 'painting', x: 150, y: 250 },
    { kind: 'painting', x: 1130, y: 250 },
    { kind: 'painting', x: 150, y: 560 },
    { kind: 'gold', x: 430, y: 300 },
    { kind: 'gold', x: 850, y: 560 },
    { kind: 'gold', x: 700, y: 210 },
    { kind: 'diamond', x: 640, y: 150, inVault: true },
  ];
  lootDefs.forEach((l, i) => {
    world.loot.push({
      id: i,
      kind: l.kind,
      x: l.x,
      y: l.y,
      value: LOOT_KINDS[l.kind].value,
      inVault: !!l.inVault,
      taken: false,
      bobPhase: rng() * Math.PI * 2,
    });
  });

  // A couple of wall torches for flavour (pure decoration).
  world.torches = [
    { x: 120, y: 160 }, { x: 1160, y: 160 },
    { x: 120, y: 660 }, { x: 1160, y: 660 },
  ];

  // Random flavour: which paintings hang where changes with the seed.
  world.paintingStyle = pick(rng, ['sunset', 'portrait', 'seascape']);

  return world;
}
