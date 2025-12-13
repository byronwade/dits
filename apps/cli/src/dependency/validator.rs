//! Dependency validation for commits.
//!
//! Validates that all media referenced by project files is tracked
//! before allowing commits.

use super::graph::{DependencyGraph, DependencyNode, EdgeType};
use super::parser::{parse_project, ParsedProject, ProjectType};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use thiserror::Error;

/// Validation errors.
#[derive(Debug, Error)]
pub enum ValidationError {
    #[error("Parse error: {0}")]
    ParseError(#[from] super::parser::ParseError),

    #[error("Missing dependencies: {count} file(s) referenced but not tracked")]
    MissingDependencies { count: usize, paths: Vec<String> },

    #[error("External dependencies: {count} file(s) outside repository root")]
    ExternalDependencies { count: usize, paths: Vec<String> },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Result of dependency validation.
#[derive(Debug)]
pub struct ValidationResult {
    /// The dependency graph built during validation.
    pub graph: DependencyGraph,
    /// Paths that are missing (not tracked).
    pub missing: Vec<String>,
    /// Paths that are outside the repository.
    pub external: Vec<String>,
    /// Paths that exist and are tracked.
    pub satisfied: Vec<String>,
    /// Whether validation passed.
    pub is_valid: bool,
}

impl ValidationResult {
    /// Create a successful validation result.
    pub fn success(graph: DependencyGraph, satisfied: Vec<String>) -> Self {
        Self {
            graph,
            missing: Vec::new(),
            external: Vec::new(),
            satisfied,
            is_valid: true,
        }
    }

    /// Create a failed validation result.
    pub fn failure(
        graph: DependencyGraph,
        missing: Vec<String>,
        external: Vec<String>,
        satisfied: Vec<String>,
    ) -> Self {
        Self {
            graph,
            missing,
            external,
            satisfied,
            is_valid: false,
        }
    }
}

/// Validates dependencies for project files.
pub struct DependencyValidator {
    /// Repository root path.
    repo_root: PathBuf,
    /// Set of tracked file paths (relative to repo root).
    tracked_files: HashSet<String>,
}

impl DependencyValidator {
    /// Create a new validator.
    pub fn new(repo_root: impl Into<PathBuf>) -> Self {
        Self {
            repo_root: repo_root.into(),
            tracked_files: HashSet::new(),
        }
    }

    /// Add tracked files to the validator.
    pub fn with_tracked_files(mut self, files: impl IntoIterator<Item = String>) -> Self {
        self.tracked_files.extend(files);
        self
    }

    /// Add a single tracked file.
    pub fn add_tracked(&mut self, path: impl Into<String>) {
        self.tracked_files.insert(path.into());
    }

    /// Check if a path is tracked.
    pub fn is_tracked(&self, path: &str) -> bool {
        self.tracked_files.contains(path)
    }

    /// Validate a single project file.
    pub fn validate_project(&self, project_path: &Path) -> Result<ValidationResult, ValidationError> {
        let parsed = parse_project(project_path)?;
        self.validate_parsed_project(&parsed)
    }

    /// Validate a parsed project.
    pub fn validate_parsed_project(&self, parsed: &ParsedProject) -> Result<ValidationResult, ValidationError> {
        let mut graph = DependencyGraph::new();
        let mut missing = Vec::new();
        let mut external = Vec::new();
        let mut satisfied = Vec::new();

        // Add the project file itself as a node
        let project_rel_path = self.relative_path(&parsed.project_path);
        graph.add_node(
            DependencyNode::new(&project_rel_path)
                .as_project()
                .as_tracked()
                .as_exists()
        );

        // Process all media references
        for reference in &parsed.references {
            let rel_path = self.relative_path(&reference.normalized_path);

            // Check if outside repo
            if !reference.normalized_path.starts_with(&self.repo_root) {
                external.push(reference.original_path.clone());
                graph.add_node(DependencyNode::new(&rel_path));
                graph.add_edge(&project_rel_path, &rel_path, EdgeType::Media);
                continue;
            }

            // Check if tracked
            let is_tracked = self.is_tracked(&rel_path);
            let exists = reference.exists;

            let mut node = DependencyNode::new(&rel_path);
            if is_tracked {
                node = node.as_tracked();
                satisfied.push(rel_path.clone());
            } else {
                missing.push(rel_path.clone());
            }
            if exists {
                node = node.as_exists();
            }

            graph.add_node(node);
            graph.add_edge(&project_rel_path, &rel_path, EdgeType::Media);
        }

        // Process nested projects recursively
        for nested in &parsed.nested_projects {
            let rel_path = self.relative_path(&nested.normalized_path);

            let mut node = DependencyNode::new(&rel_path).as_project();
            if self.is_tracked(&rel_path) {
                node = node.as_tracked();
            }
            if nested.exists {
                node = node.as_exists();
            }

            graph.add_node(node);
            graph.add_edge(&project_rel_path, &rel_path, EdgeType::NestedProject);

            // Recursively validate nested project if it exists
            if nested.exists {
                if let Ok(nested_result) = self.validate_project(&nested.normalized_path) {
                    // Merge nested graph
                    graph.merge(nested_result.graph);
                    missing.extend(nested_result.missing);
                    external.extend(nested_result.external);
                    satisfied.extend(nested_result.satisfied);
                }
            }
        }

        let is_valid = missing.is_empty() && external.is_empty();

        if is_valid {
            Ok(ValidationResult::success(graph, satisfied))
        } else {
            Ok(ValidationResult::failure(graph, missing, external, satisfied))
        }
    }

    /// Validate multiple project files.
    pub fn validate_projects(&self, project_paths: &[PathBuf]) -> Result<ValidationResult, ValidationError> {
        let mut combined_graph = DependencyGraph::new();
        let mut all_missing = Vec::new();
        let mut all_external = Vec::new();
        let mut all_satisfied = Vec::new();

        for path in project_paths {
            let result = self.validate_project(path)?;
            combined_graph.merge(result.graph);
            all_missing.extend(result.missing);
            all_external.extend(result.external);
            all_satisfied.extend(result.satisfied);
        }

        // Deduplicate
        all_missing.sort();
        all_missing.dedup();
        all_external.sort();
        all_external.dedup();
        all_satisfied.sort();
        all_satisfied.dedup();

        let is_valid = all_missing.is_empty() && all_external.is_empty();

        if is_valid {
            Ok(ValidationResult::success(combined_graph, all_satisfied))
        } else {
            Ok(ValidationResult::failure(combined_graph, all_missing, all_external, all_satisfied))
        }
    }

    /// Get relative path from repo root.
    fn relative_path(&self, path: &Path) -> String {
        path.strip_prefix(&self.repo_root)
            .unwrap_or(path)
            .to_string_lossy()
            .replace('\\', "/")
    }
}

/// Check if a file is a supported project file.
pub fn is_project_file(path: &Path) -> bool {
    matches!(ProjectType::from_path(path),
        ProjectType::PremierePro |
        ProjectType::DaVinciResolve |
        ProjectType::FinalCutPro |
        ProjectType::AfterEffects
    )
}

/// Get all project files from a list of paths.
pub fn filter_project_files(paths: &[PathBuf]) -> Vec<PathBuf> {
    paths.iter()
        .filter(|p| is_project_file(p))
        .cloned()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn test_validator_creation() {
        let validator = DependencyValidator::new("/repo")
            .with_tracked_files(vec!["video.mp4".to_string(), "audio.wav".to_string()]);

        assert!(validator.is_tracked("video.mp4"));
        assert!(validator.is_tracked("audio.wav"));
        assert!(!validator.is_tracked("missing.mp4"));
    }

    #[test]
    fn test_is_project_file() {
        assert!(is_project_file(Path::new("project.prproj")));
        assert!(is_project_file(Path::new("project.drp")));
        assert!(is_project_file(Path::new("project.fcpxml")));
        assert!(is_project_file(Path::new("project.aep")));
        assert!(!is_project_file(Path::new("video.mp4")));
        assert!(!is_project_file(Path::new("README.md")));
    }
}
