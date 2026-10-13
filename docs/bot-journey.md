# Landing-page bot journey

The section after How it works recreates the moving-circle composition in the user's reference, [Connectivity Cloud · Prototype 01 by Oğuz Yağız Kara](https://x.com/oguzyagizkara/status/2107028124412125194). The clip was inspected in the browser. A fixed central disc contains a bot; differently sized token circles flow down, separate around the center and one another, and reconnect with fine straight lines. At the user's request, the canvas uses the landing page's #010513 background, with subdued slate outlines, brighter token marks and an elevated dark central disc. The reference's composition and movement are preserved.

The animation is conceptual. It has no live feed, orders, prices, or changing performance figures. Product behavior was previously checked against source on 2026-10-13; those mappings are retained below as context.

## Source snapshots

- Frontend: `TrenchersAI/trenchers_fe` at `8a77394d8d140d4b87a74e47ac6532d018eb3ff0`.
- Backend: `TrenchersAI/solana-terminal` at `91716d7a6d8311ff5c889f5e9d94f9b03290c9f1`.

## Stage mapping

| Stage | Current behavior | Primary source |
| --- | --- | --- |
| Spawn | Fleet opens the spawn wizard; choose Paper or Live, configure, add balance, then start. Draft, funded and active are distinct states. | Frontend `src/components/ai-agent/spawn-agent-dialog.tsx`, `panel-spawn-wizard.tsx`; backend `crates/st-sniper/src/bot_lifecycle.rs` |
| Watch | Candidates appear in Just spotted / Near entry. Buy · Entry check shows whether entry rules pass. Watched candidates are distinct from open positions. | Frontend `docs/ai-agent.md`, `src/lib/position-entry-gates.ts`; backend `docs/architecture/st-sniper.md` |
| Buy | Enabled entry criteria and execution guards, including funds and capacity, gate buys. A submitted buy is not yet a filled position. | Backend `crates/st-sniper/src/bot_decision.rs`, `docs/architecture/st-sniper.md` |
| Manage | Open positions expose mark, value, unrealized P&L and configured exits. | Frontend `docs/ai-agent-live-positions.md`; backend `docs/architecture/st-sniper.md` |
| Sell | Enabled exit rules can cause partial or full sells. Stop-loss takes priority over profit tiers when triggered. Manual exits also exist. | Backend `crates/st-sniper/src/bot_decision.rs`; frontend `docs/ai-agent-live-positions.md` |
| Review | Fully closed positions leave Open positions. Trade Activity exposes fill details, realized P&L, exit reason and stored entry rationale. Active agents can continue watching and managing other positions concurrently. | Frontend `docs/ai-agent.md`, `docs/ai-agent-live-positions.md` |

## Illustration boundaries

- The center contains a neutral bot symbol. Moving circles carry illustrative token marks, including familiar Solana ecosystem and stablecoin motifs; they are not fetched token records.
- Circles flow continuously from top to bottom and gently converge again below the bot, keeping the lower center populated after deflecting around it. Proximity determines the connection lines, which fade as a token moves away. Circles recycle outside the visible canvas.
- The reference's overall composition and behavior were rebuilt with native canvas physics. The source video is not embedded or used as an animation asset.
- The old filaments, cinematic effects and sequential trade captions were removed to follow the supplied reference.
- Near entry does not guarantee a buy; funding alone does not activate an agent; a partial sell does not close the full position.
- Paper simulates execution. Live uses real funds and onchain execution. No transaction is submitted by this landing-page walkthrough.
- Do not restore claims about the disabled first-run auto-spawn, retired token safety scan, or mandatory automatic strategy improvement.

## Interaction

There are no dashboard panels, price charts, stage navigation or progress bars. A deterministic circle simulation maintains a fixed bot and continuous downward token flow. Collision resolution prevents overlap with the bot, separates token circles, and preserves movement around the center. Desktop and mobile both use the same downward flow, with responsive spacing and circle sizes.

One animation-frame clock renders at up to 30 fps, with physics steps at 90 Hz and the pixel ratio capped at 1.75. Token contacts use gradual positional correction, near-zero rebound and slight tangential damping so circles separate without sharp jumps. React does not render on animation frames. Pause freezes the entire scene; Restart resets it. Offscreen and hidden-tab playback also stops. Reduced-motion preferences show a complete static arrangement. Canvas artwork is hidden from assistive technology; a stable figure caption describes it and playback controls have accessible labels. Resizes and reduced-motion changes reset the field without replaying an arbitrarily long session.
