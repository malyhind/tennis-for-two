**English** · [Русский](README.ru.md)

# Tennis for Two — electrical reconstruction

A standalone browser instrument, version 0.8.4. The ball computer, passive supply, 15-transistor display switch and oscilloscope macromodel share an ngspice/WebAssembly simulation. The browser calculates the beam, phosphor and glass. Planck.js calculates knob and button mechanics. CPU players operate the controls above the electrical model.

## Run

Extract the archive, open a terminal in this directory and run:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/ . The ready-to-run WASM and local dependencies are included. JavaScript, WebAssembly and Worker support are required. WebGL2 is used when available, with a CPU display fallback. The folder can also be hosted on an ordinary static HTTP server.

Choose Me and Opponent, Me and Fox (two people), or Gremlin vs Fox (two CPUs). Mechanics and glass are on by default. RU/EN changes the interface language while retaining circuit state.

## Optional real-time demo

The source archive includes the recorder, codec and player. The 43 MB prerecorded data is omitted.

With Node.js 24, run:

```sh
node tools/record-demo.mjs
```

This runs the actual circuit, CPU players and mechanical controls, then writes a lossless recording of at least 30 seconds, ending at a natural serve state into `app/demo/`. Reload the page: Demo appears as an additional mode, off by default, and plays at 1.00× while beam, phosphor and glass remain live. Recording takes longer than playback. Generate data before copying the folder to a read-only host.

## Source and verification

- `app/`: readable JS modules, SPICE circuits, local dependencies and their license/source materials.
- `tests/`: numerical, mechanics, optics, worker and replay checks; a browser CPU/GPU bench.
- `tools/build_solver.py`: rebuild the optimized WASM from the included upstream source and our patches.
- `tools/record-demo.mjs`: generate optional replay data.
- `tools/study_supply_divider.py`: repeat the declared static supply-divider experiment.
- `app/docs/research.en.html` / `research.html`: complete research, diagrams and sources.
- `app/docs/Gremlin_Tennis_Research_0.8.4.en.pdf` and the Russian counterpart: current research PDFs.
- [Reproduction instructions](REPRODUCING.md): commands, prerequisites and the scope of the checks.

Run `npm test` for the basic numerical suite. See package.json for the other named checks. npm installation is unnecessary; the project uses local browser dependencies and Node built-ins. Optional native comparisons require ngspice 45.2 and explicitly skip when it is absent.

Create the source ZIP with `python3 tools/package-release.py --output /path/to/tennis-for-two-0.8.4-source.zip`. It contains current source and documents once, excluding generated replay data and test logs. Verify an extracted archive with `sha256sum -c SHA256SUMS` (macOS: `shasum -a256 -c SHA256SUMS`).

## Attribution and limits

This is a reconstruction from published drawings and restoration research. Declared component models, inferred values, numerical limits and unsuccessful comparison criteria are documented. The original 1958 instrument is not available for direct calibration. Cloud CPU checks do not establish M1/Firefox or hardware GPU performance.

Our code and writing: MIT. ngspice and other adopted components retain their original licenses. See LICENSE, ACKNOWLEDGEMENTS.md and `app/vendor/`. The repository contains the instrument and its reproduction tools; site publishing infrastructure is maintained separately.

Author: Dmitry Malykhin, Gremlin. Research and development in dialogue with ChatGPT (OpenAI).

[Imperial School Engineer](https://oopssre.ru) · [Original project](https://games.oopssre.ru/lab/tennis-for-two.html) · [Channel @oopsSRE](https://t.me/oopsSRE) · [Contact @Timon_Crazy](https://t.me/Timon_Crazy) · [i@dmalyhin.ru](mailto:i@dmalyhin.ru)

Optional document build: `python3 -m pip install -r requirements-docs.txt`, then `python3 tools/build_research.py`. DejaVu fonts come from Matplotlib.
