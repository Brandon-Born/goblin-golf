# Product Backlog

This backlog tracks known product, UX, gameplay, and technical issues from the current Goblin Golf prototype. It is ordered by severity and player impact.

## P0 - Progression Blockers

No known P0 blockers.

The current prototype can complete the main flow:

- title
- character select
- throw setup
- flight and lie resolution
- OB relief
- putting
- score summary
- replay

## P1 - Major Usability Issues

### Mobile Shot HUD Obstructs The Playfield

Status: Open

On mobile, the shot setup HUD covers too much of the lower playfield. It overlaps the tee/current lie area and can hide wind-zone labels. This is now a major issue because the game asks players to read route, lie, wind lane, forecast, and landing zone before throwing.

Evidence:

- `test-results/visual-audit/03-shot-setup.png`
- `test-results/visual-audit/04-hyzer-flight-path.png`

Impact:

- Players cannot fully inspect the intended route.
- Wind lanes and lie labels are harder to connect to the course.
- The first throw feels more UI-heavy than game-like on phones.

Suggested next step:

- Collapse secondary readouts behind a compact drawer or move dense forecast data into a smaller bottom sheet.
- Keep only aim, power, disc, angle, throw, and one concise forecast chip visible during normal aiming.

### Forecast And Course Labels Overflow Or Get Clipped

Status: Open

Some in-canvas labels extend beyond the safe playfield or overlap each other. The clearest case is the post-OB/recovery state where a forecast label runs off the right side of the canvas. Wind-zone labels can also be partially hidden behind other labels or the HUD.

Evidence:

- `test-results/visual-audit/04-hyzer-flight-path.png`

Impact:

- Forecast information becomes visually noisy.
- Important labels compete with the basket, lie, OB markers, and hazards.
- The game looks less polished even when the underlying rules work.

Suggested next step:

- Add label clamping and adaptive placement.
- Prefer short chips such as `Low confidence`, `OB risk`, and `Crosswind` on canvas, with details in the DOM HUD.

### Default First Shot Reads As High Risk

Status: Open

The first suggested shot for Skrak currently reads `High - blocked stance` with a low-confidence landing zone. It may be mechanically accurate, but it is a strange default for a first-time player because it makes the game look like it is recommending a bad line.

Evidence:

- `test-results/visual-audit/03-shot-setup.png`

Impact:

- First impression can feel punitive or confusing.
- Players may not understand whether the forecast is a warning, tutorial, or bug.

Suggested next step:

- Tune initial default aim/disc/power per character to start on a safe fairway route.
- Use the risky route as an opt-in puzzle, not the default recommendation.

## P2 - Gameplay And UX Improvements

### Wind Lanes Need Clearer Player Language

Status: Open

Wind lanes are now rendered and sampled by shot physics, but the player-facing meaning is still terse. `Moss Tailwind 2.0` and `Ruin Crosswind 0.7` are readable as labels, but they do not explain whether the lane helps, hurts, or bends the shot.

Impact:

- Players may not learn why one lane is better than another.
- The new route puzzle is present but not fully teachable yet.

Suggested next step:

- Add route-read copy like `Tailwind: longer carry`, `Crosswind: pushes left`, or `Open air: stable`.
- Consider a small wind arrow legend in the shot setup HUD.

### Forecast Uncertainty May Be Too Large By Default

Status: Open

The current first-drive forecast can show uncertainty over 120 ft. That supports the goal of avoiding exact deterministic previews, but it may be too wide for players to make a confident first decision.

Impact:

- New players may feel the result is unknowable rather than skillful.
- The forecast zone can dominate the course visually.

Suggested next step:

- Reduce baseline uncertainty on default recommended shots.
- Let high uncertainty come from riskier lanes, high power, poor lies, and low-control discs.

### Course Hazards Need Stronger Rule Affordance

Status: Open

Ruins and mushrooms are visually present, and lie quality can become rough/scramble, but the course does not yet make every hazard’s rule impact obvious at a glance.

Impact:

- Players may not understand why a lie becomes rough or scramble.
- Route planning is less satisfying if hazard consequences are unclear.

Suggested next step:

- Add consistent hazard boundary styling.
- Add short labels like `Scramble`, `Rough`, or `Safe shelf` only where needed.

### Putting Feedback Is Functional But Thin

Status: Open

Putting works and is visually distinct, but missed-putt feedback is still basic. It does not yet clearly explain whether the player missed because of aim, power, or wind.

Impact:

