# Office Viewer App

Tauri + React desktop shell for the local Office Viewer product.

## Commands

```bash
npm install
npm test
npm run lint
npm run build
npx tauri build --debug
```

## Samples

```bash
node scripts/create-samples.mjs
node scripts/verify-samples.mjs
```

The sample suite covers DOCX, XLSX, XLS CFB, ODS, PPTX, PDF, Markdown, PNG, TIFF, ICNS, ZIP, 7Z, TAR, TAR.GZ, EPUB, XMind, PSD and unknown binary fallback.

Visual and binary preview samples are generated with `node scripts/create-visual-samples.mjs`; the checked-in Java sample can be regenerated with `javac -g -d samples samples/PreviewSample.java`. See the repository README for HEIC/HEIF, CUR, CRX, Parquet, Java decompilation, and the visual PPTX/PSD/XMind viewers and their boundaries. Java is needed only to regenerate the test fixture, not to preview class files.
