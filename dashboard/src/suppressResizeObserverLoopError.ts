/**
 * Chromium emits this when a ResizeObserver callback mutates layout in the same frame
 * (common with React Flow / charts). It is not an application failure, but Vite's dev
 * client forwards `window` "error" and floods the terminal.
 */
function isBenignResizeObserverMessage(message: string): boolean {
  return (
    message.includes(
      "ResizeObserver loop completed with undelivered notifications",
    ) || message.includes("ResizeObserver loop limit exceeded")
  )
}

function swallowIfBenign(event: Event): void {
  if (
    event instanceof ErrorEvent &&
    isBenignResizeObserverMessage(String(event.message))
  ) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
  }
}

/** Capture + bubble: Vite’s dev client listens in bubble; stopPropagation ends dispatch before it. */
window.addEventListener("error", swallowIfBenign, true)
window.addEventListener("error", swallowIfBenign, false)
