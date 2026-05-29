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

### Right-Side HUD Obscures Late-Hole Basket Target

Status: Resolved

In the landscape layout, the right-side DOM HUD overlaps the active playfield instead of sitting fully outside it. During late approach shots and OB relief recovery, the basket target ring, `BASKET TARGET` label, current lie label, and forecast/landing labels can sit underneath the control panel.

Evidence:

- `test-results/visual-audit/04-hyzer-flight-path.png` (QA playtest, 2026-05-14)
- `test-results/qa-playtest/07-after-ob-relief.png` (QA lead screenshot, 2026-05-14)
- `/private/tmp/goblin-golf-tester-a/06-lie-2.png` (Tester A, 2026-05-14)
- `test-results/tester-b-2026-05-14/08-after-ob-relief.png` (Tester B, 2026-05-14)
- `test-results/verify-complete/06-after-ob-relief.png` and `test-results/visual-audit/04-hyzer-flight-path.png` (verification, 2026-05-14): basket ring is clear, but the `BASKET TARGET` label still reaches underneath the HUD edge.

Impact:

- Players lose sight of the basket and landing context exactly when they need to plan a scoring approach or recovery shot.
- The current layout documentation says the right panel does not overlap the fairway, but the actual play area extends behind the HUD.

Suggested next step:

- Reserve a true right-side UI gutter outside `HoleScene`'s projected playfield, shrink/shift `playRight`, or clamp/offset course labels so their full bounding boxes cannot render underneath `.hole-controls`.
- Add a visual audit assertion or screenshot review case for late-hole approach and OB relief states.

### Aim Readout Truncates With Ellipsis

Status: Resolved

The Aim readout in the shot setup split-card is cut off with an ellipsis (e.g. `6 deg r…` instead of `6 deg right`). The `.readout-value` element has `text-overflow: ellipsis; white-space: nowrap` and the split-card does not give the cell enough width to show directional text.

Evidence:

- `06-shot-setup.png`, `07-aim-left.png`, `08-aim-right.png` (agent visual audit, 2026-05-13)

Impact:

- Players cannot read their full aim offset during the most critical decision moment.
- The truncation makes the HUD look broken.

Suggested next step:

- Allow the aim value to wrap to two lines (`white-space: normal`) or abbreviate: `6° R` / `24° L`.
- Alternatively widen the split-card aim cell and shrink the power cell.

### Mobile Shot HUD Obstructs The Playfield

Status: Resolved

The shot setup HUD covers the lower half of the canvas. The screen-state panel was reduced from 8 rows to 4 rows, but the combined overlay (status panel + 4-cell grid + readout card + power pad + button row) still starts around y=555 on a 844px viewport. The tee/current lie marker and the MOSS TAILWIND wind-zone label are hidden behind or very close to the overlay top edge.

Evidence:

- `06-shot-setup.png`, `10-lie-resolved.png` (agent visual audit, 2026-05-13)
- `test-results/visual-audit/03-shot-setup.png`

Impact:

- Players cannot fully inspect the tee lie, wind lane, or lower course area before throwing.
- Wind lane labels inside the playfield are clipped by the HUD.

Suggested next step:

- Move the overlay anchor point higher or collapse it further so the canvas below y=500 is fully visible.
- Keep only aim readout, power pad, and throw button in the persistent layer; move status/forecast into a pull-up sheet.

### Forecast Label Overlaps Course Elements When Aiming Left

Status: Resolved

Canvas forecast labels were shortened to chips and position clamping was tightened, but when the player drags aim hard left into OB territory, the clamped `THROW FORECAST / OB risk` label jumps to a fixed screen position that overlaps the RUINS hazard label or the wind-zone arrow.

Evidence:

- `07-aim-left.png` (agent visual audit, 2026-05-13)
- `test-results/visual-audit/04-hyzer-flight-path.png`

Impact:

- Forecast information and course labels visually compete.
- OB-risk warning and hazard labels are both important at the same moment.

Suggested next step:

