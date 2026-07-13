export const officeViewerCustomEditors = [
  {
    "viewType": "cweijan.officeViewer",
    "displayName": "Office Viewer",
    "selector": [
      {
        "filenamePattern": "*.xls"
      },
      {
        "filenamePattern": "*.xlsx"
      },
      {
        "filenamePattern": "*.xlsm"
      },
      {
        "filenamePattern": "*.csv"
      },
      {
        "filenamePattern": "*.tsv"
      },
      {
        "filenamePattern": "*.ods"
      },
      {
        "filenamePattern": "*.docx"
      },
      {
        "filenamePattern": "*.dotx"
      },
      {
        "filenamePattern": "*.pptx"
      },
      {
        "filenamePattern": "*.pptm"
      },
      {
        "filenamePattern": "*.pdf"
      },
      {
        "filenamePattern": "*.epub"
      },
      {
        "filenamePattern": "*.ttf"
      },
      {
        "filenamePattern": "*.woff"
      },
      {
        "filenamePattern": "*.woff2"
      },
      {
        "filenamePattern": "*.otf"
      },
      {
        "filenamePattern": "*.svg"
      },
      {
        "filenamePattern": "*.icns"
      },
      {
        "filenamePattern": "*.psd"
      },
      {
        "filenamePattern": "*.xmind"
      },
      {
        "filenamePattern": "*.tiff"
      },
      {
        "filenamePattern": "*.tif"
      },
      {
        "filenamePattern": "*.heif"
      },
      {
        "filenamePattern": "*.heic"
      }
    ]
  },
  {
    "viewType": "cweijan.archiveViewer",
    "displayName": "Archive Viewer",
    "selector": [
      {
        "filenamePattern": "*.jar"
      },
      {
        "filenamePattern": "*.zip"
      },
      {
        "filenamePattern": "*.7z"
      },
      {
        "filenamePattern": "*.rar"
      },
      {
        "filenamePattern": "*.tar.gz"
      },
      {
        "filenamePattern": "*.tgz"
      },
      {
        "filenamePattern": "*.tar"
      },
      {
        "filenamePattern": "*.apk"
      },
      {
        "filenamePattern": "*.vsix"
      },
      {
        "filenamePattern": "*.crx"
      }
    ]
  },
  {
    "viewType": "cweijan.imageViewer",
    "displayName": "Image Preview (Office Viewer)",
    "priority": "option",
    "selector": [
      {
        "filenamePattern": "*.jpg"
      },
      {
        "filenamePattern": "*.png"
      },
      {
        "filenamePattern": "*.gif"
      },
      {
        "filenamePattern": "*.apng"
      },
      {
        "filenamePattern": "*.apng"
      },
      {
        "filenamePattern": "*.bmp"
      },
      {
        "filenamePattern": "*.ico"
      },
      {
        "filenamePattern": "*.cur"
      },
      {
        "filenamePattern": "*.jpeg"
      },
      {
        "filenamePattern": "*.pjpeg"
      },
      {
        "filenamePattern": "*.pjp"
      },
      {
        "filenamePattern": "*.webp"
      }
    ]
  },
  {
    "viewType": "cweijan.markdownViewer",
    "displayName": "Markdown Editor",
    "selector": [
      {
        "filenamePattern": "file:/**/*.md"
      },
      {
        "filenamePattern": "file:/**/*.markdown"
      },
      {
        "filenamePattern": "vscode-vfs:/**/*.md"
      },
      {
        "filenamePattern": "vscode-vfs:/**/*.markdown"
      },
      {
        "filenamePattern": "vscode-remote:/**/*.md"
      },
      {
        "filenamePattern": "vscode-remote:/**/*.markdown"
      }
    ]
  },
  {
    "viewType": "cweijan.htmlViewer",
    "displayName": "Html Viewer",
    "priority": "option",
    "selector": [
      {
        "filenamePattern": "*.htm"
      },
      {
        "filenamePattern": "*.html"
      },
      {
        "filenamePattern": "*.xhtml"
      }
    ]
  },
  {
    "viewType": "cweijan.parquetViewer",
    "displayName": "Parquet Viewer",
    "priority": "option",
    "selector": [
      {
        "filenamePattern": "*.parquet"
      }
    ]
  },
  {
    "viewType": "cweijan.classViewer",
    "displayName": "Java Decompiler",
    "selector": [
      {
        "filenamePattern": "file:/**/*.class"
      }
    ]
  }
] as const

export const officeViewerSupportedExtensions = [
  "7z",
  "apk",
  "apng",
  "bmp",
  "class",
  "crx",
  "csv",
  "cur",
  "docx",
  "dotx",
  "epub",
  "gif",
  "heic",
  "heif",
  "htm",
  "html",
  "icns",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "markdown",
  "md",
  "ods",
  "otf",
  "parquet",
  "pdf",
  "pjp",
  "pjpeg",
  "png",
  "pptm",
  "pptx",
  "psd",
  "rar",
  "svg",
  "tar",
  "tar.gz",
  "tgz",
  "tif",
  "tiff",
  "tsv",
  "ttf",
  "vsix",
  "webp",
  "woff",
  "woff2",
  "xhtml",
  "xls",
  "xlsm",
  "xlsx",
  "xmind",
  "zip"
] as const
