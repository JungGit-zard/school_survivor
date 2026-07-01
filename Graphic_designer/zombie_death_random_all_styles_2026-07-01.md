# Zombie Death Random All Styles

## Visual Note

- Zombie death visuals stay in the existing three.js toon-rendered 3D collapse system.
- Graphics Studio plays the 11 requested death styles in order for inspection.
- Gameplay uses the same 11 styles from a shuffled random bag.
- Browser check confirmed the full sequence from `forwardFall` to `shatter5`.
- Directional falls now exaggerate one clear axis so the silhouette reads differently.
- Left and right falls pivot around the foot tip instead of sliding sideways.
- `backstepFall` and `proneSink` use staged motion instead of another generic scatter.
- `backstepFall` adds fast leg/foot swing during the backward steps.
