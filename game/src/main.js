// The Velvet Vault — bootstrap: canvas, game loop, wiring.
// Reads ?seed= and ?shot= from the URL; a shot scene renders one frozen
// frame (the loop still runs, but the scene is deterministic).

import { Game, STATES } from './game.js';
import { render } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { applyShot } from './shots.js';
import { VIEW_W, VIEW_H } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');

const game = new Game(seed);
const input = new Input(canvas);
const sounds = new SoundBank();

game.onSound = (name) => {
  switch (name) {
    case 'step': sounds.step(); break;
    case 'pickup': sounds.pickup(); break;
    case 'spotted': sounds.spotted(); break;
    case 'click-good': sounds.vaultClick(true); break;
    case 'click-bad': sounds.vaultClick(false); break;
    case 'vault-open': sounds.vaultOpen(); break;
    case 'alarm': sounds.alarmBlip(); break;
    case 'win': sounds.win(); break;
    case 'lose': sounds.lose(); break;
    default: sounds.uiClick(); break;
  }
};

let titleButton = null;
let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Global keys, handled in every state.
  if (input.wasPressed('KeyM')) {
    sounds.ensure();
    sounds.setMuted(!sounds.muted);
  }
  if (input.wasPressed('KeyR') && game.state !== STATES.TITLE) {
    game.restart();
  }
  if (input.wasPressed('KeyP')) {
    if (game.state === STATES.PLAYING || game.state === STATES.PAUSED) game.togglePause();
  }
  if (game.state === STATES.TITLE) {
    if (input.wasPressed('Enter', 'Space')) {
      sounds.ensure();
      game.start();
    }
    const click = input.click();
    if (click && titleButton &&
      click.x >= titleButton.x && click.x <= titleButton.x + titleButton.w &&
      click.y >= titleButton.y && click.y <= titleButton.y + titleButton.h) {
      sounds.ensure();
      sounds.uiClick();
      game.start();
    }
  }

  game.update(dt, input);
  titleButton = render(ctx, game, input.mouse);
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shot) {
  applyShot(game, shot);
  // Render the scene once immediately so a screenshot taken at any moment
  // catches the finished frame.
  titleButton = render(ctx, game, input.mouse);
}

requestAnimationFrame(frame);
