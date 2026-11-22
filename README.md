# The Velvet Vault

![The Velvet Vault](https://make.fun/badge/best-heist-game-20261122-0559.svg)
![Rank](https://make.fun/badge/best-heist-game-20261122-0559/guytas39-sudo/heist-game/rank.svg)
![Reward](https://make.fun/badge/best-heist-game-20261122-0559/guytas39-sudo/heist-game/reward.svg)

One thief. One museum. One very loud vault.

**The Velvet Vault** is a top-down stealth heist game. You slip into a velvet-carpeted vault hall, sneak past patrolling guards and their vision cones, dodge sweeping wall cameras, pocket paintings and gold bars, crack the vault's tumbler dial for the diamond, then sprint to the getaway van before the 3-minute timer — or the alarm — runs out.

## How to play

- **WASD / arrow keys** — move (sneak)
- **E** — grab loot / crack the vault
- **P** — pause · **R** — restart · **M** — mute
- **Enter / click** — start the heist

Getting spotted raises the alarm; at 100% the heist is busted. Guards who touch you end the run. The vault mini-game is a timing dial: press E when the needle is in the green zone, three times, to crack it. Every loot item has a dollar value, and leftover time adds a bonus to your score.

## Running it

Serve `game/` with any static server and open `index.html` in desktop Chrome — no build step, no network requests, all art and sound made in code.

```sh
cd game && python3 -m http.server 8080
```

Verify the hand-in locally:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Screenshots

Deterministic scenes rendered from the real game via `?shot=` hooks:

- `1-start.jpg` — title screen over the live hall
- `2-play.jpg` — mid-heist: thief, guards, cones, cameras, loot, alarm
- `3-vault.jpg` — cracking the vault dial
- `4-escape.jpg` — getaway at the van, loot in hand

Built for the [make.fun best heist game bounty](https://make.fun/?ref=g2zdh0s8).
