/**
 * fetch() with a hard deadline. A stalled connection must fail the request
 * instead of hanging the pipeline (there is no OS-level fetch timeout on
 * Hermes). Uses a manual AbortController rather than AbortSignal.timeout()
 * for Hermes compatibility.
 */
export const FETCH_TIMEOUT_MS = 15_000

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
