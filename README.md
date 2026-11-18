# Pixel scatter gradient

A standalone web tool for building pixel scatter gradients and animations, with shared presets.

## What's in this repository

- `index.html`: the tool itself.
- `netlify/functions/presets.mjs`: a small backend that stores shared presets in Netlify Blobs at `/api/presets`.
- `netlify.toml`: tells Netlify where the site and the function live.
- `package.json`: lists the one package the function needs (`@netlify/blobs`).

## Deploying from GitHub

1. Create a new GitHub repository and upload these files to the **root** of the repository (not inside a subfolder), keeping the `netlify/functions` folder structure. If the files sit in a subfolder, Netlify can't find `index.html` and the site shows "Page not found".
2. In Netlify, open the existing site, go to **Site configuration → Build & deploy → Link repository**, and choose the repository.
3. Leave the build command empty. The publish directory comes from `netlify.toml`.
4. Deploy. Netlify installs the package and turns on Blobs storage automatically.

After that, every change pushed to the repository redeploys the site.

## Optional: admin key

Anyone can create presets. People can delete only the presets they made in their own browser.
To let someone delete any preset, add an environment variable in Netlify under
**Site configuration → Environment variables**:

- Key: `PRESET_ADMIN_KEY`
- Value: a long secret phrase

Then open **Presets → Admin** in the tool and enter the same phrase.