- Offset the forecast label in the opposite direction from the hazard labels (push label right when aiming left and vice versa).
- Consider hiding the forecast label entirely while aiming into OB and relying on the risk chip in the HUD.

### Default First Shot Still Not On A Safe Line

Status: Resolved

The initial aim offset was moved 6° right to avoid the scramble zone. The risk now reads `Medium - shape touch` instead of `High - blocked stance`, which is an improvement, but the default still does not land the player on a clearly safe, readable line. A new player sees a medium-risk forecast on their very first throw.

Evidence:

- `06-shot-setup.png` (agent visual audit, 2026-05-13)
- `test-results/visual-audit/03-shot-setup.png`

Impact:

- First impression still feels marginal rather than welcoming.
- Players may interpret medium risk as a warning rather than a suggestion.

Suggested next step:

- Tune default aim/power to reach a fairway landing with `Low - open lane` risk for all three characters.
- Consider a character-specific default that matches each goblin's play style (e.g. Morga starts more conservative, Skrak starts more aggressive).

## P2 - Gameplay And UX Improvements

### Tap-In-Range Misses Stay In Manual Putting View

Status: Resolved

After a missed putt lands inside tap-in range, the game remains in the full manual putting view. The HUD can show a very short putt such as `Putt 4 ft`, but the visual putt lie is still drawn at the fixed putting tee location far from the basket, and the player must press `Release putt` again to complete the tap-in.

Evidence:

- `/private/tmp/goblin-golf-qa-c/putt-after-miss.png` (Tester C, 2026-05-14)

Impact:

- The design says very close putts should become automatic tap-ins.
- A 4 ft putt still being presented as a full basket-focused challenge adds unnecessary friction and makes the visual lie distance look misleading.

Suggested next step:

- When a missed putt's resulting lie is inside `tapInRange`, automatically apply the tap-in or transition immediately to a clear tap-in resolution state.
- If manual follow-up is intentional, scale the putting lie/basket geometry to represent the actual remaining distance.

### Selected Character Badge Reads As Locked Or Premium-Gated

Status: Resolved

The selected character card displays a gold `LOCKED` badge in its top-right corner. In standard UI convention `LOCKED` signals that content is unavailable or requires a purchase. Here it means the character is the active selection. First-time players will likely interpret this as the character being unavailable to them.

Evidence:

- `03-char1-selected.png`, `04-char2-selected.png`, `05-char3-selected.png` (agent visual audit, 2026-05-13)

Impact:

- Players may skip the highlighted character and try to select a different one.
- Onboarding confusion on the very first screen after title.

Suggested next step:

- Replace `LOCKED` with `SELECTED`, `CHOSEN`, or a checkmark icon.

### Character Tab Row Is Visually Disconnected From Cards

Status: Resolved

The three character name tabs (`Grib`, `Morga`, `Skrak`) at the bottom of the character select screen are separated from the character cards above by approximately 150px of empty dark space. There is no visual line, bracket, or connecting element to show which card a tab refers to. A new player tapping `Morga` has no obvious cue showing which card just highlighted.

Evidence:

- `02-character-select.png`, `04-char2-selected.png` (agent visual audit, 2026-05-13)

Impact:

- Character selection feels disconnected rather than direct.
- Players may not understand that tapping a tab scrolls or selects a card.

Suggested next step:

- Move tabs directly below or alongside their respective cards.
- Or use a horizontal card carousel that scrolls to the selected character when a tab is tapped.

### Throw Disc Button Remains Active During Flight With No Queue Feedback

Status: Resolved

After the player taps `Throw disc`, the disc enters the flight animation and the mode switches to `flight`. The overlay shows `Disc in flight / Watch the landing…` but also renders an active `Throw disc` button. Clicking it while flight is resolving queues a second throw. There is no visual indicator that the button is queuing rather than firing immediately, so repeated taps feel unresponsive.

Evidence:

- `09-flight.png` (agent visual audit, 2026-05-13)

Impact:

