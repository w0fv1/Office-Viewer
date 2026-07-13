import fs from 'node:fs/promises'
import path from 'node:path'
import { readPsd } from 'ag-psd'
import * as CFB from 'cfb'
import ExcelJS from 'exceljs'
import { gunzipSync } from 'fflate'
import JSZip from 'jszip'
import mammoth from 'mammoth'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import SevenZip from '7z-wasm'
import UTIF from 'utif'

const root = path.resolve('samples')
const results = []

const docx = await mammoth.extractRawText({ path: path.join(root, 'report.docx') })
const docxZip = await JSZip.loadAsync(await fs.readFile(path.join(root, 'report.docx')))
const docxXml = await docxZip.file('word/document.xml')?.async('text')
results.push(['DOCX', docx.value.includes('Office Viewer DOCX sample') && Boolean(docxXml?.includes('Heading1') && docxXml.includes('Heading2'))])

const workbook = new ExcelJS.Workbook()
await workbook.xlsx.load(await fs.readFile(path.join(root, 'formats.xlsx')))
results.push(['XLSX', Boolean(workbook.getWorksheet('Formats')) && Boolean(workbook.getWorksheet('Metadata'))])

const xls = CFB.read(await fs.readFile(path.join(root, 'legacy.xls')), { type: 'buffer' })
const workbookStream = xls.FileIndex.find((entry) => /(^|\/)Workbook$/.test(entry.name))?.content
const xlsStrings = workbookStream ? parseBiffSharedStrings(workbookStream) : []
results.push(['XLS BIFF', xlsStrings.includes('Legacy BIFF spreadsheet') && xlsStrings.includes('Ready')])

const ods = await JSZip.loadAsync(await fs.readFile(path.join(root, 'formats.ods')))
const odsContent = await ods.file('content.xml')?.async('text')
results.push(['ODS', Boolean(odsContent?.includes('ODS') && odsContent.includes('Spreadsheet') && odsContent.includes('Metadata'))])

const odt = await JSZip.loadAsync(await fs.readFile(path.join(root, 'article.odt')))
const odtContent = await odt.file('content.xml')?.async('text')
results.push(['ODT', Boolean(odtContent?.includes('Office Viewer ODT sample') && odtContent.includes('text:outline-level="2"'))])

const rtf = await fs.readFile(path.join(root, 'memo.rtf'), 'utf8')
results.push(['RTF', rtf.includes('Office Viewer RTF sample') && rtf.includes('\\s2 Local rich text preview')])

const pptx = await JSZip.loadAsync(await fs.readFile(path.join(root, 'slides.pptx')))
const slideXml = await pptx.file('ppt/slides/slide1.xml')?.async('text')
const slide2Xml = await pptx.file('ppt/slides/slide2.xml')?.async('text')
const notesXml = await pptx.file('ppt/notesSlides/notesSlide1.xml')?.async('text')
results.push(['PPTX', Boolean(slideXml?.includes('Office Viewer PPTX sample slide') && slide2Xml?.includes('Second slide') && notesXml?.includes('Speaker note'))])

const pdf = await pdfjs.getDocument({ data: new Uint8Array(await fs.readFile(path.join(root, 'brief.pdf'))), disableWorker: true }).promise
const pdfText = await (await pdf.getPage(1)).getTextContent()
results.push(['PDF', pdf.numPages === 1 && pdfText.items.some((item) => 'str' in item && item.str.includes('Office Viewer PDF sample'))])

const markdown = await fs.readFile(path.join(root, 'notes.md'), 'utf8')
results.push(['Markdown', markdown.includes('本地优先')])

const png = await fs.readFile(path.join(root, 'pixel.png'))
results.push(['PNG', png.subarray(1, 4).toString('utf8') === 'PNG'])

const icns = await fs.readFile(path.join(root, 'app.icns'))
results.push(['ICNS', icns.subarray(0, 4).toString('ascii') === 'icns' && icns[16] === 0x89 && icns.subarray(17, 20).toString('utf8') === 'PNG'])

