# Office Viewer

一个本地优先的文件浏览工作台。当前实现采用 Tauri + React，`cweijan/vscode-office` 作为 Git submodule 放在 `vendor/vscode-office`，作为上游能力参考。主应用以强类型 viewer registry 作为运行时格式能力的单一入口。

## 当前能力

- 打开本地文件夹并浏览文件树。
- 文件树支持按文件名过滤、按扩展名筛选，以及按名称、类型、大小、修改时间排序。
- 打开单个真实文件。
- 多标签切换。
- 最近打开列表、后退、前进、上一文件和下一文件导航。
- 右侧展示文件大小、MIME、修改时间、按需计算的 SHA-256、路径和格式级结构信息，例如 sheet 数、幻灯片数、章节数、图层数、压缩包条目数。
- 复制当前文件路径、在系统文件管理器中显示当前文件、使用系统默认应用打开当前文件。
- Markdown、纯文本、JSON/YAML/XML/TOML 支持轻量编辑并保存到本地。
- 命令面板：`Ctrl+K` / `Cmd+K`。
- 本地内容搜索：递归搜索常见文本、Markdown、代码、CSV、JSON、YAML、XML、HTML、常见未加密 PDF、DOCX、XLSX、PPTX 等 Office Open XML 文档内容，以及 ZIP/JAR/VSIX/APK/EPUB/XMind/TAR/TGZ 内部文件名。
- 预览 DOCX、ODT、RTF、XLSX、XLS、CSV、PPTX、PDF、Markdown、HTML、SVG、图片、TIFF、ICNS、字体、ZIP/JAR/VSIX/APK、7Z、RAR、TAR/TAR.GZ/TGZ、EPUB、XMind、PSD、JSON/YAML/XML/TOML 和纯文本。
- DOCX 预览支持 HTML 正文渲染和 Heading1-Heading6 大纲提取；ODT 预览支持正文、标题和 OpenDocument 大纲级别提取；RTF 预览支持正文和基于样式级别的大纲提取。
- XLSX 和 ODS 支持多个 Sheet 的数据读取与标签切换；XLS BIFF8 支持首个工作表预览并保留 CFB fallback。
- PDF 预览同时保留原生页面显示和 pdf.js 文本提取，用于页数、文本摘要和后续搜索能力。
- PPTX 预览支持按幻灯片切换、正文文本提取和 notes speaker 备注提取。
- ZIP/JAR/VSIX/APK、TAR/TGZ/TAR.GZ 支持在压缩包 viewer 内直接预览小型文本、JSON、Markdown 和常见图片条目。
- 对旧版 `.xls` Compound File Binary / BIFF8 提供首个工作表的字符串和数值单元格预览，无法解析单元格时回退到容器结构预览。
- 对未知或不支持格式提供清晰 fallback：文件元信息、文本尝试预览、十六进制预览和系统默认应用打开。

## 上游子仓库

```bash
git submodule update --init --recursive
```

子仓库路径：

```text
vendor/vscode-office
```

主应用不会直接依赖 VS Code extension host。上游元数据参考与运行时 viewer 注册分别位于：

```text
office-viewer-app/src/viewers/generatedOfficeCapabilities.ts
office-viewer-app/src/viewers/registry.ts
```

同步上游声明的 custom editors：

```bash
cd office-viewer-app
npm run sync:office
```

## 开发

```bash
cd office-viewer-app
npm install
npm test
npm run build
npx tauri build --debug
```

开发模式：

```bash
cd office-viewer-app
npx tauri dev
```

## 样例验证

生成真实样例文件：

```bash
cd office-viewer-app
node scripts/create-samples.mjs
```

验证解析：

```bash
node scripts/verify-samples.mjs
```

验证覆盖 DOCX、ODT、RTF、XLSX、XLS BIFF、ODS、PPTX、PDF、Markdown、PNG、TIFF、ICNS、ZIP、7Z、TAR、TAR.GZ、EPUB、XMind、PSD 和未知二进制 fallback。RAR 读取能力通过 `node-unrar-js`/`unrar.wasm` 接入；仓库内不生成 RAR fixture，因为本地和 7-Zip wasm 不提供 RAR 创建能力。
