export const scaleRelative = (
  size: number = 0,
  relativeSize: number = 1,
  targetSize: number = 100,
) => (size || 0) * (targetSize / (relativeSize || 1));