- Players who tap the button during flight think the game is frozen.
- Repeat-tapping can queue multiple throws unintentionally.

Suggested next step:

- Disable the `Throw disc` button during flight and replace its label with `Watch the flight…` or hide it entirely.
- If queuing is a deliberate feature, show a visible queue indicator (e.g. `Next throw queued ✓`).

### Putting Drag Instruction Is Not Prominent Enough

Status: Resolved

The putting view starts with the crosshair centered on the basket (`Aim miss: 0 px`). The instruction text `Drag crosshair on basket` is rendered at 15px in the canvas at approximately y=512, below the large distance text and above the HUD overlay edge. Many players will not notice it and will simply click `Release putt` without ever adjusting aim.

Evidence:

- `11-putting.png` (agent visual audit, 2026-05-13)

Impact:

- The aim mechanic in putting is invisible to players who skip the instruction.
- Puts feel random rather than skill-based if the player never drags the crosshair.

Suggested next step:

- Add a brief animated pulse or arrow on the crosshair that plays for 2 seconds when putting mode is entered.
- Or move the drag instruction into the HUD panel where it competes less with the large distance text.

### Wind Lanes Need Clearer Player Language

Status: Resolved

Wind lanes are now rendered and sampled by shot physics, but the player-facing meaning is still terse. `Moss Tailwind 2.0` and `Ruin Crosswind 0.7` are readable as labels, but they do not explain whether the lane helps, hurts, or bends the shot.

Impact:

- Players may not learn why one lane is better than another.
- The new route puzzle is present but not fully teachable yet.

Suggested next step:

- Add route-read copy like `Tailwind: longer carry`, `Crosswind: pushes left`, or `Open air: stable`.
- Consider a small wind arrow legend in the shot setup HUD.

### Forecast Uncertainty May Be Too Large By Default

Status: Resolved

The current first-drive forecast can show uncertainty over 120 ft. That supports the goal of avoiding exact deterministic previews, but it may be too wide for players to make a confident first decision.

Impact:

- New players may feel the result is unknowable rather than skillful.
- The forecast zone can dominate the course visually.

Suggested next step:

- Reduce baseline uncertainty on default recommended shots.
- Let high uncertainty come from riskier lanes, high power, poor lies, and low-control discs.

### Course Hazards Need Stronger Rule Affordance

Status: Resolved

Ruins and mushrooms are visually present, and lie quality can become rough/scramble, but the course does not yet make every hazard's rule impact obvious at a glance.

Impact:

- Players may not understand why a lie becomes rough or scramble.
- Route planning is less satisfying if hazard consequences are unclear.

Suggested next step:

- Add consistent hazard boundary styling.
- Add short labels like `Scramble`, `Rough`, or `Safe shelf` only where needed.

### Putting Feedback Is Functional But Thin

Status: Resolved

Putting works and is visually distinct, but missed-putt feedback is still basic. It does not yet clearly explain whether the player missed because of aim, power, or wind.

Impact:

- Putting can feel less learnable than throwing.
- Players have less reason to improve beyond repeating the same input.

Suggested next step:

- Add result-specific feedback: `wide right`, `short`, `sailed long`, or `wind pushed it`.
- Add lightweight chain/rim/miss visual states.

## P3 - Polish And Technical Debt

### Character Select Text Clips And Connector Label Hides Behind Buttons

Status: Resolved

On the landscape character select screen, Morga's quote can clip at the right edge of the card. The canvas connector label `SELECT YOUR GOBLIN` is also partially hidden behind the DOM tab buttons, leaving stray letters visible between controls.

Evidence:

- `test-results/tester-b-2026-05-14/02-character-select.png` (Tester B, 2026-05-14)
- `test-results/tester-b-2026-05-14/03-character-skrak-selected.png` (Tester B, 2026-05-14)

Impact:

- The first interactive screen reads as unfinished because text and decorative guidance collide.
- The clipped quote weakens character readability before the player chooses a goblin.

Suggested next step:

