import { decompileClass } from './javaDecompiler'

self.onmessage = async (event: MessageEvent<Uint8Array>) => {
  try {
    self.postMessage({ text: await decompileClass(event.data) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : String(error) })
  }
}
