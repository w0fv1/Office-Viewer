import { decompile } from '@run-slicer/vf'

export async function decompileClass(bytes: Uint8Array): Promise<string> {
  if (bytes.length < 10 || new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0) !== 0xcafebabe) throw new Error('无效的 Java class 文件')
  const input = 'preview/Input'
  const result = await decompile(input, {
    source: async (name) => name === input ? bytes : null,
    options: { banner: '', 'log-level': 'ERROR' },
    logger: { writeMessage: () => {} },
  })
  const text = Object.values(result).join('\n\n')
  if (!text.trim()) throw new Error('无法反编译此 class 文件')
  return text
}
