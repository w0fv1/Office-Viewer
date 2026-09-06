import { writeFileSync } from 'node:fs'
import pptxgen from 'pptxgenjs'
import { parquetWriteBuffer } from 'hyparquet-writer'
import { writePsdBuffer } from 'ag-psd'

const pptx = new pptxgen()
pptx.layout = 'LAYOUT_WIDE'
pptx.author = 'Office Viewer'
for (const [index, color] of ['2164C4', '117A65'].entries()) {
  const slide = pptx.addSlide()
  slide.background = { color: 'F5F7FB' }
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.6, fill: { color }, line: { color } })
  slide.addText(`Office Viewer — Slide ${index + 1}`, { x: 0.7, y: 0.4, w: 12, h: 0.7, color: 'FFFFFF', fontSize: 32 })
  slide.addText(index ? 'Second slide: tables and charts' : 'Local preview: text, shapes and images', { x: 0.8, y: 2.2, w: 11.5, h: 0.8, fontSize: 26, color: '20304A' })
  slide.addTable([['Format', 'Preview'], ['PPTX', 'Canvas'], ['Parquet', 'Paged table']], { x: 1, y: 3.5, w: 5, h: 2, border: { color: 'CCD3E0', pt: 1 }, fontSize: 18 })
  slide.addChart(pptx.ChartType.bar, [{ name: 'Files', labels: ['A', 'B', 'C'], values: [3, 7, 5] }], { x: 7, y: 3.1, w: 5, h: 3, showLegend: false })
  slide.addNotes(`Notes for slide ${index + 1}`)
}
await pptx.writeFile({ fileName: 'samples/visual-slides.pptx' })
const columns = [{ name: 'name', data: ['甲', '乙', '丙'], type: 'STRING' }, { name: 'value', data: [9007199254740993n, 2n, 3n], type: 'INT64' }]
writeFileSync('samples/data.parquet', new Uint8Array(parquetWriteBuffer({ columnData: columns })))
writeFileSync('samples/paged.parquet', new Uint8Array(parquetWriteBuffer({ columnData: [{ name: 'row', data: Array.from({ length: 205 }, (_, i) => i + 1), type: 'INT32' }] })))
const width = 640, height = 400
const data = new Uint8ClampedArray(width * height * 4)
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const offset = (y * width + x) * 4
  data.set(x < 300 ? [33, 100, 196, 255] : [17, 122, 101, 255], offset)
}
writeFileSync('samples/composite.psd', writePsdBuffer({ width, height, imageData: { width, height, data } }))
