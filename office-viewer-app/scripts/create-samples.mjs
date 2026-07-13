import fs from 'node:fs/promises'
import path from 'node:path'
import { writePsdBuffer } from 'ag-psd'
import * as CFB from 'cfb'
import ExcelJS from 'exceljs'
import { gzipSync } from 'fflate'
import JSZip from 'jszip'
import SevenZip from '7z-wasm'
import UTIF from 'utif'

const root = path.resolve('samples')
await fs.mkdir(root, { recursive: true })

await fs.writeFile(path.join(root, 'notes.md'), '# Office Viewer\n\n- 本地优先\n- 真实文件预览\n- Office adapter\n')
await fs.writeFile(path.join(root, 'data.csv'), 'Name,Type,Status\nDOCX,Word,Ready\nXLSX,Spreadsheet,Ready\nPPTX,Presentation,Ready\n')
await fs.writeFile(path.join(root, 'config.json'), JSON.stringify({ product: 'Office Viewer', localFirst: true, formats: ['docx', 'xlsx', 'pptx', 'pdf', 'zip'] }, null, 2))

const workbook = new ExcelJS.Workbook()
const worksheet = workbook.addWorksheet('Formats')
worksheet.addRows([
  ['Format', 'Viewer', 'Status'],
  ['DOCX', 'Word / DOCX', 'Ready'],
  ['XLSX', 'Spreadsheet', 'Ready'],
  ['PPTX', 'PowerPoint text preview', 'Ready'],
])
worksheet.columns.forEach((column) => {
  column.width = 28
})
const metadataSheet = workbook.addWorksheet('Metadata')
metadataSheet.addRows([
  ['Key', 'Value'],
  ['Product', 'Office Viewer'],
  ['Mode', 'Local first'],
])
await workbook.xlsx.writeFile(path.join(root, 'formats.xlsx'))

writeBiff8Xls(path.join(root, 'legacy.xls'), [
  ['Format', 'Viewer', 'Status'],
  ['XLS', 'Legacy BIFF spreadsheet', 'Ready'],
  ['XLSX', 'Spreadsheet', 'Ready'],
])

const ods = new JSZip()
ods.file('mimetype', 'application/vnd.oasis.opendocument.spreadsheet')
ods.folder('META-INF')?.file('manifest.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.spreadsheet" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
</manifest:manifest>`))
ods.file('content.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.2">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Formats">
        <table:table-row>
          <table:table-cell><text:p>Format</text:p></table:table-cell>
          <table:table-cell><text:p>Viewer</text:p></table:table-cell>
          <table:table-cell><text:p>Status</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell><text:p>ODS</text:p></table:table-cell>
          <table:table-cell><text:p>Spreadsheet</text:p></table:table-cell>
          <table:table-cell><text:p>Ready</text:p></table:table-cell>
        </table:table-row>
      </table:table>
      <table:table table:name="Metadata">
        <table:table-row>
          <table:table-cell><text:p>Key</text:p></table:table-cell>
          <table:table-cell><text:p>Value</text:p></table:table-cell>
        </table:table-row>
        <table:table-row>
          <table:table-cell><text:p>Product</text:p></table:table-cell>
          <table:table-cell><text:p>Office Viewer</text:p></table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`))
await fs.writeFile(path.join(root, 'formats.ods'), await ods.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))

const odt = new JSZip()
odt.file('mimetype', 'application/vnd.oasis.opendocument.text')
odt.folder('META-INF')?.file('manifest.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
</manifest:manifest>`))
odt.file('content.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  office:version="1.2">
  <office:body>
    <office:text>
      <text:h text:outline-level="1">Office Viewer ODT sample</text:h>
      <text:h text:outline-level="2">Local OpenDocument preview</text:h>
      <text:p>This ODT file is generated locally and rendered by the desktop app.</text:p>
    </office:text>
  </office:body>
</office:document-content>`))
await fs.writeFile(path.join(root, 'article.odt'), await odt.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))

await fs.writeFile(path.join(root, 'memo.rtf'), String.raw`{\rtf1\ansi\deff0\s1 Office Viewer RTF sample\par\s2 Local rich text preview\par This RTF file is generated locally and rendered by the desktop app.\par}`)