- Tighten card text wrapping or reduce quote width/font size so quotes fit inside all cards.
- Move the canvas connector label above the DOM tab row, remove it, or render it as part of the DOM controls so layering is predictable.

### Title Screen Tee Box Label Is Buried In The Art

Status: Resolved

The `Tee box open` label on the title screen is dark text drawn into the basket/fairway illustration. It blends into the green bar art and appears partially buried behind the course prop rather than intentionally placed.

Evidence:

- `test-results/tester-b-2026-05-14/01-title.png` (Tester B, 2026-05-14)

Impact:

- The first screen has a visible piece of text that reads like accidental layering.
- It distracts from the title composition and weakens the first impression.

Suggested next step:

- Remove the label, move it clear of the basket illustration, or restyle it with stronger contrast and intentional placement.

### Aim Drag Ignores Exact Playfield Border Pixels

Status: Resolved

Dragging exactly on the visible playfield border does not update aim because `HoleScene.handleDrag()` uses strict bounds checks. For example, after dragging to the top edge to set `42° L`, dragging to the bottom border at y=660 can leave the aim at `42° L`; dragging one pixel inside updates it to `42° R`.

Evidence:

- `/private/tmp/goblin-golf-qa-c/aim-at-bottom-border.png` (Tester C, 2026-05-14)

Impact:

- Players naturally drag to the edge to request maximum aim.
- A dead border pixel can preserve the previous opposite extreme and set up the wrong throw.

Suggested next step:

- Use inclusive bounds for the playfield edge or clamp all pointer coordinates into the aimable playfield before calculating aim.

### Parallel Playwright Runs Can Be Timing-Sensitive

Status: Resolved

During QA playtests, default parallel Playwright runs intermittently timed out around `Disc in flight` and putting transitions, while the same flows passed in isolation or with fewer workers. The QA lead's final full-suite run passed, so this appeared timing-sensitive rather than deterministic.

Evidence:

- Tester A report, 2026-05-14: `npm run test:e2e:server` failed 3/12 under parallel load, isolated reruns passed.
- Tester B report, 2026-05-14: default parallel run failed 4/12, `npx playwright test tests/e2e/prototype-flow.spec.ts --workers=1` passed.
- QA lead rerun, 2026-05-14: `npx playwright test` passed 12/12.

Resolution (2026-05-29):

- Flight-transition waits no longer match the transient `Disc in flight` status text (whose DOM node is destroyed and rebuilt on every overlay re-render). The shared `waitForFlightToResolve` helper polls the stable, persistent `[data-scene='hole']` overlay element for its mode CSS class instead, waiting for `hole-controls--flight` to clear. This also covers the putting transition, which intentionally holds the flight class through a short delay before flipping to `--putting`.
- Transition timeouts were widened (7s → 10s) and the cold-boot title wait in `startHole` (10s → 20s) to absorb dev-server contention when many workers cold-load Phaser at once.

If flakes ever resurface under heavier load, the next lever is capping `workers` in `playwright.config.ts` for the animation-heavy suite.

### Score Screen Flavor Label Looks Like A Button

Status: Resolved

The `Clean finish` result label on the score screen is rendered inside a dark card with a border, making it look like a tappable button. It is static flavor text. Players may tap it expecting to navigate forward, then be confused when nothing happens. The only real action is `Play again` at the bottom.

Evidence:

- `12-after-putt.png` (agent visual audit, 2026-05-13)

Suggested next step:

- Remove the border and button-like styling from flavor text.
- Use plain centered text with a different color or italic style to distinguish it from interactive elements.

### Flight View Course Props Look Like Rendering Artifacts

Status: Resolved

Several mushroom and rock props in the flight view appeared at y=630–730, below the green fairway rectangle and any labeled area. Against a dark background with no ground context, they read as isolated colored dots rather than course scenery.

Evidence:

- `09-flight.png` (agent visual audit, 2026-05-13)

Resolution (2026-05-29):

