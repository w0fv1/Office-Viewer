export type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; stats?: PreviewStat[]; content: PreviewContent }
  | { status: 'error'; message: string }

export type PreviewContent =
  | { kind: 'word'; html: string; outline: WordOutlineItem[] }
  | { kind: 'html'; html: string }
  | { kind: 'text'; text: string }
  | { kind: 'sheet'; tables: SheetTable[] }
  | { kind: 'presentation'; slides: PresentationSlide[] }
  | { kind: 'archive'; items: ArchiveItem[] }
  | { kind: 'pdf'; objectUrl: string; summary: PdfSummary }
  | { kind: 'media'; media: 'image' | 'tiff' | 'icns'; objectUrl: string }
  | { kind: 'font'; objectUrl: string }
  | { kind: 'epub'; summary: EpubSummary }
  | { kind: 'xmind'; summary: XMindSummary }
  | { kind: 'psd'; summary: PsdSummary }
  | { kind: 'hex'; summary: HexSummary }
  | { kind: 'cfb'; summary: CfbSummary }

export type PreviewStat = {
  label: string
  value: string
}

export type SheetTable = {
  name: string
  rows: string[][]
}

export type PresentationSummary = {
  slides: PresentationSlide[]
}

export type PresentationSlide = {
  index: number
  title: string
  text: string
  notes: string
}

export type WordSummary = {
  outline: WordOutlineItem[]
}

export type WordOutlineItem = {
  level: number
  text: string
}

export type ArchiveItem = {
  name: string
  directory: boolean
  size?: number
  preview?: ArchivePreview
}

export type ArchivePreview =
  | { kind: 'text'; text: string; mime: string }
  | { kind: 'image'; objectUrl: string; mime: string }
  | { kind: 'unsupported'; message: string }

export type PdfSummary = {
  pages: number
  text: string
}

export type EpubSummary = {
  title: string
  creator: string
  packagePath: string
  chapters: string[]
}

export type XMindSummary = {
  title: string
  topics: string[]
}

export type PsdSummary = {
  width: number
  height: number
  layerCount: number
  layers: string[]
}

export type HexSummary = {
  intro: string
  textPreview?: string
  rows: Array<{ offset: string; hex: string; ascii: string }>
}

export type CfbSummary = {
  entries: Array<{ name: string; size: number }>
}
