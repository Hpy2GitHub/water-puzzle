# Deploying to GitHub Pages

## One-time GitHub setup (do this once)

1. Go to **github.com/Hpy2GitHub/water-puzzle**
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **Deploy from a branch**
4. Set **Branch** to `gh-pages` and folder to `/ (root)`
5. Click **Save**

That's it for the GitHub side. The `gh-pages` branch is created automatically by the deploy script — you don't need to create it manually.

## Deploy

From the project directory:

```
npm run deploy
```

This runs `npm run build` first (via `predeploy`), then pushes the `dist/` folder to the `gh-pages` branch on GitHub. GitHub Pages serves that branch as a static site.

The site will be live at:
**https://Hpy2GitHub.github.io/water-puzzle**

It can take 1–2 minutes after the first deploy for GitHub to activate the Pages site.

## Subsequent deploys

Same command every time:

```
npm run deploy
```

No additional GitHub configuration needed after the first time.

## Local Apache (optional)

To test the production build locally before deploying:

```
npm run deploy-local
```

This builds and copies to `/mnt/d/Apache/html/sandbox/water-puzzle/`.