- Putting can feel less learnable than throwing.
- Players have less reason to improve beyond repeating the same input.

Suggested next step:

- Add result-specific feedback: `wide right`, `short`, `sailed long`, or `wind pushed it`.
- Add lightweight chain/rim/miss visual states.

## P3 - Polish And Technical Debt

### Phaser Bundle Size Warning

Status: Open

`npm run build` succeeds, but Vite reports that the Phaser bundle is larger than 500 kB after minification.

Impact:

- Not a prototype blocker.
- Could matter later for mobile load time.

Suggested next step:

- Defer until the gameplay loop is stronger.
- Later, consider route-level code splitting or Vite chunk configuration.

### Test Runner Often Finds Port 5173 Already In Use

Status: Open

`npm run test:e2e:server` passes, but it often reports that port `5173` is already in use before running against the active local server.

Impact:

- Not a gameplay issue.
- Can confuse developers reading test output.

Suggested next step:

- Add a separate E2E script for using an already-running dev server.
- Or make the dev server port configurable for Playwright runs.

### Package Lock Has Environment Churn

Status: Open

`package-lock.json` currently shows lockfile metadata changes unrelated to gameplay work.

Impact:

- Can create noisy diffs.

Suggested next step:

- Review whether the lockfile changes are intentional before committing.
- Avoid touching lockfile metadata unless dependency changes require it.

## Known TODOs

These are not all defects. They are known follow-up tasks from documentation, playtests, and implementation gaps.

### Mobile HUD And Readability

- Design a compact shot setup HUD that does not cover the tee/current lie or wind-lane labels.
- Add a collapsed or drawer state for secondary readouts such as uncertainty, route wind details, and risk explanation.
- Add responsive layout checks for at least one narrow mobile viewport and one desktop viewport.
- Add Playwright visual assertions or screenshot review steps for label clipping and HUD overlap.

### Forecast, Labels, And Route Reading

- Clamp in-canvas forecast labels inside the visible playfield.
- Replace long in-canvas forecast text with shorter chips.
- Add adaptive label placement so the current lie, forecast, wind lanes, basket, and OB labels do not stack on top of each other.
- Tune first-shot defaults so the starting recommendation is readable and not immediately high-risk.
- Reduce baseline first-drive uncertainty while keeping risky shots visibly uncertain.

### Wind And Course Strategy

- Improve wind-lane language so players understand whether a lane adds carry, pushes left/right, or stabilizes the shot.
- Add a small wind legend or route-read tooltip.
- Tune wind-zone strength and placement after more playtests.
- Add at least one clearly safer landing shelf and one higher-reward risky lane.

### Hazards And Lies

- Make rough and scramble areas visually distinct from decorative scenery.
- Add consistent hazard boundary styling for ruins, mushrooms, and rough.
- Ensure every lie-quality change is visually explainable from the course.
- Decide whether mushrooms should be decorative only or a rule-bearing hazard.

### Putting

- Add miss feedback that explains aim, power, or wind cause.
- Add chain, rim, and miss visual states.
- Tune putting forgiveness after the throw game has stronger route decisions.

### Characters And Progression

- Revisit goblin names and special abilities after the first playable hole is stable.
- Decide whether characters need separate large portraits and small gameplay sprites.
- Decide whether stat differences are enough or if each goblin needs a signature ability.

### Art And Assets

- Replace remaining functional placeholders with polished pixel-art-style assets.
- Decide whether to generate large character portraits, small gameplay sprites, or both.
- Add goblin throw, idle, success, and miss reactions.
- Add more course props only after hazard readability is solved.

### Technical And Tooling

- Review `package-lock.json` before committing to remove accidental environment-only churn if needed.
- Add an E2E command for testing against an already-running dev server.
- Consider configurable Playwright/dev-server ports.
- Defer Phaser bundle-size work until gameplay stabilizes.

## Recently Resolved

### Exact Deterministic Landing Preview Made Throws Too Solved

Status: Resolved

The prototype now shows a forecast zone, confidence, uncertainty, and a faded path instead of an exact landing answer.

### OB Relief Could Reset To A Bad Fixed Point

Status: Resolved

OB relief now resolves near the out-of-bounds landing while staying in bounds, so recovery remains playable.

### Aim Could Become Wrong After Overshooting The Basket

Status: Resolved

Aim is now centered on the current lie-to-basket bearing, so recovery shots can point back toward the target.

### Putting Had Duplicate Power Controls

Status: Resolved

Putting now uses a single power slider and release action.
