use std::path::Path;

pub(crate) fn extension(path: &Path) -> Option<String> {
    let name = path.file_name()?.to_str()?.to_ascii_lowercase();
    for compound in ["tar.gz", "tar.bz2", "tar.xz"] {
        if name.ends_with(&format!(".{compound}")) {
            return Some(compound.to_string());
        }
    }
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
}

pub(crate) fn guess_mime(path: &Path) -> String {
    match extension(path).as_deref() {
        Some("pdf") => "application/pdf",
        Some("docx") | Some("dotx") => {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
        Some("odt") => "application/vnd.oasis.opendocument.text",
        Some("rtf") => "application/rtf",
        Some("xlsx") | Some("xlsm") => {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
        Some("xls") => "application/vnd.ms-excel",
        Some("ods") => "application/vnd.oasis.opendocument.spreadsheet",
        Some("pptx") | Some("pptm") => {
            "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        }
        Some("md") | Some("markdown") => "text/markdown",
        Some("csv") => "text/csv",
        Some("tsv") => "text/tab-separated-values",
        Some("json") => "application/json",
        Some("yaml") | Some("yml") => "application/yaml",
        Some("xml") => "application/xml",
        Some("svg") => "image/svg+xml",
        Some("html") | Some("htm") | Some("xhtml") => "text/html",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("ico") => "image/x-icon",
        Some("tif") | Some("tiff") => "image/tiff",
        Some("icns") => "image/icns",
        Some("zip") | Some("jar") | Some("vsix") | Some("apk") => "application/zip",
        Some("7z") => "application/x-7z-compressed",
        Some("rar") => "application/vnd.rar",
        Some("tar") => "application/x-tar",
        Some("tgz") | Some("tar.gz") => "application/gzip",
        Some("epub") => "application/epub+zip",
        Some("xmind") => "application/x-xmind",
        Some("psd") => "image/vnd.adobe.photoshop",
        Some("ttf") => "font/ttf",
        Some("otf") => "font/otf",
        Some("woff") => "font/woff",
        Some("woff2") => "font/woff2",
        Some("txt") | Some("log") => "text/plain",
        _ => "application/octet-stream",
    }
    .to_string()
}

pub(crate) fn is_text_search_candidate(path: &Path, size: u64) -> bool {
    size <= 2 * 1024 * 1024
        && matches!(
            extension(path).as_deref(),
            Some("txt")
                | Some("log")
                | Some("md")
                | Some("markdown")
                | Some("rtf")
                | Some("json")
                | Some("yaml")
                | Some("yml")
                | Some("xml")
                | Some("toml")
                | Some("csv")
                | Some("tsv")
                | Some("html")
                | Some("htm")
                | Some("xhtml")
                | Some("css")
                | Some("js")
                | Some("ts")
                | Some("tsx")
                | Some("jsx")
                | Some("rs")
                | Some("py")
                | Some("go")
                | Some("java")
                | Some("c")
                | Some("cpp")
                | Some("h")
                | Some("hpp")
                | Some("cs")
                | Some("sql")
                | Some("sh")
                | Some("ps1")
        )
}

pub(crate) fn is_office_search_candidate(path: &Path, size: u64) -> bool {
    size <= 20 * 1024 * 1024
        && matches!(
            extension(path).as_deref(),
            Some("docx") | Some("dotx") | Some("xlsx") | Some("xlsm") | Some("pptx") | Some("pptm")
        )
}

pub(crate) fn is_pdf_search_candidate(path: &Path, size: u64) -> bool {
    size <= 20 * 1024 * 1024 && matches!(extension(path).as_deref(), Some("pdf"))
}

pub(crate) fn is_archive_search_candidate(path: &Path, size: u64) -> bool {
    size <= 100 * 1024 * 1024
        && matches!(
            extension(path).as_deref(),
            Some("zip")
                | Some("jar")
                | Some("vsix")
                | Some("apk")
                | Some("epub")
                | Some("xmind")
                | Some("tar")
                | Some("tgz")
                | Some("tar.gz")
        )
}

pub(crate) fn office_xml_candidates(extension: &str) -> &'static [&'static str] {
    match extension {
        "docx" | "dotx" => &["word/document.xml", "word/header", "word/footer"],
        "xlsx" | "xlsm" => &["xl/sharedStrings.xml", "xl/worksheets/sheet"],
        "pptx" | "pptm" => &["ppt/slides/slide", "ppt/notesSlides/notesSlide"],
        _ => &[],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn distinguishes_xml_and_svg_mime_types() {
        assert_eq!(guess_mime(Path::new("data.xml")), "application/xml");
        assert_eq!(guess_mime(Path::new("icon.svg")), "image/svg+xml");
    }
}
