import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { decompileClass } from './javaDecompiler'

it('decompiles a real class into method source without executing it', async () => {
  const text = await decompileClass(new Uint8Array(readFileSync('samples/PreviewSample.class')))
  expect(text).toContain('public class PreviewSample')
  expect(text).toContain('return value * value;')
  expect(text).toContain('"Hello, " + name')
})

it('rejects non-class data before decompilation', async () => {
  await expect(decompileClass(new Uint8Array(12))).rejects.toThrow('无效的 Java class')
})