- The flight view (`HoleScene.drawCourse`) now tiles the entire play area: a top OB band, the grass fairway, and a bottom OB band sum exactly to `playHeight`. All scenery props map (via `worldToScreen`) inside `hole.bounds` → screen y in `[playTop, playBottom]`, so every prop lands on either the purple OB texture or the grass, never the bare `0x142018` background. Verified with a live flight-view capture: no floating props. The original evidence predates the full-coverage OB-band layout.

### Score Screen Hole Name Has Low Contrast Against Gold Circle

Status: Resolved

The hole name `Ruincap Run` is drawn inside a gold-filled circle backdrop that sits below the `Round Complete` headline. The text color is low contrast against the gold fill at the scale rendered.

Evidence:

- `12-after-putt.png` (agent visual audit, 2026-05-13)

Suggested next step:

- Use dark ink (`#10150f`) for the hole name text against the gold circle, or move the name outside the circle.

### Stat Bars Are Hard To Read At Small Sizes

Status: Resolved

The stat bars on character cards were 6px tall with a 54px track whose dark-green fill matched the unselected card background, so the empty portion was nearly invisible and filled vs. empty contrast was low at arm's length, especially for mid-range values (3/5).

Evidence:

- `05-char3-selected.png` (agent visual audit, 2026-05-13)

Resolution (2026-05-29):

- Bar height increased 6px → 10px and the stat box grew 22px → 26px to fit it. The track is now a near-black `0x0c130d` with a `0x4c5f3a` outline so the empty portion reads against both card variants, and the fill is brightened to a cream-gold `0xf3e58a`. Verified with a live character-select capture across all three goblins (e.g. 2/5 vs 5/5 are now clearly distinguishable).

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

### Landscape HUD And Readability

- Keep the right-side overlay outside the active playfield during shot setup.
- Keep compact aim readouts readable with abbreviated format (`6° R`).
- Add responsive layout checks for the target 1280x720 viewport and any future alternate viewport before enabling that target.
- Add Playwright visual assertions or screenshot review steps for label clipping and HUD overlap.

### Forecast, Labels, And Route Reading

- Prevent forecast label from overlapping hazard labels when aiming left or into OB; offset label direction away from course elements.
- Tune first-shot defaults so all three characters see `Low - open lane` on the default suggestion.
- Reduce baseline first-drive uncertainty while keeping risky shots visibly uncertain.

### Character Select

- Replace `LOCKED` badge with `SELECTED` or a checkmark on active character.
- Visually connect the tab row to the character cards (move tabs closer or use a carousel).

### Shot Setup And Flight

- Disable or relabel `Throw disc` button during flight animation; if queuing is kept, show a visible queue confirmation.
- Decide on a durable layout split between the persistent control layer and the collapsible detail layer.

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
- Extend ground/rough band in flight view so props outside the fairway rectangle are visually anchored.

### Putting

- Add a prominent drag prompt or crosshair pulse animation when entering putting mode.
- Add miss feedback that explains aim, power, or wind cause.
- Add chain, rim, and miss visual states.
- Tune putting forgiveness after the throw game has stronger route decisions.

### Score Screen

- Remove border/button styling from flavor-text labels so they are not mistaken for actions.
- Fix backdrop prop bleed below score card border.
- Improve hole name legibility against gold circle (use dark ink or reposition).

### Characters And Progression

- Revisit goblin names and special abilities after the first playable hole is stable.
- Replace placeholder portrait geometry with distinct pixel-art silhouettes.
- Increase stat bar height and fill contrast for readability at phone viewing distance.
- Decide whether stat differences are enough or if each goblin needs a signature ability.

### Art And Assets

- Replace remaining functional placeholders with polished pixel-art-style assets.
- Decide whether to generate large character portraits, small gameplay sprites, or both.
- Add goblin throw, idle, success, and miss reactions.
- Add more course props only after hazard readability is solved.
- Add a meaningful visual to the title screen upper zone (goblin trio, landscape, or tighter layout).

