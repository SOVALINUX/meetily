use crate::summary::templates;
use serde::{Deserialize, Serialize};
use tauri::Runtime;
use tracing::{info, warn};

/// Template metadata for UI display
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateInfo {
    /// Template identifier (e.g., "daily_standup", "standard_meeting")
    pub id: String,

    /// Display name for the template
    pub name: String,

    /// Brief description of the template's purpose
    pub description: String,
}

/// Detailed template structure for preview/debugging
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateDetails {
    /// Template identifier
    pub id: String,

    /// Display name
    pub name: String,

    /// Description
    pub description: String,

    /// List of section titles in order
    pub sections: Vec<String>,
}

/// Full section data for template editing UI
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateSectionFull {
    pub title: String,
    pub instruction: String,
    pub format: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub example_item_format: Option<String>,
}

/// Full template data including all section fields, for the editor UI
#[derive(Debug, Serialize, Deserialize)]
pub struct TemplateFullDetails {
    pub id: String,
    pub name: String,
    pub description: String,
    pub sections: Vec<TemplateSectionFull>,
}

/// Lists all available templates
///
/// Returns templates from both built-in (embedded) and custom (user data directory) sources.
/// Templates are automatically discovered - no code changes needed to add new templates.
///
/// # Returns
/// Vector of TemplateInfo with id, name, and description for each template
#[tauri::command]
pub async fn api_list_templates<R: Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<TemplateInfo>, String> {
    info!("api_list_templates called");

    let templates = templates::list_templates();

    let template_infos: Vec<TemplateInfo> = templates
        .into_iter()
        .map(|(id, name, description)| TemplateInfo {
            id,
            name,
            description,
        })
        .collect();

    info!("Found {} available templates", template_infos.len());

    Ok(template_infos)
}

/// Gets detailed information about a specific template
///
/// # Arguments
/// * `template_id` - Template identifier (e.g., "daily_standup")
///
/// # Returns
/// TemplateDetails with full template structure
#[tauri::command]
pub async fn api_get_template_details<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<TemplateDetails, String> {
    info!("api_get_template_details called for template_id: {}", template_id);

    let template = templates::get_template(&template_id)?;

    let section_titles: Vec<String> = template
        .sections
        .iter()
        .map(|section| section.title.clone())
        .collect();

    let details = TemplateDetails {
        id: template_id,
        name: template.name,
        description: template.description,
        sections: section_titles,
    };

    info!("Retrieved template details for '{}'", details.name);

    Ok(details)
}

/// Validates a custom template JSON string
///
/// Useful for template editor UI or validation before saving custom templates
///
/// # Arguments
/// * `template_json` - Raw JSON string of the template
///
/// # Returns
/// Ok(template_name) if valid, Err(error_message) if invalid
#[tauri::command]
pub async fn api_validate_template<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_json: String,
) -> Result<String, String> {
    info!("api_validate_template called");

    match templates::validate_and_parse_template(&template_json) {
        Ok(template) => {
            info!("Template '{}' validated successfully", template.name);
            Ok(template.name)
        }
        Err(e) => {
            warn!("Template validation failed: {}", e);
            Err(e)
        }
    }
}

/// Returns the complete template structure for editing in the UI.
/// Unlike api_get_template_details which returns only section titles,
/// this returns all editable fields per section.
#[tauri::command]
pub async fn api_get_template_full<R: Runtime>(
    _app: tauri::AppHandle<R>,
    template_id: String,
) -> Result<TemplateFullDetails, String> {
    info!("api_get_template_full called for template_id: {}", template_id);

    let template = templates::get_template(&template_id)?;

    let sections: Vec<TemplateSectionFull> = template
        .sections
        .into_iter()
        .map(|s| TemplateSectionFull {
            title: s.title,
            instruction: s.instruction,
            format: s.format,
            item_format: s.item_format,
            example_item_format: s.example_item_format,
        })
        .collect();

    Ok(TemplateFullDetails {
        id: template_id,
        name: template.name,
        description: template.description,
        sections,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_list_templates() {
        // This test requires the templates to be embedded/available
        // In a real test environment, you might want to mock the templates module

        // For now, just verify the function compiles and runs
        // You can expand this with more specific assertions
    }

    #[tokio::test]
    async fn test_validate_template_valid() {
        let valid_json = r#"
        {
            "name": "Test Template",
            "description": "A test template",
            "sections": [
                {
                    "title": "Summary",
                    "instruction": "Provide a summary",
                    "format": "paragraph"
                }
            ]
        }"#;

        // Mock app handle would be needed for actual testing
        // For now, test the validation logic directly
        let result = templates::validate_and_parse_template(valid_json);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_validate_template_invalid() {
        let invalid_json = "invalid json";

        let result = templates::validate_and_parse_template(invalid_json);
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_template_full_sections_have_instruction() {
        let result = templates::get_template("daily_standup");
        assert!(result.is_ok());
        let tmpl = result.unwrap();
        for section in &tmpl.sections {
            assert!(!section.instruction.is_empty(),
                "Section '{}' has empty instruction", section.title);
        }
    }
}
