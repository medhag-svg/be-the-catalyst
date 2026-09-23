# Between Bodies — Living Portal

A Kinect v2 interactive projection for the National Institute of Design. Visitors become catalysts: their hands attract and collect floating elements, bringing hands or people together combines those elements, and each valid molecular recipe transforms the entire field with a different visual and sonic reaction.

## Run

Double-click `RUN_LIVING_PORTAL.bat`.

The launcher builds the Kinect bridge, starts body and silhouette tracking, runs the local visual engine, and opens the native projector host. Internet access is not required after the initial host build.
The launcher automatically detects the first non-primary Windows display and fills it with a native borderless WebView2 projection host. No browser tabs, extensions, taskbar, recovery prompts, or browser controls appear in the installation.

Use `RUN_DEMO_WITHOUT_KINECT.bat` for mouse-driven development. Use `STOP_LIVING_PORTAL.bat` to stop the local bridge and server.
Always use `STOP_LIVING_PORTAL.bat` before switching off the computer; it closes the native projection host, Kinect bridge, and local server cleanly.

## Operator keys

- `H`: show or hide the technical HUD
- `C`: open or close portal calibration
- `D`: toggle mouse-driven demo mode
- `1`–`8`: preview the eight reaction finales
- `F`: enter browser fullscreen
- `M`: mirror or unmirror tracking
- `S`: turn the generative sound field on or off
- `R`: reset collective memory

While calibration is open:

- Arrow keys position the body field; hold `Shift` for larger steps
- `[` and `]` reduce or increase the silhouette scale
- `0` restores the default alignment
- `C` saves and closes calibration

Calibration, mirror direction, and sound preference are saved on the projection computer.

## Experience states

1. **Attract** — free hydrogen, oxygen, carbon, nitrogen, sodium, and chlorine atoms drift through the field.
2. **Collect** — an open hand attracts nearby elements; close the fist and hold for half a second to capture exactly one.
3. **Combine** — bringing both hands together, or joining another visitor, tests the collected atoms as a recipe.
4. **React** — valid combinations produce water, crystal, carbon, ammonia, methane, hydrogen, oxygen, or nitrogen behaviours with distinct graphics and sound.
5. **Release** — lower a hand below the hip for one second, or make the Kinect lasso gesture, to return unwanted atoms to the field.
6. **Continue** — consumed or released atoms return to the environment and visitors discover another reaction.

The experience resets itself when visitors leave. Ambient sound, arrival tones, and a two-person fusion chord are generated locally through the browser; no audio files or internet connection are required.

## Architecture

- `bridge/`: Microsoft Kinect SDK 2.0 body, depth, and body-index capture
- `server.js`: local-only frame relay and static server
- `experience/`: dependency-free WebGL and Canvas projection renderer

The installation listens only on `127.0.0.1:8766`.

For the physical setup and recovery procedure, read `EXHIBITION_SETUP.md`. A condensed control reference is available in `OPERATOR_CARD.md`.

## Browser controls

Hosted pages automatically use mouse mode; the local installation keeps Kinect mode.
Use `?demo=1` to explicitly enable mouse mode locally, or `?demo=0` to disable it.

- Move the pointer: the circle follows immediately without clicking.
- Click an atom to collect it. Your collection appears above the buttons (up to eight atoms).
- The Combine button names a matching recipe and becomes available when you have the ingredients. Click it to react; Space is an optional shortcut when the canvas has focus.
- Click Release Atoms (or press X) to empty the collection.
- Try clicking two H atoms, then Combine. Number keys 1–8 remain effect previews.

Mouse mode uses a single collection cursor and explicit Combine action. Kinect keeps its two-hand collection, proximity, and release gestures and requires the local Windows setup.

Browser rendering uses a simpler background shader, caps background resolution, skips body-texture uploads, and reduces atom/trail glow work. The foreground stays at its normal resolution.