// The Velvet Vault — everything drawn on the canvas.
// Palette: deep velvet navy hall, warm brass loot, red danger cones.
// All art is drawn in code; the game loads no images.

import { VIEW_W, VIEW_H, ROOM, PLAYER_RADIUS, GUARD_RADIUS, GUARD_VIEW_DIST, GUARD_VIEW_HALF_ANGLE, CAMERA_VIEW_DIST, CAMERA_VIEW_HALF_ANGLE, ALARM_MAX, VAULT_CRACKS_NEEDED, LOOT_KINDS } from './config.js';
import { STATES } from './game.js';

const INK = '#f2ead8';
const DIM = '#9a8f7a';
const BRASS = '#c9a227';
const RED = '#e5484d';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, halfAngle, dist, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, dist, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFloor(ctx, game) {
  const { x, y, w, h } = ROOM;
  // Marble checker floor.
  const tile = 40;
  for (let ty = 0; ty < h / tile; ty++) {
    for (let tx = 0; tx < w / tile; tx++) {
      const even = (tx + ty) % 2 === 0;
      ctx.fillStyle = even ? '#232a3d' : '#1d2334';
      ctx.fillRect(x + tx * tile, y + ty * tile, tile, tile);
    }
  }
  // Velvet carpet runner from the entrance to the vault.
  ctx.fillStyle = '#5c1f2e';
  ctx.fillRect(x + w / 2 - 70, y, 140, h);
  ctx.fillStyle = '#7a2a3d';
  ctx.fillRect(x + w / 2 - 70, y, 6, h);
  ctx.fillRect(x + w / 2 + 64, y, 6, h);
  // Gold border inlay.
  ctx.strokeStyle = 'rgba(201,162,39,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
}

function drawWalls(ctx) {
  const { x, y, w, h } = ROOM;
  ctx.fillStyle = '#3a2f4a';
  ctx.fillRect(x - 14, y - 14, w + 28, 14); // top wall
  ctx.fillRect(x - 14, y + h, w + 28, 14); // bottom wall
  ctx.fillRect(x - 14, y, 14, h);
  ctx.fillRect(x + w, y, 14, h);
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 14, y - 14, w + 28, h + 28);
  // Exit gap at the bottom wall where the van waits.
  ctx.fillStyle = '#10131f';
  ctx.fillRect(x + w / 2 - 60, y + h - 2, 120, 16);
}

