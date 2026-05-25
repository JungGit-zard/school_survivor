export function getChargeWarningArrowConfig({ width, length }) {
  const safeLength = Math.max(0.1, length ?? 4.5)
  const safeWidth = width ?? 0.35
  const halfWidth = safeWidth / 2
  const halfLength = safeLength / 2
  const headLength = Math.min(safeLength * 0.34, 1.2)
  const headBaseY = halfLength - headLength
  const shaftHalfWidth = halfWidth * 0.45

  return {
    width: safeWidth,
    length: safeLength,
    points: [
      [-shaftHalfWidth, -halfLength],
      [ shaftHalfWidth, -halfLength],
      [ shaftHalfWidth,  headBaseY],
      [ halfWidth,       headBaseY],
      [ 0,               halfLength],
      [-halfWidth,       headBaseY],
      [-shaftHalfWidth,  headBaseY],
    ],
  }
}
