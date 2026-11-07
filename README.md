# 🐹 Hamster Dash

A Squeekchain community game: a tiny, dependency-free HTML5 endless runner where you race the real Squeekchain hamster. Help the hamster dash through the burrow, hop over pebbles and roots, and stuff its cheeks with sunflower seeds (they really do get bigger).

## How Squeekchain powers the game
Everything is read straight from the browser — **no wallet connection, no signatures, no transactions**.

- **Race the real hamster.** The game polls [`/v1/status`](https://api.squeekchain.com/v1/status) every 5 s. When the real Squeekchain hamster is on its wheel (`coreStatus: ACTIVE`), **every seed you grab counts double** and a translucent "LIVE" ghost hamster runs along the far ridge at the wheel's real speed (`speedMmPerSecond`). At game over you see how far the real hamster ran on its wheel during your run.
- **Every round deals a new course.** The round clock comes from the core config ([`/v1/core`](https://api.squeekchain.com/v1/core): `genesisTimestamp`, `roundDuration` = 10 min). The current round number seeds a deterministic RNG, so every player gets the same obstacle and seed sequence for that round, and a fresh course when the round rolls over. Your best score per round is tracked.
- **Got a Squeek?** Paste any wallet address (or open `https://hamsterdash.site/?address=0x…`). The game calls `balanceOf` on the Squeekchain contracts on Sepolia via a public RPC:
  - Squeek collection `0xc4c7982657f00509548f3a3a41db7fa439a6856b` → holders unlock the teal **Squeek skin** with an LED-dot badge.
  - SQK token `0xd78a3956cf63164d1fa1c622ad3c66623162fa1e` → holders' seeds count double (stacks with the live wheel bonus).
- **Economy panel** from [`/v1/economy/state`](https://api.squeekchain.com/v1/economy/state): settled on-chain round, SQK live supply and staked, Squeeks alive.

## Controls
- **Space / ↑ / W** or **tap** — hop; hold for a higher hop, press again mid-air for a double hop
- **↓ / S** or the **⬇ button** on phones — duck (mid-air: fast fall)
- **P / Esc** — pause · **M** — mute

## Gameplay
- The menu shows a live preview: an autopilot plays the current round's course
- Four areas that cross-fade every 150 m: The Burrow → Sunny Meadow → Sunset Hills → Night Forest (and around again)
- Air enemies from 50 m: eagles in daylight, bats underground and at night — high flyers punish a jump, mid flyers must be ducked (or hopped), low flyers must be hopped; a red "!" warns before they arrive
- Pebbles, roots, mounds and pebble pairs; spacing always leaves room for a full hop at the current speed
- Golden seeds grant a one-hit shield; the hamster's cheeks grow as it eats
- Coyote time + jump buffering for forgiving controls; milestones, score pop-ups, screen shake
- Synthesized sound effects (Web Audio, no asset files); best score saved locally
- Performance: cached background layer, DOM only touched when the score changes, resolution capped on phones, auto-pause when the tab is hidden

## Run locally
Just open `index.html` in a browser — no build step, no backend.

## License
MIT

squeekchain-project: 478ab808-9282-4b50-b1b0-4aa3b852f280