const tiff = await fs.readFile(path.join(root, 'scan.tiff'))
const tiffPages = UTIF.decode(tiff.buffer.slice(tiff.byteOffset, tiff.byteOffset + tiff.byteLength))
if (tiffPages[0]) UTIF.decodeImage(tiff.buffer.slice(tiff.byteOffset, tiff.byteOffset + tiff.byteLength), tiffPages[0])
results.push(['TIFF', tiffPages.length === 1 && tiffPages[0].width === 2 && tiffPages[0].height === 2])

const unknown = await fs.readFile(path.join(root, 'unknown.bin'))
results.push(['Fallback binary', unknown.length === 12 && unknown[10] === 128])

const zip = await JSZip.loadAsync(await fs.readFile(path.join(root, 'bundle.zip')))
results.push(['ZIP', Boolean(zip.file('nested/info.json'))])

const sevenZipOutput = []
const sevenZip = await SevenZip({ print: (value) => sevenZipOutput.push(value) })
sevenZip.FS.writeFile('bundle.7z', await fs.readFile(path.join(root, 'bundle.7z')))
sevenZip.callMain(['l', 'bundle.7z'])
results.push(['7Z', sevenZipOutput.join('\n').includes('seven-nested/info.json')])

const tar = await fs.readFile(path.join(root, 'bundle.tar'))
results.push(['TAR', parseTarNames(tar).includes('nested/info.json')])

const tgz = gunzipSync(await fs.readFile(path.join(root, 'bundle.tar.gz')))
results.push(['TAR.GZ', parseTarNames(tgz).includes('readme.txt')])

const epub = await JSZip.loadAsync(await fs.readFile(path.join(root, 'book.epub')))
const opf = await epub.file('OEBPS/content.opf')?.async('text')
results.push(['EPUB', Boolean(opf?.includes('Office Viewer EPUB sample'))])

const xmind = await JSZip.loadAsync(await fs.readFile(path.join(root, 'mind.xmind')))
const content = await xmind.file('content.json')?.async('text')
results.push(['XMind', Boolean(content?.includes('Office Viewer XMind sample'))])

const psd = readPsd(await fs.readFile(path.join(root, 'design.psd')), { skipCompositeImageData: true, skipLayerImageData: true, skipThumbnail: true })
results.push(['PSD', psd.width === 2 && psd.height === 2 && psd.children?.some((layer) => layer.name === 'Title Layer')])

let failed = false
for (const [format, ok] of results) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${format}`)
  failed ||= !ok
}

if (failed) {
  process.exitCode = 1
}

function parseTarNames(bytes) {
  const names = []
  let offset = 0
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const name = readTarString(header, 0, 100)
    const size = parseInt(readTarString(header, 124, 12).trim() || '0', 8)
    if (name) names.push(name)
    offset += 512 + Math.ceil(size / 512) * 512
  }
  return names
}

function readTarString(bytes, offset, length) {
  const slice = bytes.subarray(offset, offset + length)
  const end = slice.indexOf(0)
  return Buffer.from(end >= 0 ? slice.subarray(0, end) : slice).toString('utf8').trim()
}

function parseBiffSharedStrings(bytes) {
  const strings = []
  let offset = 0
  while (offset + 4 <= bytes.length) {
    const id = bytes.readUInt16LE(offset)
    const length = bytes.readUInt16LE(offset + 2)
    const start = offset + 4
    const end = start + length
    if (end > bytes.length) break
    if (id === 0x00fc) {
      let cursor = start + 8
      while (cursor + 3 <= end) {
        const stringLength = bytes.readUInt16LE(cursor)
        const flags = bytes[cursor + 2]
        cursor += 3
        const byteLength = stringLength * (flags & 1 ? 2 : 1)
        if (cursor + byteLength > end) break
        strings.push(Buffer.from(bytes.subarray(cursor, cursor + byteLength)).toString(flags & 1 ? 'utf16le' : 'latin1'))
        cursor += byteLength
      }
    }
    offset = end
  }
  return strings
}
