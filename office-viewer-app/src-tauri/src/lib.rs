use flate2::read::GzDecoder;
use serde::Serialize;
use std::{
    fs,
    io::{BufRead, BufReader, Read},
    path::{Path, PathBuf},
};

mod filesystem;
mod formats;
mod system;

use filesystem::{
    file_name, hash_file, list_directory, read_file_bytes, read_file_metadata, save_text_file,
};
use filesystem::save_preview_image;
use formats::{
    extension, is_archive_search_candidate, is_office_search_candidate, is_pdf_search_candidate,
    is_text_search_candidate, office_xml_candidates,
};
use system::{open_in_system, reveal_in_file_manager};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchResult {
    path: String,
    name: String,
    extension: Option<String>,
    line_number: Option<usize>,
    preview: String,
    match_kind: SearchMatchKind,
}

#[derive(Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum SearchMatchKind {
    Name,
    Content,
    OfficeContent,
    PdfContent,
    ArchiveEntry,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchIssue {
    path: String,
    message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchReport {
    results: Vec<SearchResult>,
    scanned_files: usize,
    skipped_files: usize,
    issues: Vec<SearchIssue>,
}

fn searchable_office_text(path: &Path) -> Result<String, String> {
    let ext = extension(path).unwrap_or_default();
    let candidates = office_xml_candidates(&ext);
    if candidates.is_empty() {
        return Ok(String::new());
    }

    let file = fs::File::open(path).map_err(|err| err.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|err| err.to_string())?;
    let mut text = String::new();

    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(|err| err.to_string())?;
        let name = file.name().to_string();
        if !name.ends_with(".xml")
            || !candidates
                .iter()
                .any(|candidate| name.starts_with(candidate))
        {
            continue;
        }

        let mut xml = String::new();
        if file.read_to_string(&mut xml).is_ok() {
            text.push_str(&xml_text_content(&xml));
            text.push('\n');
        }
    }

    Ok(text)
}

fn searchable_archive_entries(path: &Path) -> Result<Vec<String>, String> {
    match extension(path).as_deref() {
        Some("zip") | Some("jar") | Some("vsix") | Some("apk") | Some("epub") | Some("xmind") => {
            let file = fs::File::open(path).map_err(|err| err.to_string())?;
            let mut archive = zip::ZipArchive::new(file).map_err(|err| err.to_string())?;
            let mut entries = Vec::new();
            for index in 0..archive.len() {
                let file = archive.by_index(index).map_err(|err| err.to_string())?;
                entries.push(file.name().to_string());
            }
            Ok(entries)
        }
        Some("tar") => parse_tar_entries(&fs::read(path).map_err(|err| err.to_string())?),
        Some("tgz") | Some("tar.gz") => {
            let file = fs::File::open(path).map_err(|err| err.to_string())?;
            let mut decoder = GzDecoder::new(file);
            let mut bytes = Vec::new();
            decoder
                .read_to_end(&mut bytes)
                .map_err(|err| err.to_string())?;
            parse_tar_entries(&bytes)
        }
        _ => Ok(Vec::new()),
    }
}

fn parse_tar_entries(bytes: &[u8]) -> Result<Vec<String>, String> {
    let mut entries = Vec::new();
    let mut offset = 0usize;

    while offset + 512 <= bytes.len() {
        let header = &bytes[offset..offset + 512];
        if header.iter().all(|byte| *byte == 0) {
            break;
        }

        let name = tar_string(&header[0..100]);
        let prefix = tar_string(&header[345..500]);
        let path = match (prefix.is_empty(), name.is_empty()) {
            (_, true) => String::new(),
            (true, false) => name,
            (false, false) => format!("{}/{}", prefix, name),
        };

        if !path.is_empty() {
            entries.push(path);
        }

        let size = tar_octal(&header[124..136])?;
        let data_blocks = (size as usize).div_ceil(512);
        offset += 512 + data_blocks * 512;
    }

    Ok(entries)
}

fn tar_string(bytes: &[u8]) -> String {
    let end = bytes
        .iter()
        .position(|byte| *byte == 0)
        .unwrap_or(bytes.len());
    String::from_utf8_lossy(&bytes[..end]).trim().to_string()
}

fn tar_octal(bytes: &[u8]) -> Result<u64, String> {
    let value = tar_string(bytes);
    if value.is_empty() {
        return Ok(0);
    }
    u64::from_str_radix(value.trim(), 8).map_err(|err| err.to_string())
}

