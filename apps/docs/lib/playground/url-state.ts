import LZString from "lz-string"

interface PlaygroundState {
  code: string
  example?: string
}

export function encodePlaygroundState(state: PlaygroundState): string {
  const json = JSON.stringify(state)
  return LZString.compressToEncodedURIComponent(json)
}

export function decodePlaygroundState(hash: string): PlaygroundState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash)
    return json ? JSON.parse(json) : null
  } catch {
    return null
  }
}

export function getShareableUrl(code: string): string {
  const encoded = encodePlaygroundState({ code })
  return `${typeof window !== "undefined" ? window.location.origin : ""}/playground#code=${encoded}`
}

export function getCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null

  const hash = window.location.hash.slice(1)
  if (!hash.startsWith("code=")) return null

  const state = decodePlaygroundState(hash.slice(5))
  return state?.code ?? null
}
