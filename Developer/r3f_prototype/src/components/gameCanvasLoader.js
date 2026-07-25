// Keep the game module loader in one place so the lobby can warm the exact same
// chunk that React.lazy later consumes.  This never creates a second Canvas.
export const loadGameCanvas = () => import('./GameCanvas.jsx')

export function preloadGameCanvasChunk() {
  return loadGameCanvas()
}