fn xml_text_content(xml: &str) -> String {
    let mut text = String::new();
    let mut in_tag = false;
    let mut entity = String::new();
    let mut in_entity = false;

    for ch in xml.chars() {
        if in_entity {
            if ch == ';' {
                text.push_str(match entity.as_str() {
                    "amp" => "&",
                    "lt" => "<",
                    "gt" => ">",
                    "quot" => "\"",
                    "apos" => "'",
                    _ => " ",
                });
                entity.clear();
                in_entity = false;
            } else if entity.len() < 12 {
                entity.push(ch);
            } else {
                entity.clear();
                in_entity = false;
            }
            continue;
        }

        match ch {
            '<' => {
                in_tag = true;
                text.push(' ');
            }
            '>' => in_tag = false,
            '&' if !in_tag => in_entity = true,
            _ if !in_tag => text.push(ch),
            _ => {}
        }
    }

    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn searchable_pdf_text(path: &Path) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|err| err.to_string())?;
    let raw = String::from_utf8_lossy(&bytes);
    let mut text = String::new();
    let mut chars = raw.chars().peekable();

    while let Some(ch) = chars.next() {
        if ch != '(' {
            continue;
        }

        let mut literal = String::new();
        let mut escaped = false;
        let mut depth = 1usize;

        for next in chars.by_ref() {
            if escaped {
                literal.push(match next {
                    'n' => '\n',
                    'r' => '\r',
                    't' => '\t',
                    'b' => '\u{0008}',
                    'f' => '\u{000c}',
                    other => other,
                });
                escaped = false;
                continue;
            }

            match next {
                '\\' => escaped = true,
                '(' => {
                    depth += 1;
                    literal.push(next);
                }
                ')' => {
                    depth = depth.saturating_sub(1);
                    if depth == 0 {
                        break;
                    }
                    literal.push(next);
                }
                _ => literal.push(next),
            }
        }

        if literal.chars().any(|value| value.is_alphabetic()) {
            text.push_str(&literal);
            text.push('\n');
        }
    }

    Ok(text)
}

#[tauri::command]
fn search_workspace(
    root: String,
    query: String,
    show_hidden: bool,
) -> Result<SearchReport, String> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return Ok(SearchReport {
            results: Vec::new(),
            scanned_files: 0,
            skipped_files: 0,
            issues: Vec::new(),
        });
    }

    let root = PathBuf::from(root);
    let mut results = Vec::new();
    let mut stack = vec![root];
    let mut visited_files = 0usize;
    let mut skipped_files = 0usize;
    let mut issues = Vec::new();

    while let Some(path) = stack.pop() {
        if results.len() >= 200 || visited_files >= 5000 {
            break;
        }

        let name = file_name(&path);
        if !show_hidden && name.starts_with('.') {
            continue;
        }

        let metadata = match fs::metadata(&path) {
            Ok(metadata) => metadata,
            Err(error) => {
                skipped_files += 1;
                record_search_issue(&mut issues, &path, error);
                continue;
            }
        };

        if metadata.is_dir() {
            match fs::read_dir(&path) {
                Ok(children) => {
                    for child in children {
                        match child {
                            Ok(child) => stack.push(child.path()),
                            Err(error) => record_search_issue(&mut issues, &path, error),
                        }
                    }
                }
                Err(error) => record_search_issue(&mut issues, &path, error),
            }
            continue;
        }

        visited_files += 1;
        let name_lower = name.to_lowercase();
        if name_lower.contains(&query) {
            results.push(SearchResult {
                path: path.to_string_lossy().to_string(),
                name: name.clone(),
                extension: extension(&path),
                line_number: None,
                preview: name,
                match_kind: SearchMatchKind::Name,
            });
            if results.len() >= 200 {
                break;
            }
        }

        if is_archive_search_candidate(&path, metadata.len()) {
            match searchable_archive_entries(&path) {
                Ok(entries) => {
                    if let Some(entry) = entries
                        .into_iter()
                        .find(|entry| entry.to_lowercase().contains(&query))
                    {
                        results.push(SearchResult {
                            path: path.to_string_lossy().to_string(),
                            name: file_name(&path),
                            extension: extension(&path),
                            line_number: None,
                            preview: entry,
                            match_kind: SearchMatchKind::ArchiveEntry,
                        });
                        if results.len() >= 200 {
                            break;
                        }
                    }
                }
                Err(error) => {
                    skipped_files += 1;
                    record_search_issue(&mut issues, &path, error);
                }
            }
        }

        if !is_text_search_candidate(&path, metadata.len()) {
            if is_office_search_candidate(&path, metadata.len()) {
                match searchable_office_text(&path) {
                    Ok(text) if text.to_lowercase().contains(&query) => {
                        results.push(SearchResult {
                            path: path.to_string_lossy().to_string(),
                            name: file_name(&path),
                            extension: extension(&path),
                            line_number: None,
                            preview: search_preview(&text, &query),
                            match_kind: SearchMatchKind::OfficeContent,
                        });
                    }
                    Ok(_) => {}
                    Err(error) => {
                        skipped_files += 1;
                        record_search_issue(&mut issues, &path, error);
                    }
                }
            } else if is_pdf_search_candidate(&path, metadata.len()) {
                match searchable_pdf_text(&path) {
                    Ok(text) if text.to_lowercase().contains(&query) => {
                        results.push(SearchResult {
                            path: path.to_string_lossy().to_string(),
                            name: file_name(&path),
                            extension: extension(&path),
                            line_number: None,
                            preview: search_preview(&text, &query),
                            match_kind: SearchMatchKind::PdfContent,
                        });
                    }
                    Ok(_) => {}
                    Err(error) => {
                        skipped_files += 1;
                        record_search_issue(&mut issues, &path, error);
                    }
                }
            }
            continue;
        }

        let file = match fs::File::open(&path) {
            Ok(file) => file,
            Err(error) => {
                skipped_files += 1;
                record_search_issue(&mut issues, &path, error);
                continue;
            }
        };

        for (line_index, line) in BufReader::new(file).lines().enumerate() {
            let line = match line {
                Ok(line) => line,
                Err(error) => {
                    skipped_files += 1;
                    record_search_issue(&mut issues, &path, error);
                    break;
                }
            };

            if line.to_lowercase().contains(&query) {
                results.push(SearchResult {
                    path: path.to_string_lossy().to_string(),
                    name: file_name(&path),
                    extension: extension(&path),
                    line_number: Some(line_index + 1),
                    preview: line.trim().chars().take(240).collect(),
                    match_kind: SearchMatchKind::Content,
                });
                break;
            }

            if line_index > 5000 {
                break;
            }
        }
    }

    Ok(SearchReport {
        results,
        scanned_files: visited_files,
        skipped_files,
        issues,
    })
}

