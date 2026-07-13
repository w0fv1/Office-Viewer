import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('..')
const sourcePath = path.join(root, 'vendor', 'vscode-office', 'package.json')
const targetPath = path.resolve('src', 'viewers', 'generatedOfficeCapabilities.ts')

const manifest = JSON.parse(await fs.readFile(sourcePath, 'utf8'))
const customEditors = manifest.contributes?.customEditors ?? []
const extensions = Array.from(new Set(customEditors.flatMap((editor) => (
  editor.selector ?? []
).flatMap((selector) => extensionFromPattern(selector.filenamePattern)).filter(Boolean)))).sort()

const output = `export const officeViewerCustomEditors = ${JSON.stringify(customEditors, null, 2)} as const

export const officeViewerSupportedExtensions = ${JSON.stringify(extensions, null, 2)} as const
`

await fs.writeFile(targetPath, output)
console.log(`Synced ${customEditors.length} custom editors and ${extensions.length} extensions to ${targetPath}`)

function extensionFromPattern(pattern) {
  if (typeof pattern !== 'string') return ''
  const match = pattern.match(/\*\.([a-z0-9.+-]+)$/i) ?? pattern.match(/\/\*\*\/\*\.([a-z0-9.+-]+)$/i)
  return match?.[1]?.toLowerCase() ?? ''
}
