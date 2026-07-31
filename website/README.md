# Vespara website

The first public website for Vespara. A self-contained static site — plain
HTML, CSS, and JavaScript, no build step, no framework, no backend.

## Files

- `index.html` — the whole page: header/nav, hero, Experience, Sanctuary,
  Library, Control Room, Supported Systems, Media, Download, FAQ, and footer.
- `styles.css` — all styling, including the responsive breakpoints and
  `prefers-reduced-motion` handling.
- `script.js` — the mobile navigation toggle only. No analytics, no
  trackers, no third-party requests.
- `assets/` — local images. See `assets/README.md` for exactly which
  screenshots are still needed and where each one goes.

## Previewing locally

No build step and no server-side code, so any static file server works.
From the `website/` folder:

```
python3 -m http.server 8000
```

or, if you have Node available:

```
npx serve .
```

Then open `http://localhost:8000` in a browser. Opening `index.html`
directly via a `file://` URL also works for a quick look, though a local
server is closer to how it'll actually be hosted.

## Adding screenshots

See `assets/README.md` — it lists the exact filenames `index.html` already
references, what each one should show, and how to swap a placeholder for
the real image once you have it.

## Updating the version or download link

The version number and download link appear in a few places:

- `index.html`: the hero's "Current version" meta item, the Download
  section's heading and meta list, the footer's "Version" line, and the
  `<title>`/meta description if they mention a version.
- The GitHub Releases link (`https://github.com/romeclientel1/nuarcade/releases/latest`)
  always points at the latest release, so it doesn't need updating per
  version — only the visible version text does.
- The Owner's Manual link points at `USER_MANUAL.md` on the `main` branch,
  so it always reflects whatever is currently on `main`.

This site is not wired into `scripts/set-version.js` (that script only
covers `package.json`, `package-lock.json`, `README.md`, and
`useVersionCheck.js` — the actual application). Version mentions here need
to be updated by hand when Vespara's version changes.

## Deployment

Not configured yet. This is a plain static site (`index.html` + `styles.css`
+ `script.js` + `assets/`), so it's deployable as-is to GitHub Pages, any
static host, or a CDN — but no hosting, CI, or domain has been set up in
this pass.
