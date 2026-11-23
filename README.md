# Whispering Garden

An interactive four-season animated botanical garden website built with HTML5 Canvas, CSS3, and vanilla JavaScript. Switch seamlessly between Spring, Summer, Autumn, and Winter as 12 procedurally rendered flower varieties bloom, sway in the breeze, and respond to your cursor or touch.

## Flower Varieties

- **Roses** in muted crimson red, pastel pink, creamy white, blush pastel, and warm autumn apricot
- **Tulips** in coral pink, sunny yellow, blush cream, and deep crimson
- **Sunflowers** with dual-ring golden ray petals and Fibonacci-textured seed discs
- **Lilies** in creamy white, soft pink, and golden apricot with stamens and side buds
- **Dandelions** with backlit seed heads whose seeds detach and float away in the breeze
- **Cherry Blossoms** on slender arching branches with notched sakura petals
- **Daisies** with slender white and blush-tipped petals around golden discs
- **Lavender** with tiered violet-periwinkle flower spikes
- **Hydrangeas** with rounded clusters of 4-petal florets in blue, lavender, pink, and winter frost
- **Baby's Breath** and small white blossom sprays with pearl buds
- **Chrysanthemums** (Autumn) in burnt orange, amber gold, and rust crimson
- **Snowdrops** (Winter) with nodding ivory-white bell petals on frosted stems

## Seasonal Environments

- **Spring** (`1`): Cherry blossoms, tulips, daisies, pastel roses, lavender, dandelions, and gently falling sakura petals.
- **Summer** (`2`): Sunflowers, lush roses, lilies, hydrangeas, lavender, bright warm sunlight, and floating pollen.
- **Autumn** (`3`): Warm orange, amber, and crimson chrysanthemums, autumn roses, golden lilies, tumbling leaves, and golden-hour lighting.
- **Winter** (`4`): Snow-covered hills, frosted white roses, lilies, snowdrops, icy hydrangeas, and gentle multi-layered snowfall.

## Interactions & Controls

- **Season Selector**: Smoothly cross-fades the sky, lighting, meadow hills, flower varieties, particles, and ambient musical harmony (`1`–`4`).
- **Pointer / Touch**: Move across the garden for 3-layer parallax and gentle stem sway; click or tap anywhere to scatter petals or snowflakes and puff dandelion seeds.
- **Breeze** (`Space`): Sends an organic wind wave sweeping across the garden.
- **Replay** (`R`): Replays the staggered bloom-from-bud animation for the active season.
- **Sound On / Off** (`M`): Toggles optional procedural Web Audio ambient music (starts only after user interaction).

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

```bash
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Deploying to GitHub Pages

1. Push the repository to GitHub on the `main` branch.
2. Open **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/ (root)`, and click **Save**.
4. Visit `https://<your-username>.github.io/<your-repo>/`.
