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
- XLSX 和 ODS 支持多个 Sheet 的数据读取与标签切换；XLS BIFF8 支持首个工作表预览，无法解析时显示不支持。
- PDF 预览同时保留原生页面显示和 pdf.js 文本提取，用于页数、文本摘要和后续搜索能力。
- PPTX 预览支持按幻灯片切换、正文文本提取和 notes speaker 备注提取。
- ZIP/JAR/VSIX/APK、TAR/TGZ/TAR.GZ 支持在压缩包 viewer 内直接预览小型文本、JSON、Markdown 和常见图片条目。
- 对旧版 `.xls` Compound File Binary / BIFF8 提供首个工作表的字符串和数值单元格预览，无法解析单元格时显示不支持。
- 未知扩展名按内容识别文本：UTF-8（含 BOM）和带 BOM 的 UTF-16 可以直接阅读；二进制、无效编码显示「不支持预览此文件」。不再提供十六进制或内部容器结构回退。

## 扩展预览格式

- 办公文档：DOCM / DOTM，XLTX / XLTM，PPSX / PPSM / POTX / POTM，OTT / OTS / ODP / OTP，FODT / FODS / FODP。模板和宏文档复用既有内容解析器，不执行宏；演示文稿显示逐页文本与备注，不保证原版布局。
- 音频：MP3 / WAV / OGG / OGA / OPUS / FLAC / M4A / AAC。
- 视频：MP4 / M4V / WEBM / OGV / MOV。音视频使用浏览器原生控件，实际可播放性取决于容器内的编码及运行环境；加载或解码失败显示不支持，不自动播放。
- 邮件：EML，使用 postal-mime 解码 MIME、主题和正文，展示发件人、收件人及附件文件名。附件不在此页面打开。
- 电子书：EPUB 按 spine 顺序阅读章节正文与内嵌图片；FB2 阅读章节文本；CBZ 按自然页码阅读图片。
- 图片：新增 AVIF / APNG / SVGZ。

邮件和电子书正文经过 HTML 清理，外部资源不联网加载。加密电子书、旧 DOC / PPT、Outlook MSG、MOBI / AZW 和 HEIC 尚无专用解析器。未知内容可按文本识别，否则显示不支持。

OpenDocument 的文字、表格、演示文稿统一通过命名空间感知的 XML 解析入口处理；ZIP 和 flat XML 共用正文解析，格式扩展仍以 viewer registry 为唯一入口。

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