### Fantasy Physics Modifiers

These are future course features, not current-hole defects. They should be designed before the second hole is laid out.

#### Hex Spiral (Swirling Vortex)

A pool of spiraling magical energy. Discs flying through it are pulled into a rotational curve whose strength depends on entry depth.

- **Outer ring:** gentle curve. Usable to bend a shot around an obstacle or redirect a fade.
- **Center:** sharp spiral resulting in a scramble lie.
- **Skilled use:** entering the outer ring at a calculated angle redirects the disc along a curve that wraps around a ruin block or cliff face to reach an otherwise-blocked basket.

Implementation questions:
- Sample the vortex spiral force at each route step, or resolve as a single force at midpoint?
- Should the outer ring show a visible arc preview in the forecast?
- How does the Runic Maw interact with an active vortex if both are on the same route?

#### Runic Maw (Gravity Well)

A point of concentrated magical gravity that pulls nearby discs toward its center during flight.

- **Outer influence zone:** gentle pull toward the Maw. Usable as a carry bonus if positioned favorably.
- **Transition zone:** significant pull that bends the arc. Threading this zone at the right angle and disc speed produces a slingshot — the disc exits faster than it entered.
- **Pit center:** disc pulled in fully; treat as OB with a penalty stroke.

Slingshot line is the high-risk, high-reward route: a fast driver resists the Maw center but captures less boost; a slower midrange is pulled harder and needs a more precise entry angle.

Implementation questions:
- Slingshot bonus: distance multiplier, or extra carry appended to the landing calculation?
- Disc speed proxy: use `effectivePower * disc.distance`, or introduce an explicit speed stat?
- Does the Wind Read stat and/or the on-screen forecast reveal the pull radius clearly enough to teach the mechanic without a tutorial?
- Should pit-center landings place the lie inside the Maw (unusual scramble) or at a configured relief point outside?

### Technical And Tooling

- Review `package-lock.json` before committing to remove accidental environment-only churn if needed.
- Add an E2E command for testing against an already-running dev server.
- Consider configurable Playwright/dev-server ports.
- Defer Phaser bundle-size work until gameplay stabilizes.

## P3 - Refactoring And Code Health

### Scramble Zones Have Two Sources Of Truth

Status: Resolved

`getLieQuality()` in `logic.ts` previously defined the scramble zone rectangles with inline math from `hole.bounds`, and `HoleScene.drawScrambleZoneBoundaries()` copied those coordinates.

Resolution (already in place; verified 2026-05-29):

- Scramble zones are now authored as a `scrambleZones` array of `{ id, rect }` on each `HoleConfig` in `data.ts`. Both `getLieQuality()` (logic) and `drawScrambleZoneBoundaries()` (scene) read `hole.scrambleZones` and consume `zone.rect` directly, so there is a single source of truth. No duplicated inline math remains.

### Wind Zone Effect Descriptions Keyed By Magic String ID

Status: Resolved

`HoleScene.windEffectDescription()` identified wind effects by checking `forecast.routeWindZones.includes("left-tailwind")` and `"right-crosswind"`. This tied UI label logic to specific string IDs from `data.ts`, so adding or renaming a zone silently stopped showing the effect description, and only Hole 1's two zones ever got specific copy.

Resolution (2026-05-29):

- Added a `WindEffect = "tailwind" | "crosswind" | "headwind" | "calm"` type and a required `effect` field on `WindZone` (`types.ts`). The `"calm"` value was needed for Hole 4's Calm Pocket. Every zone across all nine holes now declares its effect in `data.ts`.
- `windEffectDescription()` derives copy from the route zones' `effect` values (`longer carry` / `push across` / `shorter carry` / `stays steady`), and `drawWindZones()` colors lanes by `zone.effect === "tailwind"`. As a side benefit every hole's lanes now get correct effect copy and consistent coloring (tailwinds on holes 3/7/9 now read blue), not just Hole 1.

### HoleScene Is A 1300-Line God Object

Status: Open

