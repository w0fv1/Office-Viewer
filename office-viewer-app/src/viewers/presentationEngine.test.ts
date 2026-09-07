import { expect, it, vi } from 'vitest'

vi.mock('pptxviewjs', () => {
  window.FileReader = class {} as typeof FileReader
  return { PPTXViewer: class {} }
})

it('keeps the native FileReader after loading the presentation dependency', async () => {
  const original = window.FileReader
  const { presentationEngine } = await import('./presentationEngine')
  await presentationEngine()
  expect(window.FileReader).toBe(original)
  expect(presentationEngine()).toBe(presentationEngine())
})
