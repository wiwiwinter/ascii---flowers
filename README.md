# Whispering Garden

An interactive animated botanical garden website built with HTML5 Canvas, CSS3, and vanilla JavaScript. Roses, lilies, dandelions, and delicate white blossoms grow, unfurl, and sway in warm morning light, accompanied by drifting dandelion seeds, falling petals, subtle parallax, and optional procedural ambient music.

## Features

- **Botanical Variety & Depth**: Multi-layered garden composition featuring red, pink, and pastel roses; white and pink lilies with stamens and side buds; dandelions with detachable floating seeds; and airy sprays of white blossoms across three parallax depth planes.
- **Organic Motion**: Staggered bloom-from-bud growth sequence, multi-frequency wind waves, drifting petals with 3D-like flutter, rising golden pollen motes, and soft morning sunbeams.
- **Interactive Garden**:
  - Move your cursor or finger to create subtle parallax and brush through nearby blooms.
  - Tap or click anywhere to scatter petals, rustle nearby stems, and puff seeds from dandelions.
  - Trigger a sweeping wind gust with **Breeze** (`Space`), restart the growth sequence with **Replay** (`R`), or toggle gentle procedural ambient music with **Sound On / Off** (`M`).
- **Zero Build Step & GitHub Pages Ready**: Pure HTML, CSS, and JavaScript using relative paths and Web Audio synthesis, with no backend or broken external asset dependencies.

## Project Structure

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── audio.js
│   ├── flowers.js
│   └── script.js
└── README.md
```

## Running Locally

Because the site uses standard HTML, CSS, and JavaScript with relative paths, you can preview it with any local static server:

```bash
# Option 1: Python 3
python -m http.server 8000

# Option 2: Node.js (npx)
npx serve .
```

Then open `http://localhost:8000` (or the URL printed by `serve`) in your browser.

## Deploying to GitHub Pages

1. Create a new repository on GitHub and push the project files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial Whispering Garden website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. Open your repository on GitHub and go to **Settings > Pages**.
3. Under **Build and deployment**, select **Source: Deploy from a branch**.
4. Choose the `main` branch and `/ (root)` folder, then click **Save**.
5. Wait a minute for GitHub Pages to publish, then visit `https://<your-username>.github.io/<your-repo>/`.
