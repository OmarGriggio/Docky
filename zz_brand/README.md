# Brand assets

Docky's logo files (icon, horizontal logo, wordmark, in each color variant), kept here as the source originals - not served by the app.

The app only ever uses copies: `frontend/public/favicon.png` (browser tab icon and the nav-bar logo) is a copy of `docky-icone-vert-sur-blanc.png`, the PWA's home-screen icons (`frontend/public/icons/`) are that same file resized onto a white background, and the login page's `frontend/public/logo.png` is `docky-horizontal-vert-sur-blanc.png` cropped to the logo and scaled down to 640px wide. The repository's README shows `docky-horizontal-vert-sur-blanc.png` straight from this folder. To use another one in the frontend, copy it into `frontend/public/` rather than referencing this folder.
