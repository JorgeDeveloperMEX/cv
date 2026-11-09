# Jorge Silva — CV

Personal CV site for **Jorge Silva, Sr. .NET Engineer**, built as a static Art Deco–styled landing page and hosted on GitHub Pages.

**Live:** https://jorgedevelopermex.github.io/cv/

## Structure

```
.
├── index.html            # Page markup
├── 404.html              # Custom not-found page (served by GitHub Pages)
├── .nojekyll             # Serve files as-is, skip Jekyll processing
├── sitemap.xml           # Submit in Google Search Console (update <lastmod> on changes)
└── assets/
    ├── css/main.css      # All styles (tokens, layout, responsive, print)
    ├── js/main.js        # Nav, scroll reveal, mobile menu, circuit background
    └── img/
        ├── photo.jpg     # Profile photo (720×900, optimized)
        ├── og-image.jpg  # Social share preview (1200×630)
        └── favicon.svg
```

No build step and no dependencies — fonts load from Google Fonts.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

1. Push to `master`.
2. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `master`, folder `/ (root)`.

## Print / PDF

The page includes print styles — use the **Print / PDF** button in the footer (or Ctrl/Cmd + P) to export a light, printer-friendly version.
