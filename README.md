# 🐹 Hamster Dash

A Squeekchain community game: a tiny, dependency-free HTML5 endless runner. Help the hamster dash through the burrow, hop over pebbles and roots, and stuff its cheeks with sunflower seeds (they really do get bigger).

## Squeekchain integration (read-only)
Hamster Dash reads Squeekchain live, straight from the browser — **no wallet connection, no signatures, no transactions**.

- **Live from Squeekchain panel** — fetches [`api.squeekchain.com/v1/economy/state`](https://api.squeekchain.com/v1/economy/state) every minute and shows the current round, mining phase, SQK live supply, SQK staked, Squeeks alive and Squeeks merged away. The current round is also shown in the in-game HUD.
- **Got a Squeek?** — paste any wallet address (or open `https://hamsterdash.site/?address=0x…`). The game calls `balanceOf` on the Squeekchain contracts on Sepolia via a public RPC:
  - Squeek collection `0xc4c7982657f00509548f3a3a41db7fa439a6856b` → holders unlock the teal **Squeek skin** with an LED-dot badge.
  - SQK token `0xd78a3956cf63164d1fa1c622ad3c66623162fa1e` → holders' seeds count **double**.

**Play:** https://hamsterdash.site

## Controls
- **Space / ↑ / W** or **tap** — hop; hold for a higher hop, press again mid-air for a double hop
- **P / Esc** — pause · **M** — mute

## Gameplay
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
