export function nextAttractSceneIndex(currentIndex, sceneCount) {
  if (!Number.isInteger(sceneCount) || sceneCount <= 0) return 0
  return (currentIndex + 1) % sceneCount
}
