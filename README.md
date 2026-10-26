# Little Match Adventure

A cheerful animal memory game for children aged 3–5. Flip colorful tiles, find pairs, and explore Sunny Meadow at your own pace.

## Play locally

No dependencies or build step are required. From this directory, run:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

Open the server in your browser. You can also open `index.html` directly, though local progress storage can vary for file URLs.

## Included

- Welcome screen, world map, and 20 playable Sunny Meadow stages.
- Gradual difficulty from 3 to 8 animal pairs, shuffled on every new board.
- Gentle hints, stage restart, completion celebrations, and optional sound.
- Local progress and sound preferences; guarded reset in the parent corner.
- Keyboard-operable buttons, responsive layouts, and reduced-motion support.
- No accounts, ads, tracking, external assets, or backend.

Additional worlds are marked “Coming soon.” Animal art currently uses system emoji and varies by device. This is an initial playable prototype; parent playtesting and device accessibility review should precede a public launch.

## GitHub Pages

Push these files to `main`. In repository **Settings → Pages**, select **Deploy from a branch**, then **main** and **/ (root)**. All asset paths are relative, so the game works under the repository’s Pages subpath.

## Manual checks

Match and mismatch tiles; try rapid taps during a mismatch; use a hint; restart a stage; finish a stage and reload to check saved progress. Check sound and the guarded parent reset. Test phone and desktop sizes, keyboard navigation, and reduced-motion preferences.
