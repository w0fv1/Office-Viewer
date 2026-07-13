use std::{
    path::Path,
    process::{Command, Stdio},
};

struct SystemCommandSpec {
    program: &'static str,
    args: Vec<String>,
}

fn open_command_spec(path: &Path) -> SystemCommandSpec {
    #[cfg(target_os = "windows")]
    return SystemCommandSpec {
        program: "explorer",
        args: vec![path.to_string_lossy().to_string()],
    };
    #[cfg(target_os = "macos")]
    return SystemCommandSpec {
        program: "open",
        args: vec![path.to_string_lossy().to_string()],
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    return SystemCommandSpec {
        program: "xdg-open",
        args: vec![path.to_string_lossy().to_string()],
    };
}

fn reveal_command_spec(path: &Path) -> SystemCommandSpec {
    #[cfg(target_os = "windows")]
    return SystemCommandSpec {
        program: "explorer",
        args: vec![format!("/select,{}", path.to_string_lossy())],
    };
    #[cfg(target_os = "macos")]
    return SystemCommandSpec {
        program: "open",
        args: vec!["-R".to_string(), path.to_string_lossy().to_string()],
    };
    #[cfg(all(unix, not(target_os = "macos")))]
    return SystemCommandSpec {
        program: "xdg-open",
        args: vec![path.parent().unwrap_or(path).to_string_lossy().to_string()],
    };
}

fn spawn_system_command(spec: SystemCommandSpec) -> Result<(), String> {
    Command::new(spec.program)
        .args(spec.args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub(crate) fn open_in_system(path: String) -> Result<(), String> {
    spawn_system_command(open_command_spec(Path::new(&path)))
}

#[tauri::command]
pub(crate) fn reveal_in_file_manager(path: String) -> Result<(), String> {
    spawn_system_command(reveal_command_spec(Path::new(&path)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_reveal_command_for_current_platform() {
        let path = std::path::PathBuf::from(r"C:\workspace\report.docx");
        let spec = reveal_command_spec(&path);
        #[cfg(target_os = "windows")]
        {
            assert_eq!(spec.program, "explorer");
            assert_eq!(
                spec.args,
                vec![r"/select,C:\workspace\report.docx".to_string()]
            );
        }
        #[cfg(target_os = "macos")]
        {
            assert_eq!(spec.program, "open");
            assert_eq!(
                spec.args,
                vec!["-R".to_string(), r"C:\workspace\report.docx".to_string()]
            );
        }
        #[cfg(all(unix, not(target_os = "macos")))]
        {
            assert_eq!(spec.program, "xdg-open");
            assert_eq!(spec.args, vec![".".to_string()]);
        }
    }
}
