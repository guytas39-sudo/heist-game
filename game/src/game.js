// The Velvet Vault — the game itself: state machine, patrols, vision,
// alarm, loot, the vault-cracking mini-game and the getaway.

import {
  VIEW_W, VIEW_H, ROOM, PLAYER_SPEED, PLAYER_RADIUS,
  GUARD_SPEED, GUARD_RADIUS, GUARD_VIEW_DIST, GUARD_VIEW_HALF_ANGLE,
  CAMERA_VIEW_DIST, CAMERA_VIEW_HALF_ANGLE, CAMERA_SWEEP_SPEED,
  ALARM_MAX, ALARM_GAIN_PER_SEC, ALARM_DECAY_PER_SEC, ALARM_SPOT_BONUS,
  TIME_LIMIT_SEC, VAULT_CRACKS_NEEDED, SPOTTED_BANNER_SEC,
} from './config.js';
import { buildWorld, hitsSolid, lineBlocked } from './world.js';

export const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  VAULT: 'vault',
  PAUSED: 'paused',
  WIN: 'win',
  BUSTED: 'busted',
};

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Can a watcher at (wx, wy) facing `angle` see the thief?
export function canSee(world, wx, wy, angle, halfAngle, dist, tx, ty) {
  const dx = tx - wx;
  const dy = ty - wy;
  const d = Math.hypot(dx, dy);
  if (d > dist) return false;
  if (d < 12) return true; // practically on top of the watcher
  const toTarget = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(toTarget, angle)) > halfAngle) return false;
  return !lineBlocked(world, wx, wy, tx, ty);
}

export class Game {
  constructor(seed) {
    this.seed = seed;
    this.world = buildWorld(seed);
    this.state = STATES.TITLE;
    this.prevState = STATES.TITLE;
    this.player = {
      x: this.world.spawn.x,
      y: this.world.spawn.y,
      angle: -Math.PI / 2,
      moving: false,
      stepTimer: 0,
    };
    this.alarm = 0;
    this.timeLeft = TIME_LIMIT_SEC;
    this.score = 0;
    this.lootTaken = 0;
    this.lootValue = 0;
    this.vaultCracked = false;
    this.vaultProgress = 0;
    this.vaultNeedle = 0; // -1..1 sweep position of the dial
    this.vaultNeedleDir = 1;
    this.vaultNeedleSpeed = 1.6;
    this.vaultZone = { center: 0, half: 0.22 }; // the green sweet spot
    this.vaultMessage = '';
    this.vaultMessageTimer = 0;
    this.elapsed = 0;
    this.spotted = false; // any watcher sees the thief right now
    this.spottedTimer = 0;
    this.alarmBlipTimer = 0;
    this.caughtBy = null; // 'guard' | 'camera' | 'alarm'
    this.winStats = null;
    this.autopilot = null; // { waypoints, index } for screenshot hooks
    this.demo = false; // screenshot scenes: watchers still spot you, but the
    // alarm never rises or busts the run, so the frame stays stable
    this.onSound = null; // set by main.js: (name) => void
  }

  sound(name) {
    if (this.onSound) this.onSound(name);
  }

  start() {
    this.state = STATES.PLAYING;
    this.sound('ui');
  }

  togglePause() {
    if (this.state === STATES.PLAYING) {
      this.prevState = STATES.PLAYING;
      this.state = STATES.PAUSED;
    } else if (this.state === STATES.PAUSED) {
      this.state = this.prevState;
    }
  }

  restart() {
    const fresh = new Game(this.seed);
    fresh.onSound = this.onSound;
    fresh.autopilot = this.autopilot;
    Object.assign(this, fresh);
    this.state = STATES.PLAYING;
  }

  // --- Vault mini-game -------------------------------------------------
  // The dial sweeps back and forth; press E when the needle is inside the
  // green zone. Three good hits crack the vault; a miss raises the alarm.
  openVault() {
    this.state = STATES.VAULT;
    this.vaultNeedle = -0.9;
    this.vaultNeedleDir = 1;
    this.vaultZone = { center: (Math.random() - 0.5) * 1.1, half: 0.2 };
    this.vaultMessage = 'Press E when the needle is in the green zone!';
    this.vaultMessageTimer = 3;
    this.sound('ui');
  }

