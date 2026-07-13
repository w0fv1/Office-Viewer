use crate::formats::{extension, guess_mime};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FileEntry {
    name: String,
    path: String,
    is_dir: bool,
    extension: Option<String>,
    size: u64,
    modified: Option<u64>,
    created: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FileMetadata {
    path: String,
    name: String,
    extension: Option<String>,
    mime: String,
    size: u64,
    modified: Option<u64>,
    created: Option<u64>,
}

fn unix_secs(time: std::io::Result<std::time::SystemTime>) -> Option<u64> {
    time.ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|duration| duration.as_secs())
}

pub(crate) fn file_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_else(|| path.to_str().unwrap_or(""))
        .to_string()
}

fn entry_from_path(path: PathBuf) -> Result<FileEntry, String> {
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    Ok(FileEntry {
        name: file_name(&path),
        path: path.to_string_lossy().to_string(),
        is_dir: metadata.is_dir(),
        extension: extension(&path),
        size: metadata.len(),
        modified: unix_secs(metadata.modified()),
        created: unix_secs(metadata.created()),
    })
}

#[tauri::command]
pub(crate) fn list_directory(path: String, show_hidden: bool) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(path).map_err(|error| error.to_string())? {
        let path = entry.map_err(|error| error.to_string())?.path();
        if !show_hidden && file_name(&path).starts_with('.') {
            continue;
        }
        entries.push(entry_from_path(path)?);
    }
    entries.sort_by(|first, second| {
        second
            .is_dir
            .cmp(&first.is_dir)
            .then_with(|| first.name.to_lowercase().cmp(&second.name.to_lowercase()))
    });
    Ok(entries)
}

#[tauri::command]
pub(crate) fn read_file_metadata(path: String) -> Result<FileMetadata, String> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf).map_err(|error| error.to_string())?;
    if metadata.is_dir() {
        return Err("Cannot read a directory as a file".to_string());
    }
    Ok(FileMetadata {
        path,
        name: file_name(&path_buf),
        extension: extension(&path_buf),
        mime: guess_mime(&path_buf),
        size: metadata.len(),
        modified: unix_secs(metadata.modified()),
        created: unix_secs(metadata.created()),
    })
}

#[tauri::command]
pub(crate) fn read_file_bytes(path: String) -> Result<tauri::ipc::Response, String> {
    let path = PathBuf::from(path);
    if fs::metadata(&path)
        .map_err(|error| error.to_string())?
        .is_dir()
    {
        return Err("Cannot read a directory as a file".to_string());
    }
    Ok(tauri::ipc::Response::new(
        fs::read(path).map_err(|error| error.to_string())?,
    ))
}

#[tauri::command]
pub(crate) fn save_text_file(path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    if fs::metadata(&path)
        .map_err(|error| error.to_string())?
        .is_dir()
    {
        return Err("Cannot write text into a directory".to_string());
    }
    fs::write(path, content).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn hash_file(path: String) -> Result<String, String> {
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    Ok(format!("{:x}", hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::ipc::{InvokeResponseBody, IpcResponse};

    #[test]
    fn writes_text_file_content() {
        let path =
            std::env::temp_dir().join(format!("office-viewer-save-{}.md", std::process::id()));
        fs::write(&path, "before").expect("seed file");
        save_text_file(path.to_string_lossy().to_string(), "after".to_string())
            .expect("write text");
        assert_eq!(fs::read_to_string(&path).expect("saved text"), "after");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn hashes_file_content_on_demand() {
        let hash = hash_file("../samples/notes.md".to_string()).expect("hash");
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn returns_file_content_as_raw_ipc_bytes() {
        let response = read_file_bytes("../samples/notes.md".to_string()).expect("file bytes");
        let body = response.body().expect("response body");
        let InvokeResponseBody::Raw(bytes) = body else {
            panic!("expected raw IPC response");
        };
        assert!(bytes.starts_with(b"# Office Viewer"));
    }
}