function drawCover(ctx, world) {
  for (const s of world.solids) {
    ctx.fillStyle = '#2c3550';
    roundRect(ctx, s.x, s.y, s.w, s.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#4a5878';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Glass top highlight for display cases.
    ctx.fillStyle = 'rgba(140,170,220,0.18)';
    roundRect(ctx, s.x + 5, s.y + 5, s.w - 10, s.h - 10, 4);
    ctx.fill();
  }
  for (const p of world.pillars) {
    ctx.fillStyle = '#3a2f4a';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = BRASS;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4a3a5e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r - 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVault(ctx, world, cracked) {
  const v = world.vault;
  ctx.fillStyle = cracked ? '#2f5d3a' : '#4a4a55';
  roundRect(ctx, v.x, v.y - 6, v.w, v.h + 12, 8);
  ctx.fill();
  ctx.strokeStyle = cracked ? '#7fd67f' : BRASS;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Vault dial.
  ctx.fillStyle = '#1a1d2b';
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = cracked ? '#7fd67f' : BRASS;
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(cracked ? 'VAULT OPEN' : 'THE VAULT', v.x + v.w / 2, v.y - 14);
  ctx.textAlign = 'left';
}

function drawVan(ctx, world) {
  const v = world.van;
  ctx.fillStyle = '#20242f';
  roundRect(ctx, v.x - 8, v.y - 4, v.w + 16, v.h + 8, 8);
  ctx.fill();
  // Van body.
  ctx.fillStyle = '#5a6b8c';
  roundRect(ctx, v.x, v.y, v.w, v.h, 10);
  ctx.fill();
  ctx.fillStyle = '#7c8db0';
  roundRect(ctx, v.x + 8, v.y + 8, v.w - 16, 18, 4);
  ctx.fill();
  ctx.fillStyle = '#10131f';
  ctx.fillRect(v.x + 18, v.y + 34, 26, 12);
  ctx.fillRect(v.x + v.w - 44, v.y + 34, 26, 12);
  ctx.fillStyle = INK;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY VAN', v.x + v.w / 2, v.y + v.h + 16);
  ctx.textAlign = 'left';
}

function drawLoot(ctx, world, elapsed) {
  for (const l of world.loot) {
    if (l.taken) continue;
    const bob = Math.sin(elapsed * 2 + l.bobPhase) * 3;
    const color = LOOT_KINDS[l.kind].color;
    ctx.save();
    ctx.translate(l.x, l.y + bob);
    // Glow halo so loot reads at a glance.
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (l.kind === 'painting') {
      ctx.fillStyle = '#6b4f1d';
      ctx.fillRect(-14, -11, 28, 22);
      ctx.fillStyle = color;
      ctx.fillRect(-11, -8, 22, 16);
      ctx.fillStyle = '#3a2f4a';
      ctx.fillRect(-6, -4, 12, 8);
    } else if (l.kind === 'gold') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-12, 6);
      ctx.lineTo(-8, -6);
      ctx.lineTo(8, -6);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-6, -4, 12, 3);
    } else {
      // Diamond.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`$${l.value.toLocaleString()}`, l.x, l.y + 30 + bob);
    ctx.textAlign = 'left';
  }
}

function drawGuard(ctx, g) {
  // Vision cone first, so the guard body draws over it.
  drawCone(ctx, g.x, g.y, g.angle, GUARD_VIEW_HALF_ANGLE, GUARD_VIEW_DIST,
    g.spotted ? RED : '#e8b64c', g.spotted ? 0.34 : 0.16);
  ctx.fillStyle = g.spotted ? RED : '#3f6db3';
  ctx.beginPath();
  ctx.arc(g.x, g.y, GUARD_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f1420';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick and cap brim.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD_RADIUS + 6), g.y + Math.sin(g.angle) * (GUARD_RADIUS + 6));
  ctx.stroke();
  ctx.fillStyle = '#274b7d';
  ctx.beginPath();
  ctx.arc(g.x, g.y, 7, 0, Math.PI * 2);
  ctx.fill();
}

function drawCamera(ctx, c) {
  drawCone(ctx, c.x, c.y, c.angle, CAMERA_VIEW_HALF_ANGLE, CAMERA_VIEW_DIST,
    c.spotted ? RED : '#ff7a59', c.spotted ? 0.34 : 0.15);
  // Wall mount + lens.
  ctx.fillStyle = '#8c8f9a';
  ctx.fillRect(c.x - 8, c.y - 6, 16, 12);
  ctx.fillStyle = c.spotted ? RED : '#ff7a59';
  ctx.beginPath();
  ctx.arc(c.x + Math.cos(c.angle) * 10, c.y + Math.sin(c.angle) * 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0f1420';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPlayer(ctx, game) {
  const p = game.player;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 5, PLAYER_RADIUS, PLAYER_RADIUS * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Thief in a black hood with a velvet-red scarf.
  ctx.fillStyle = '#15151d';
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#8c1f2f';
  ctx.beginPath();
  ctx.arc(p.x, p.y + 4, 6, 0, Math.PI);
  ctx.fill();
  // Eyes in the direction of movement.
  ctx.fillStyle = INK;
  const ex = Math.cos(p.angle);
  const ey = Math.sin(p.angle);
  ctx.beginPath();
  ctx.arc(p.x + ex * 5 - ey * 4, p.y + ey * 5 + ex * 4, 2, 0, Math.PI * 2);
  ctx.arc(p.x + ex * 5 + ey * 4, p.y + ey * 5 - ex * 4, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHUD(ctx, game) {
  // Top bar.
  ctx.fillStyle = 'rgba(10,12,20,0.92)';
  ctx.fillRect(0, 0, VIEW_W, 72);
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 72);
  ctx.lineTo(VIEW_W, 72);
  ctx.stroke();

  ctx.fillStyle = BRASS;
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText('THE VELVET VAULT', 24, 44);

  // Timer.
  ctx.fillStyle = game.timeLeft < 30 ? RED : INK;
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⏱ ${game.timeText()}`, 420, 44);

  // Loot.
  ctx.fillStyle = INK;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`Loot $${game.lootValue.toLocaleString()}  (${game.lootTaken}/7)`, 620, 43);

  // Score.
  ctx.fillStyle = BRASS;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`Score ${game.score.toLocaleString()}`, 850, 43);
  ctx.textAlign = 'left';

  // Alarm meter.
  const ax = 990;
  const ay = 22;
  const aw = 240;
  const ah = 26;
  ctx.fillStyle = '#10131f';
  roundRect(ctx, ax, ay, aw, ah, 6);
  ctx.fill();
  ctx.fillStyle = game.alarmColor();
  const fillW = (game.alarm / ALARM_MAX) * aw;
  if (fillW > 0) {
    roundRect(ctx, ax, ay, fillW, ah, 6);
    ctx.fill();
  }
  ctx.strokeStyle = '#5a5346';
  ctx.lineWidth = 2;
  roundRect(ctx, ax, ay, aw, ah, 6);
  ctx.stroke();
  // Dark text once the fill covers the label, light text while it does not.
  ctx.fillStyle = game.alarm >= 50 ? '#14161f' : INK;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.alarm >= ALARM_MAX ? 'ALARM!' : `ALARM ${Math.round(game.alarm)}%`, ax + aw / 2, ay + 19);
  ctx.textAlign = 'left';

  // Bottom hint bar.
  ctx.fillStyle = DIM;
  ctx.font = '15px Georgia, serif';
  const hint = game.vaultCracked
    ? 'Vault cracked! Grab the diamond and reach the GETAWAY VAN — E grabs loot, P pauses, M mutes'
    : 'WASD / arrows move · E grab loot / crack vault · P pause · R restart · M mute';
  ctx.fillText(hint, 24, VIEW_H - 12);

  // Vault progress pips.
  if (game.vaultProgress > 0 && !game.vaultCracked) {
    ctx.fillStyle = INK;
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(`Vault tumblers: ${game.vaultProgress}/${VAULT_CRACKS_NEEDED}`, 24, VIEW_H - 34);
  }

  // SPOTTED banner.
  if (game.spottedTimer > 0 && game.state === 'playing') {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.spottedTimer);
    ctx.fillStyle = RED;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPOTTED!', VIEW_W / 2, 130);
    ctx.restore();
    ctx.textAlign = 'left';
  }
}

function drawVaultOverlay(ctx, game) {
  ctx.fillStyle = 'rgba(8,10,18,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const bx = VIEW_W / 2 - 320;
  const by = VIEW_H / 2 - 130;
  ctx.fillStyle = '#1d2334';
  roundRect(ctx, bx, by, 640, 260, 14);
  ctx.fill();
  ctx.strokeStyle = BRASS;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = BRASS;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('CRACKING THE VAULT', VIEW_W / 2, by + 48);

  // Dial track.
  const tx = VIEW_W / 2 - 240;
  const ty = by + 130;
  const tw = 480;
  ctx.fillStyle = '#10131f';
  roundRect(ctx, tx, ty - 14, tw, 28, 14);
  ctx.fill();
  // Green sweet spot.
  const zoneX = tx + ((game.vaultZone.center + 1) / 2) * tw;
  const zoneW = game.vaultZone.half * tw;
  ctx.fillStyle = '#3f9e4d';
  ctx.fillRect(zoneX - zoneW, ty - 14, zoneW * 2, 28);
  // Needle.
  const nx = tx + ((game.vaultNeedle + 1) / 2) * tw;
  ctx.fillStyle = '#ffd94d';
  ctx.fillRect(nx - 3, ty - 22, 6, 44);
  ctx.fillStyle = INK;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('Press E when the needle is in the green', VIEW_W / 2, ty + 52);
  ctx.fillStyle = BRASS;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText(`Tumblers: ${game.vaultProgress} / ${VAULT_CRACKS_NEEDED}`, VIEW_W / 2, ty + 82);
  if (game.vaultMessageTimer > 0) {
    ctx.fillStyle = INK;
    ctx.font = '16px Georgia, serif';
    ctx.fillText(game.vaultMessage, VIEW_W / 2, by + 78);
  }
  ctx.fillStyle = DIM;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Esc — step away from the vault', VIEW_W / 2, by + 236);
  ctx.textAlign = 'left';
}

function drawCenterPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8,10,18,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const bx = VIEW_W / 2 - 380;
  const by = VIEW_H / 2 - 190;
  ctx.fillStyle = '#1d2334';
  roundRect(ctx, bx, by, 760, 380, 16);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, by + 76);
  ctx.fillStyle = INK;
  ctx.font = '19px Georgia, serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, by + 128 + i * 34);
  });
  ctx.textAlign = 'left';
}

function drawTitle(ctx, game, mouse) {
  ctx.fillStyle = 'rgba(8,10,18,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = BRASS;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE VELVET VAULT', VIEW_W / 2, 220);
  ctx.fillStyle = INK;
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('One thief. One museum. One very loud vault.', VIEW_W / 2, 262);
  ctx.font = '19px Georgia, serif';
  const lines = [
    'Sneak past the guards and their vision cones, dodge the sweeping cameras,',
    'grab the paintings and gold, crack the vault for the diamond,',
    'then slip out to the getaway van before the timer — or the alarm — runs out.',
    '',
    'WASD / arrows — move      E — grab loot / crack vault',
    'P — pause      R — restart      M — mute',
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, VIEW_W / 2, 330 + i * 30);
  });
  // Start button.
  const bx = VIEW_W / 2 - 130;
  const by = 560;
  const hover = mouse.x >= bx && mouse.x <= bx + 260 && mouse.y >= by && mouse.y <= by + 56;
  ctx.fillStyle = hover ? '#d9b73a' : BRASS;
  roundRect(ctx, bx, by, 260, 56, 10);
  ctx.fill();
  ctx.fillStyle = '#1a1d2b';
  ctx.font = 'bold 24px Georgia, serif';
  ctx.fillText('START THE HEIST', VIEW_W / 2, by + 37);
  ctx.fillStyle = DIM;
  ctx.font = '15px Georgia, serif';
  ctx.fillText('or press Enter', VIEW_W / 2, by + 84);
  ctx.textAlign = 'left';
  return { x: bx, y: by, w: 260, h: 56 };
}

export function render(ctx, game, mouse) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#10131f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const world = game.world;
  drawFloor(ctx, game);
  drawVault(ctx, world, game.vaultCracked);
  drawVan(ctx, world);
  drawCover(ctx, world);
  drawLoot(ctx, world, game.elapsed);
  for (const c of world.cameras) drawCamera(ctx, c);
  for (const g of world.guards) drawGuard(ctx, g);
  drawWalls(ctx);
  drawPlayer(ctx, game);

  // "E" prompt when an interaction is available.
  if (game.state === STATES.PLAYING) {
    const loot = game.nearestLoot(46);
    if (loot) {
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('E — grab', game.player.x, game.player.y - 26);
      ctx.textAlign = 'left';
    } else if (game.nearVault() && !game.vaultCracked) {
      ctx.fillStyle = '#ffd94d';
      ctx.font = 'bold 15px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('E — crack the vault', game.player.x, game.player.y - 26);
      ctx.textAlign = 'left';
    }
  }

  drawHUD(ctx, game);

  if (game.state === STATES.TITLE) {
    return drawTitle(ctx, game, mouse);
  }
  if (game.state === STATES.VAULT) {
    drawVaultOverlay(ctx, game);
  }
  if (game.state === STATES.PAUSED) {
    drawCenterPanel(ctx, 'PAUSED', ['Take a breath. The guards are waiting.', '', 'P — resume      R — restart'], BRASS);
  }
  if (game.state === STATES.WIN) {
    const s = game.winStats || { lootValue: 0, lootTaken: 0, timeBonus: 0, total: 0, timeLeft: 0 };
    drawCenterPanel(ctx, 'CLEAN GETAWAY!', [
      `Loot taken: ${s.lootTaken} pieces — $${s.lootValue.toLocaleString()}`,
      `Time bonus: $${s.timeBonus.toLocaleString()} (${s.timeLeft}s to spare)`,
      `Final score: ${s.total.toLocaleString()}`,
      '',
      'R — pull another heist',
    ], '#7fd67f');
  }
  if (game.state === STATES.BUSTED) {
    const why = game.caughtBy === 'guard'
      ? 'A guard caught you red-handed.'
      : game.caughtBy === 'alarm'
        ? 'The alarm hit 100% — the police are already here.'
        : 'Time ran out. The museum locks down at dawn.';
    drawCenterPanel(ctx, 'BUSTED!', [
      why,
      `Loot kept: $${game.lootValue.toLocaleString()} (${game.lootTaken} pieces)`,
      `Score: ${game.score.toLocaleString()}`,
      '',
      'R — try again, quieter this time',
    ], RED);
  }
  return null;
}
