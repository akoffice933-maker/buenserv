# BuenServ — Motion specification

## Production stack

- **Anime.js** — primary interaction and scroll motion for the MVP landing page.
- **Lottie-web** — compact branded illustration for empty/error states.
- Both integrations respect `prefers-reduced-motion: reduce`.

For a production build, pin dependencies rather than relying on CDN URLs:

```bash
npm install animejs lottie-web
```

## Motion rules

| Interaction | Timing | Easing | Notes |
|---|---:|---|---|
| Section/card reveal | 260ms | `easeOutCubic` | `opacity: 0 → 1`, `Y: 18px → 0` |
| Language change | 110ms out + 170ms in | `easeOutQuad` | No layout reflow animation |
| Button hover | 180ms | ease-out | CSS: lift −2px, shadow |
| Button press | 150ms | ease-out | CSS: scale(.98) |
| Provider/category hover | 200ms | ease-out | CSS: lift −4px |
| Lottie error illustration | looping 3s | native Lottie | Only for a non-critical, decorative state |

## Accessibility and performance

1. All decorative animation is suppressed under `prefers-reduced-motion`.
2. Do not animate opacity/transform together with layout properties (`width`, `top`, etc.).
3. Lottie should be loaded only on routes that display it; it is not loaded by the landing page.
4. Keep animation durations under 300ms, except intentionally ambient Lottie loops.
5. No particles, continuous background motion, crypto/neon visuals, or scroll-jacking.

## Files

- `index.html`: Anime.js-powered landing page motion.
- `404.html`: Lottie-powered error state.
- `assets/not-found-lottie.json`: local branded Lottie asset.
