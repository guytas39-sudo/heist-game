// The Velvet Vault — tuning constants for the whole game.
// One place for every number that shapes how the heist feels.

export const VIEW_W = 1280;
export const VIEW_H = 800;

// The playfield is the canvas itself; the vault room fills it with a margin.
export const ROOM = { x: 40, y: 96, w: 1200, h: 640 };

export const PLAYER_SPEED = 215; // px per second while sneaking
export const PLAYER_RADIUS = 14;

export const GUARD_SPEED = 62;
export const GUARD_RADIUS = 15;
export const GUARD_VIEW_DIST = 235;
export const GUARD_VIEW_HALF_ANGLE = 0.52; // radians either side of facing

export const CAMERA_VIEW_DIST = 260;
export const CAMERA_VIEW_HALF_ANGLE = 0.42;
export const CAMERA_SWEEP_SPEED = 0.55; // radians per second

export const ALARM_MAX = 100;
export const ALARM_GAIN_PER_SEC = 22; // while any watcher sees the thief:
// about four seconds of exposure to bust from zero, so a spotted thief
// can still duck behind cover — a caught moment should feel fair
export const ALARM_DECAY_PER_SEC = 9; // while unseen
export const ALARM_SPOT_BONUS = 8; // instant bump the moment a watcher spots you

export const TIME_LIMIT_SEC = 180;

export const VAULT_CRACKS_NEEDED = 3;

// Loot catalogue: name, value in dollars, colour used on the floor and HUD.
export const LOOT_KINDS = {
  painting: { value: 1500, color: '#e8b64c' },
  gold: { value: 2500, color: '#ffd94d' },
  diamond: { value: 6000, color: '#7fe3ff' },
};

// How long (seconds) the "SPOTTED!" banner lingers after a watcher loses you.
export const SPOTTED_BANNER_SEC = 1.2;
