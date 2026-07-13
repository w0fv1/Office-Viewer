export function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer
}

export function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

export function bytesToObjectUrl(bytes: Uint8Array, mime: string): string {
  return URL.createObjectURL(new Blob([bytesToArrayBuffer(bytes)], { type: mime }))
}
