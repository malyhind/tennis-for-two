**English** · [Русский](PUBLISHING.ru.md)

# Publish on GitLab Pages

The repository contains the standalone instrument, readable source, circuits, research in English and Russian, and browser benches. The Pages site serves the same instrument and documents, with a checks hub at `checks/index.en.html`. The original project belongs to the [Imperial School Laboratory](https://games.oopssre.ru/en/lab/) at the [Imperial School Arcade](https://games.oopssre.ru/).

1. Create a GitLab project and upload the **contents** of `tennis-for-two/` to the repository root, including `.gitlab-ci.yml` and `.gitignore`. Do not upload the ZIP itself or the website integration package.
2. Push to the project's default branch. The included Pages job copies ready files into `public/`; it does not rebuild the solver, generate PDFs, record a demo, or run the numerical suite. GitLab Pages uses this small CI job to publish static files. The project needs an enabled runner.
3. Open **Deploy → Pages** to get the actual URL. It may use a generated unique domain; do not infer it from the repository name. For a public project, check that Pages access is set to **Everyone with access** for anonymous visitors (the label can be **Everyone** for other project visibility levels).
4. In **Settings → General**, set the project website to this Pages URL. Add links to the game, checks and research near the top of both READMEs once the address is known.

The default Pages URL opens the instrument. Append these relative paths:

| Path | Contents |
| --- | --- |
| `checks/index.en.html` / `checks/index.html` | Browser checks hub, EN / RU |
| `app/display-bench.en.html` / `app/display-bench.html` | Interactive transistor switch bench |
| `tests/scope-check.en.html` / `tests/scope-check.html` | CPU/WebGL display, optics and fallback checks |
| `app/docs/research.en.html` / `app/docs/research.html` | Research, diagrams, sources and current PDF links |

The hub can run the real circuit for 0.25, 1 or 8 simulated seconds, report solver time, and export a JSON result. Checks run only on request, on the visitor's device. They are smoke checks, not the full Node numerical suite. The display bench explicitly reports unavailable WebGL checks as skipped. No results are sent to a server.

To inspect the exact static export locally:

```sh
python3 tools/build-pages.py
python3 -m http.server 8080 --directory public
```

Open http://localhost:8080/checks/index.en.html . The same export works under a project subpath: links, ES modules, workers, WASM and circuits use relative URLs. The optional recording is included only if you have generated it before publication; it is absent from the source package. The live instrument works without it.

The generated `public/` directory is ignored by Git. It contains the instrument, ready documents and dependency notices. The physical model and game version remain 0.8.4.

Official instructions: [GitLab Pages](https://docs.gitlab.com/user/project/pages/) · [Plain HTML publication and settings](https://docs.gitlab.com/user/project/pages/introduction/).