const docx = new JSZip()
docx.file('[Content_Types].xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`))
docx.folder('_rels')?.file('.rels', xml(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`))
docx.folder('word')?.file('document.xml', xml(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Office Viewer DOCX sample</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Local document preview</w:t></w:r></w:p>
    <w:p><w:r><w:t>This file is generated locally and opened by the desktop app.</w:t></w:r></w:p>
  </w:body>
</w:document>`))
await fs.writeFile(path.join(root, 'report.docx'), await docx.generateAsync({ type: 'nodebuffer' }))

const pptx = new JSZip()
pptx.file('[Content_Types].xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
  <Override PartName="/ppt/notesSlides/notesSlide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>
</Types>`))
pptx.folder('_rels')?.file('.rels', xml(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`))
pptx.folder('ppt')?.file('presentation.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" />`))
pptx.folder('ppt/slides')?.file('slide1.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Office Viewer PPTX sample slide</a:t></a:r></a:p><a:p><a:r><a:t>Local PowerPoint preview</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`))
pptx.folder('ppt/slides')?.file('slide2.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Second slide</a:t></a:r></a:p><a:p><a:r><a:t>Structured slide extraction</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:sld>`))
pptx.folder('ppt/notesSlides')?.file('notesSlide1.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Speaker note for slide one</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`))
pptx.folder('ppt/notesSlides')?.file('notesSlide2.xml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Second slide note</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld>
</p:notes>`))
await fs.writeFile(path.join(root, 'slides.pptx'), await pptx.generateAsync({ type: 'nodebuffer' }))

await fs.writeFile(path.join(root, 'brief.pdf'), Buffer.from(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 80 >> stream
BT /F1 24 Tf 72 720 Td (Office Viewer PDF sample) Tj 0 -36 Td (Local file) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
trailer << /Root 1 0 R >>
%%EOF`))

await fs.writeFile(path.join(root, 'pixel.png'), Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGHfWwVMwAAAABJRU5ErkJggg==', 'base64'))
const iconPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGHfWwVMwAAAABJRU5ErkJggg==', 'base64')
await fs.writeFile(path.join(root, 'app.icns'), createIcns([{ type: 'ic07', data: iconPng }]))
const tiffRgba = new Uint8Array([
  255, 0, 0, 255,
  0, 128, 255, 255,
  0, 200, 0, 255,
  255, 255, 255, 255,
])
await fs.writeFile(path.join(root, 'scan.tiff'), Buffer.from(UTIF.encodeImage(tiffRgba, 2, 2)))
await fs.writeFile(path.join(root, 'unknown.bin'), Buffer.from([0, 1, 2, 3, 16, 32, 65, 66, 67, 127, 128, 255]))

const archive = new JSZip()
archive.file('readme.txt', 'Archive preview sample')
archive.file('nested/info.json', JSON.stringify({ ok: true }))
await fs.writeFile(path.join(root, 'bundle.zip'), await archive.generateAsync({ type: 'nodebuffer' }))

const sevenZip = await SevenZip()
sevenZip.FS.writeFile('seven-readme.txt', '7z preview sample')
sevenZip.FS.mkdir('seven-nested')
sevenZip.FS.writeFile('seven-nested/info.json', JSON.stringify({ sevenZip: true }))
sevenZip.callMain(['a', 'bundle.7z', 'seven-readme.txt', 'seven-nested/info.json'])
await fs.writeFile(path.join(root, 'bundle.7z'), Buffer.from(sevenZip.FS.readFile('bundle.7z')))

const tar = createTar([
  { name: 'readme.txt', content: Buffer.from('TAR preview sample') },
  { name: 'nested/info.json', content: Buffer.from(JSON.stringify({ tar: true })) },
])
await fs.writeFile(path.join(root, 'bundle.tar'), tar)
await fs.writeFile(path.join(root, 'bundle.tar.gz'), Buffer.from(gzipSync(tar)))

const epub = new JSZip()
epub.file('mimetype', 'application/epub+zip')
epub.folder('META-INF')?.file('container.xml', xml(`<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`))
epub.folder('OEBPS')?.file('content.opf', xml(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Office Viewer EPUB sample</dc:title>
    <dc:creator>Local Generator</dc:creator>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="chapter1"/></spine>
</package>`))
epub.folder('OEBPS')?.file('chapter1.xhtml', xml(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Office Viewer EPUB sample</h1><p>Local EPUB chapter.</p></body></html>`))
await fs.writeFile(path.join(root, 'book.epub'), await epub.generateAsync({ type: 'nodebuffer' }))

const xmind = new JSZip()
xmind.file('content.json', JSON.stringify([
  {
    title: 'Office Viewer Mind Map',
    rootTopic: {
      title: 'Office Viewer XMind sample',
      children: {
        attached: [
          { title: 'Local first' },
          { title: 'Viewer registry' },
          { title: 'Office adapter' },
        ],
      },
    },
  },
], null, 2))
xmind.file('metadata.json', JSON.stringify({ creator: 'Office Viewer' }))
await fs.writeFile(path.join(root, 'mind.xmind'), await xmind.generateAsync({ type: 'nodebuffer' }))

const psdBuffer = writePsdBuffer({
  width: 2,
  height: 2,
  children: [
    { name: 'Background' },
    { name: 'Title Layer' },
  ],
})
await fs.writeFile(path.join(root, 'design.psd'), Buffer.from(psdBuffer))

function xml(value) {
  return value.trim()
}

function writeBiff8Xls(filePath, rows) {
  const strings = [...new Set(rows.flat().map(String))]
  const stringIndex = new Map(strings.map((value, index) => [value, index]))
  const sheetRecords = [
    record(0x0809, words(0x0600, 0x0010, 0x0dbb, 0x07cc, 0x0041, 0x0000, 0x0006, 0x0000)),
    record(0x0200, bytesFromParts(u32(0), u32(rows.length), u16(0), u16(Math.max(...rows.map((row) => row.length))), u16(0))),
    ...rows.flatMap((row, rowIndex) => row.map((cell, columnIndex) => record(0x00fd, bytesFromParts(u16(rowIndex), u16(columnIndex), u16(0), u32(stringIndex.get(String(cell)) ?? 0))))),
    record(0x000a, Buffer.alloc(0)),
  ]
  const sheet = Buffer.concat(sheetRecords)
  const boundsheet = (offset) => record(0x0085, bytesFromParts(u32(offset), Buffer.from([0, 0]), biffName('Formats')))
  const globalsWithoutBoundSheet = [
    record(0x0809, words(0x0600, 0x0005, 0x0dbb, 0x07cc, 0x0041, 0x0000, 0x0006, 0x0000)),
    record(0x0042, u16(1200)),
    sstRecord(strings),
  ]
  const provisionalOffset = Buffer.concat([...globalsWithoutBoundSheet, boundsheet(0), record(0x000a, Buffer.alloc(0))]).length
  const workbook = Buffer.concat([...globalsWithoutBoundSheet, boundsheet(provisionalOffset), record(0x000a, Buffer.alloc(0)), sheet])
  const cfb = CFB.utils.cfb_new()
  CFB.utils.cfb_add(cfb, 'Workbook', workbook)
  CFB.writeFile(cfb, filePath)
}

function sstRecord(strings) {
  return record(0x00fc, bytesFromParts(u32(strings.length), u32(strings.length), ...strings.map(biffString)))
}

function biffName(value) {
  return Buffer.concat([Buffer.from([value.length, 1]), Buffer.from(value, 'utf16le')])
}

function biffString(value) {
  return Buffer.concat([u16(value.length), Buffer.from([1]), Buffer.from(value, 'utf16le')])
}

function record(id, payload) {
  return bytesFromParts(u16(id), u16(payload.length), payload)
}

function words(...values) {
  return bytesFromParts(...values.map(u16))
}

function bytesFromParts(...parts) {
  return Buffer.concat(parts)
}

function u16(value) {
  const buffer = Buffer.alloc(2)
  buffer.writeUInt16LE(value)
  return buffer
}

function u32(value) {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32LE(value)
  return buffer
}

function createTar(entries) {
  const chunks = []
  for (const entry of entries) {
    const content = Buffer.from(entry.content)
    const header = Buffer.alloc(512)
    writeTarField(header, 0, 100, entry.name)
    writeTarField(header, 100, 8, '0000644')
    writeTarField(header, 108, 8, '0000000')
    writeTarField(header, 116, 8, '0000000')
    writeTarField(header, 124, 12, content.length.toString(8).padStart(11, '0'))
    writeTarField(header, 136, 12, Math.floor(Date.now() / 1000).toString(8).padStart(11, '0'))
    header.fill(32, 148, 156)
    header[156] = '0'.charCodeAt(0)
    writeTarField(header, 257, 6, 'ustar')
    writeTarField(header, 263, 2, '00')
    const checksum = header.reduce((sum, byte) => sum + byte, 0)
    writeTarField(header, 148, 8, checksum.toString(8).padStart(6, '0'))
    header[154] = 0
    header[155] = 32

    chunks.push(header, content)
    const padding = (512 - (content.length % 512)) % 512
    if (padding) chunks.push(Buffer.alloc(padding))
  }
  chunks.push(Buffer.alloc(1024))
  return Buffer.concat(chunks)
}

function writeTarField(buffer, offset, length, value) {
  const bytes = Buffer.from(value)
  bytes.copy(buffer, offset, 0, Math.min(bytes.length, length))
}

function createIcns(entries) {
  const chunks = []
  let total = 8
  for (const entry of entries) {
    const data = Buffer.from(entry.data)
    const chunk = Buffer.alloc(8 + data.length)
    chunk.write(entry.type, 0, 4, 'ascii')
    chunk.writeUInt32BE(8 + data.length, 4)
    data.copy(chunk, 8)
    chunks.push(chunk)
    total += chunk.length
  }
  const header = Buffer.alloc(8)
  header.write('icns', 0, 4, 'ascii')
  header.writeUInt32BE(total, 4)
  return Buffer.concat([header, ...chunks], total)
}
