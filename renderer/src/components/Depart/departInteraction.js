export function acceptDepartOnce(acceptedRef, onConfirm) {
  if (acceptedRef.current) return false

  acceptedRef.current = true
  onConfirm()
  return true
}

export function resolveDepartInvoker(eventOrElement, preferredElement, fallbackElement) {
  const candidate = eventOrElement?.currentTarget || eventOrElement
  if (candidate && typeof candidate.focus === "function") return candidate
  if (preferredElement && typeof preferredElement.focus === "function") return preferredElement
  if (fallbackElement && typeof fallbackElement.focus === "function") return fallbackElement
  return null
}

export function restoreDepartFocus(element, schedule = requestAnimationFrame) {
  schedule(() => element?.focus())
}