fn record_search_issue(issues: &mut Vec<SearchIssue>, path: &Path, error: impl ToString) {
    if issues.len() < 50 {
        issues.push(SearchIssue {
            path: path.to_string_lossy().to_string(),
            message: error.to_string(),
        });
    }
}

fn search_preview(text: &str, query: &str) -> String {
    let lower = text.to_lowercase();
    let Some(index) = lower.find(query) else {
        return text.chars().take(240).collect();
    };
    let start = index.saturating_sub(80);
    text.chars().skip(start).take(240).collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_directory,
            read_file_metadata,
            read_file_bytes,
            save_text_file,
            save_preview_image,
            hash_file,
            open_in_system,
            reveal_in_file_manager,
            search_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_docx_search_text_from_sample() {
        let path = PathBuf::from("../samples/report.docx");
        let text = searchable_office_text(&path).expect("docx text");
        assert!(text.contains("Office Viewer DOCX sample"));
    }

    #[test]
    fn extracts_pptx_search_text_from_sample() {
        let path = PathBuf::from("../samples/slides.pptx");
        let text = searchable_office_text(&path).expect("pptx text");
        assert!(text.contains("Office Viewer PPTX sample slide"));
    }

    #[test]
    fn extracts_xlsx_search_text_from_sample() {
        let path = PathBuf::from("../samples/formats.xlsx");
        let text = searchable_office_text(&path).expect("xlsx text");
        assert!(text.contains("Spreadsheet"));
    }

    #[test]
    fn extracts_pdf_search_text_from_sample() {
        let path = PathBuf::from("../samples/brief.pdf");
        let text = searchable_pdf_text(&path).expect("pdf text");
        assert!(text.contains("Office Viewer PDF sample"));
    }

    #[test]
    fn extracts_zip_entry_names_from_sample() {
        let path = PathBuf::from("../samples/bundle.zip");
        let entries = searchable_archive_entries(&path).expect("zip entries");
        assert!(entries.iter().any(|entry| entry == "nested/info.json"));
    }

    #[test]
    fn extracts_tar_entry_names_from_sample() {
        let path = PathBuf::from("../samples/bundle.tar");
        let entries = searchable_archive_entries(&path).expect("tar entries");
        assert!(entries.iter().any(|entry| entry == "nested/info.json"));
    }

    #[test]
    fn extracts_tgz_entry_names_from_sample() {
        let path = PathBuf::from("../samples/bundle.tar.gz");
        let entries = searchable_archive_entries(&path).expect("tgz entries");
        assert!(entries.iter().any(|entry| entry == "nested/info.json"));
    }

    #[test]
    fn searches_archive_entry_names() {
        let report = search_workspace("../samples".to_string(), "nested/info".to_string(), true)
            .expect("search");
        assert!(report
            .results
            .iter()
            .any(|result| result.match_kind == SearchMatchKind::ArchiveEntry
                && result.preview == "nested/info.json"));
        assert!(report.scanned_files > 0);
    }
}