  vaultAttempt() {
    const inside = Math.abs(this.vaultNeedle - this.vaultZone.center) <= this.vaultZone.half;
    if (inside) {
      this.vaultProgress += 1;
      this.sound('click-good');
      this.vaultNeedleSpeed += 0.35;
      if (this.vaultProgress >= VAULT_CRACKS_NEEDED) {
        this.vaultCracked = true;
        this.state = STATES.PLAYING;
        this.vaultMessage = '';
        this.sound('vault-open');
        // The diamond is now reachable.
      } else {
        this.vaultZone = { center: (Math.random() - 0.5) * 1.1, half: 0.2 };
        this.vaultMessage = `Tumbler ${this.vaultProgress} of ${VAULT_CRACKS_NEEDED} — nice!`;
        this.vaultMessageTimer = 1.5;
      }
    } else {
      this.sound('click-bad');
      this.alarm = clamp(this.alarm + 18, 0, ALARM_MAX);
      this.vaultMessage = 'Wrong! The alarm heard that.';
      this.vaultMessageTimer = 1.5;
      this.vaultNeedleSpeed = Math.max(1.4, this.vaultNeedleSpeed - 0.2);
    }
  }

  closeVault() {
    this.state = STATES.PLAYING;
  }

  // --- Loot ------------------------------------------------------------
  nearestLoot(maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const l of this.world.loot) {
      if (l.taken) continue;
      if (l.inVault && !this.vaultCracked) continue;
      const d = Math.hypot(l.x - this.player.x, l.y - this.player.y);
      if (d < bestD) {
        bestD = d;
        best = l;
      }
    }
    return best;
  }

  grabLoot() {
    const l = this.nearestLoot(46);
    if (!l) return false;
    l.taken = true;
    this.lootTaken += 1;
    this.lootValue += l.value;
    this.score += l.value;
    this.sound('pickup');
    return true;
  }

  nearVault() {
    const v = this.world.vault;
    const cx = clamp(this.player.x, v.x, v.x + v.w);
    const cy = clamp(this.player.y, v.y, v.y + v.h);
    return Math.hypot(this.player.x - cx, this.player.y - cy) < 52;
  }

  inExitZone() {
    const e = this.world.exit;
    return (
      this.player.x > e.x && this.player.x < e.x + e.w &&
      this.player.y > e.y - 20 && this.player.y < e.y + 60
    );
  }

  // --- Per-frame update -------------------------------------------------
  update(dt, input) {
    this.elapsed += dt;

    if (this.state === STATES.TITLE) {
      // Idle world behind the title: guards patrol, cameras sweep.
      this.updateWatchers(dt, true);
      return;
    }
    if (this.state === STATES.PAUSED || this.state === STATES.WIN || this.state === STATES.BUSTED) {
      return;
    }

    if (this.state === STATES.VAULT) {
      this.updateWatchers(dt, false);
      this.updateAlarm(dt);
      this.vaultNeedle += this.vaultNeedleDir * this.vaultNeedleSpeed * dt;
      if (this.vaultNeedle > 1) { this.vaultNeedle = 1; this.vaultNeedleDir = -1; }
      if (this.vaultNeedle < -1) { this.vaultNeedle = -1; this.vaultNeedleDir = 1; }
      if (this.vaultMessageTimer > 0) this.vaultMessageTimer -= dt;
      if (input.wasPressed('KeyE', 'Space')) this.vaultAttempt();
      if (input.wasPressed('Escape')) this.closeVault();
      return;
    }

    // PLAYING
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.bust('alarm');
      return;
    }

    // Movement: keyboard, or the autopilot waypoints for screenshots.
    let mx = 0;
    let my = 0;
    if (this.autopilot) {
      const target = this.autopilot.waypoints[this.autopilot.index];
      if (target) {
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const d = Math.hypot(dx, dy);
        if (d < 8) {
          this.autopilot.index = Math.min(this.autopilot.index + 1, this.autopilot.waypoints.length - 1);
        } else {
          mx = dx / d;
          my = dy / d;
        }
      }
    } else {
      const v = input.moveVector();
      mx = v.x;
      my = v.y;
    }

    if (mx !== 0 || my !== 0) {
      this.player.moving = true;
      this.player.angle = Math.atan2(my, mx);
      const nx = this.player.x + mx * PLAYER_SPEED * dt;
      const ny = this.player.y + my * PLAYER_SPEED * dt;
      // Move axis by axis so the thief slides along walls instead of sticking.
      if (!hitsSolid(this.world, nx, this.player.y, PLAYER_RADIUS)) {
        this.player.x = clamp(nx, ROOM.x + PLAYER_RADIUS, ROOM.x + ROOM.w - PLAYER_RADIUS);
      }
      if (!hitsSolid(this.world, this.player.x, ny, PLAYER_RADIUS)) {
        this.player.y = clamp(ny, ROOM.y + PLAYER_RADIUS, ROOM.y + ROOM.h - PLAYER_RADIUS);
      }
      this.player.stepTimer -= dt;
      if (this.player.stepTimer <= 0) {
        this.player.stepTimer = 0.32;
        this.sound('step');
      }
    } else {
      this.player.moving = false;
    }

    // Interactions.
    if (input.wasPressed('KeyE', 'Space')) {
      if (this.nearVault() && !this.vaultCracked) {
        this.openVault();
        return;
      }
      this.grabLoot();
    }

    this.updateWatchers(dt, false);
    this.updateAlarm(dt);

    // Caught by touch: a guard within arm's reach ends the run.
    for (const g of this.world.guards) {
      const d = Math.hypot(g.x - this.player.x, g.y - this.player.y);
      if (d < GUARD_RADIUS + PLAYER_RADIUS + 2) {
        this.bust('guard');
        return;
      }
    }

    // Escape: vault cracked and the thief reaches the getaway van.
    if (this.vaultCracked && this.inExitZone()) {
      this.win();
    }

    if (this.spottedTimer > 0) this.spottedTimer -= dt;
  }

  updateWatchers(dt, idle) {
    // Guards walk their patrol loops, pausing at each waypoint.
    for (const g of this.world.guards) {
      if (g.pause > 0) {
        g.pause -= dt;
        continue;
      }
      const target = g.waypoints[g.waypointIndex];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
        g.pause = g.pauseTime;
        continue;
      }
      const step = (GUARD_SPEED * dt) / d;
      g.x += dx * step;
      g.y += dy * step;
      g.angle = Math.atan2(dy, dx);
    }

    // Cameras sweep their arcs.
    for (const c of this.world.cameras) {
      c.angle = c.base + Math.sin(this.elapsed * CAMERA_SWEEP_SPEED + c.phase) * c.sweep;
    }

    if (idle) return;

    // Vision: does anyone see the thief right now?
    let seen = false;
    for (const g of this.world.guards) {
      g.spotted = canSee(this.world, g.x, g.y, g.angle, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_DIST, this.player.x, this.player.y);
      if (g.spotted) seen = true;
    }
    for (const c of this.world.cameras) {
      c.spotted = canSee(this.world, c.x, c.y, c.angle, CAMERA_VIEW_HALF_ANGLE, CAMERA_VIEW_DIST, this.player.x, this.player.y);
      if (c.spotted) seen = true;
    }
    if (seen && !this.spotted) {
      this.alarm = clamp(this.alarm + ALARM_SPOT_BONUS, 0, ALARM_MAX);
      this.sound('spotted');
      this.spottedTimer = SPOTTED_BANNER_SEC;
    }
    this.spotted = seen;
  }

  updateAlarm(dt) {
    if (this.demo) return; // demo frames keep the alarm the scene set
    if (this.spotted) {
      this.alarm = clamp(this.alarm + ALARM_GAIN_PER_SEC * dt, 0, ALARM_MAX);
      this.alarmBlipTimer -= dt;
      if (this.alarmBlipTimer <= 0) {
        this.alarmBlipTimer = 0.5;
        this.sound('alarm');
      }
    } else {
      this.alarm = clamp(this.alarm - ALARM_DECAY_PER_SEC * dt, 0, ALARM_MAX);
    }
    if (this.alarm >= ALARM_MAX) this.bust('alarm');
  }

  bust(by) {
    this.caughtBy = by;
    this.state = STATES.BUSTED;
    this.sound('lose');
  }

  win() {
    const timeBonus = Math.round(this.timeLeft) * 10;
    this.score += timeBonus;
    this.winStats = {
      lootValue: this.lootValue,
      lootTaken: this.lootTaken,
      timeBonus,
      total: this.score,
      timeLeft: Math.round(this.timeLeft),
    };
    this.state = STATES.WIN;
    this.sound('win');
  }

  // Seconds formatted m:ss for the HUD timer.
  timeText() {
    const s = Math.max(0, Math.ceil(this.timeLeft));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  alarmColor() {
    if (this.alarm < 35) return '#7fd67f';
    if (this.alarm < 70) return '#e8b64c';
    return '#e5484d';
  }
}
