/// Known MS Teams application display names (macOS) — matched against system audio app list
const TEAMS_APP_NAMES: &[&str] = &[
    "Microsoft Teams",
    "Microsoft Teams (work or school)",
    "Teams",
];

/// Known MS Teams process names (Windows/Linux) — matched against running process list
#[cfg(not(target_os = "macos"))]
const TEAMS_PROCESS_NAMES: &[&str] = &["ms-teams.exe", "Teams.exe", "teams", "teams-for-linux"];

/// Returns true if the given app display name corresponds to MS Teams.
pub fn is_teams_app_name(name: &str) -> bool {
    let lower = name.to_lowercase();
    TEAMS_APP_NAMES
        .iter()
        .any(|known| lower == known.to_lowercase())
}

/// Returns true if any app in `apps` is MS Teams (macOS audio-based detection).
pub fn detect_teams_audio_active(apps: &[String]) -> bool {
    apps.iter().any(|app| is_teams_app_name(app))
}

/// Returns true if an MS Teams process is currently running (Windows/Linux).
#[cfg(not(target_os = "macos"))]
pub fn detect_teams_process_running() -> bool {
    use sysinfo::System;
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    sys.processes().values().any(|process| {
        let name = process.name().to_string_lossy().to_lowercase();
        TEAMS_PROCESS_NAMES
            .iter()
            .any(|known| name == known.to_lowercase())
    })
}

/// No-op stub for macOS (uses audio-based detection instead).
#[cfg(target_os = "macos")]
pub fn detect_teams_process_running() -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_teams_app_names_matching() {
        assert!(is_teams_app_name("Microsoft Teams"));
        assert!(is_teams_app_name("microsoft teams")); // case-insensitive
        assert!(is_teams_app_name("Teams"));
        assert!(is_teams_app_name("Microsoft Teams (work or school)"));
        assert!(!is_teams_app_name("Spotify"));
        assert!(!is_teams_app_name("Zoom"));
        assert!(!is_teams_app_name("Google Chrome"));
        assert!(!is_teams_app_name(""));
    }

    #[test]
    fn test_detect_teams_audio_active() {
        let apps = vec!["Spotify".to_string(), "Microsoft Teams".to_string()];
        assert!(detect_teams_audio_active(&apps));

        let apps_no_teams: Vec<String> = vec!["Spotify".to_string(), "Safari".to_string()];
        assert!(!detect_teams_audio_active(&apps_no_teams));

        let empty: Vec<String> = vec![];
        assert!(!detect_teams_audio_active(&empty));
    }
}