`HoleScene` handles Phaser canvas rendering, DOM overlay construction, pointer input, tweens, and mode-switching (setup/flight/putting) in a single class. The three modes are interleaved enough that touching flight code requires navigating past putting code, and the class has grown fragile to extend.

Impact:

- Hard to reason about which state is active when reading any given method.
- Any new mode or mechanic (e.g. a second hole, a new hazard interaction) will make the class larger still.

Suggested next step:

- Split into: a `HoleRenderer` (Phaser canvas drawing only), a `HoleOverlay` (DOM controls only), and a thin `HoleScene` coordinator that owns mode state and delegates to both.
- Defer until a second hole is being built — the split is not worth the disruption while only one hole exists.

### `setSuggestedThrowDefaults` Uses Magic Distance Thresholds

Status: Resolved

The distance thresholds in `setSuggestedThrowDefaults` (260, 150) were unrelated to any `HoleConfig` field and did not scale with the course; they were tuned for Hole 1.

Resolution (2026-05-29):

- The suggested disc is now chosen by how many `puttingRange` units the basket sits out: driver beyond `puttingRange * 3`, midrange beyond `puttingRange * 2`, putter otherwise. With Hole 1's `puttingRange` of 90 px the thresholds (270 / 180) closely track the old constants, and they now scale automatically with each hole's configured range. Full e2e suite still green.

### E2e Tests Drifted From Production Code

Status: Open

The e2e tests contained checks for `"Wind lane"`, `"Target BASKET X ft"`, `"Forecast Flat Driver"`, and `"Uncertainty X ft"` — all removed in the P1 refactor — that were silently wrong until the full suite was run against the live build. No CI gate caught the drift.

Suggested next step:

- Add `npm run test:e2e:server` to the CI pipeline so e2e tests run on every PR.
- Consider lightweight DOM smoke assertions in `expectSetupStateReadouts` tied to CSS class names rather than display strings, so they survive label copy changes.

## Recently Resolved

### Character Portraits Are Minimal Placeholder Geometry

Status: Resolved

The character select screen now uses distinct SVG portraits for Grib, Morga, and Skrak, with different silhouettes, expressions, and accessories.

### Title Screen Upper Area Is Visually Sparse

Status: Resolved

The title scene now uses a composed storybook-style frame with a distant tree line, basket centerpiece, discs, ruins, mushrooms, and tee scenery.

### Score Screen Backdrop Props Bleed Behind Card Border

Status: Resolved

The score screen decorative disc shelves were moved to flanking positions beside the card, so the props no longer bleed behind the score card border or `Play again` button.

### Power Pad Thumb Hit Target Is Too Small

Status: Resolved

The old draggable power pad was removed when the dice mechanic shipped, so the small thumb hit-target issue is no longer applicable.

### Missed-Putt E2E Test Expects Old Manual-Putt State

Status: Resolved

`tests/e2e/prototype-flow.spec.ts` now accepts immediate score-summary completion for tap-ins and still verifies manual miss status text when the hole remains in putting mode.

### HUD Screen-State Reduced From 8 Rows To 4

Status: Resolved

The shot setup screen-state panel was cut from 8 rows (Current lie, Lie quality, Target, Forecast, Uncertainty, Wind lane, Risk read, Next action) to 4 rows (Lie, Wind, Forecast, Risk). Redundant and canvas-duplicated information was removed.

### Canvas Forecast Labels Shortened To Chips

Status: Resolved

`previewLandingLabel` now returns short chips: `OB risk`, `Near chains`, `high putt`, `medium landing`, etc. Position clamping was tightened to `x: [86, 282], y: [200, 488]`.

### Default First Drive Aim Moved Off Scramble Zone

Status: Resolved

`setSuggestedThrowDefaults` now sets `aimOffsetDegrees = 6` for long drives, shifting all three characters' default landing from the scramble zone at x=62–134 to open fairway. Risk reads `Medium - shape touch` or better rather than `High - blocked stance`.

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
