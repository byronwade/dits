//! .ditsignore file parsing and pattern matching.
//!
//! Implements gitignore-style pattern matching for excluding files from version
//! control.

use std::{
    fs,
    path::{Path, PathBuf},
};

use globset::{Glob, GlobSet, GlobSetBuilder};

#[derive(Debug)]
struct IgnoreRule {
    patterns:    GlobSet,
    is_negation: bool,
}

/// Ignore pattern matcher for filtering files.
#[derive(Debug)]
pub struct IgnoreMatcher {
    /// User-provided rules in source order. As with gitignore, the last
    /// matching rule determines whether a path is ignored.
    rules:         Vec<IgnoreRule>,
    /// Whether any user-provided negation exists. An ignored directory can
    /// only be pruned from a tree walk when no negation could re-include one
    /// of its descendants.
    has_negations: bool,
    /// Root directory for relative pattern matching.
    root:          PathBuf,
}

impl IgnoreMatcher {
    /// Create a new ignore matcher for the given repository root.
    pub fn new(root: &Path) -> Self {
        let mut rules = Vec::new();
        let mut has_negations = false;

        // Load .ditsignore from root
        let ignore_file = root.join(".ditsignore");
        if ignore_file.exists() {
            if let Ok(content) = fs::read_to_string(&ignore_file) {
                (rules, has_negations) = Self::parse_ignore_file(&content);
            }
        }

        Self {
            rules,
            has_negations,
            root: root.to_path_buf(),
        }
    }

    /// Parse ignore file content into rules while preserving source order.
    fn parse_ignore_file(content: &str) -> (Vec<IgnoreRule>, bool) {
        let mut rules = Vec::new();
        let mut has_negations = false;

        for line in content.lines() {
            let line = line.trim();

            // Skip empty lines and comments
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            // Handle negation patterns
            let (pattern, is_negation) = if let Some(stripped) = line.strip_prefix('!') {
                has_negations = true;
                (stripped.trim(), true)
            } else {
                (line, false)
            };

            // Convert gitignore pattern to glob pattern
            let glob_patterns = Self::convert_to_glob(pattern);
            let mut builder = GlobSetBuilder::new();
            let mut has_valid_pattern = false;

            for glob_pattern in glob_patterns {
                if let Ok(glob) = Glob::new(&glob_pattern) {
                    builder.add(glob);
                    has_valid_pattern = true;
                }
            }

            if has_valid_pattern {
                if let Ok(patterns) = builder.build() {
                    rules.push(IgnoreRule { patterns, is_negation });
                }
            }
        }

        (rules, has_negations)
    }

    /// Convert gitignore-style pattern to glob patterns.
    fn convert_to_glob(pattern: &str) -> Vec<String> {
        let mut patterns = Vec::new();
        let pattern = pattern.trim_end_matches('/');

        // If pattern starts with /, it's anchored to root
        if let Some(p) = pattern.strip_prefix('/') {
            patterns.push(p.to_string());
            // Also match as directory pattern
            patterns.push(format!("{}/**", p));
        } else {
            // Pattern can match anywhere in the tree
            patterns.push(format!("**/{}", pattern));
            patterns.push(pattern.to_string());
            // Also match as directory pattern
            patterns.push(format!("**/{}/**", pattern));
            patterns.push(format!("{}/**", pattern));
        }

        patterns
    }

    /// Check if a path should be ignored.
    pub fn is_ignored(&self, path: &Path) -> bool {
        // Get path relative to root
        let relative = path.strip_prefix(&self.root).unwrap_or(path);

        // Repository metadata is never eligible for re-inclusion.
        if relative
            .components()
            .any(|component| component.as_os_str() == ".dits")
        {
            return true;
        }

        let mut ignored = false;
        for rule in &self.rules {
            if rule.patterns.is_match(relative) {
                ignored = !rule.is_negation;
            }
        }
        ignored
    }

    /// Check if a path should be ignored (accepts string).
    pub fn is_ignored_str(&self, path: &str) -> bool {
        self.is_ignored(Path::new(path))
    }

    /// Return whether a directory walker should descend into `path`.
    ///
    /// Repository metadata is always pruned. Other ignored directories are
    /// pruned only when the ignore file has no negations; otherwise a child
    /// may be explicitly re-included and the walker must inspect it.
    pub(crate) fn should_descend_into(&self, path: &str) -> bool {
        if path.split('/').any(|component| component == ".dits") {
            return false;
        }

        !self.is_ignored_str(path) || self.has_negations
    }

    /// Filter a list of paths, returning only non-ignored ones.
    pub fn filter_paths<'a>(&self, paths: impl Iterator<Item = &'a Path>) -> Vec<&'a Path> {
        paths.filter(|p| !self.is_ignored(p)).collect()
    }
}

impl Default for IgnoreMatcher {
    fn default() -> Self {
        Self::new(Path::new("."))
    }
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use tempfile::TempDir;

    use super::*;

    fn create_test_ignore(dir: &Path, content: &str) {
        let ignore_file = dir.join(".ditsignore");
        let mut file = fs::File::create(&ignore_file).unwrap();
        file.write_all(content.as_bytes()).unwrap();
    }

    #[test]
    fn test_always_ignores_dits_directory() {
        let dir = TempDir::new().unwrap();
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str(".dits/objects/test"));
        assert!(matcher.is_ignored_str(".dits/HEAD"));
    }

    #[test]
    fn test_simple_pattern() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "*.tmp\n*.log");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("test.tmp"));
        assert!(matcher.is_ignored_str("debug.log"));
        assert!(!matcher.is_ignored_str("test.txt"));
    }

    #[test]
    fn test_directory_pattern() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "target/\nnode_modules/");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("target/debug/test"));
        assert!(matcher.is_ignored_str("node_modules/package/index.js"));
        assert!(!matcher.is_ignored_str("src/target.rs"));
    }

    #[test]
    fn test_wildcard_patterns() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "*.o\nbuild/**/*.bin");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("main.o"));
        assert!(matcher.is_ignored_str("lib/util.o"));
    }

    #[test]
    fn test_negation_pattern() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "*.mp4\n!important.mp4");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("video.mp4"));
        assert!(!matcher.is_ignored_str("important.mp4"));
    }

    #[test]
    fn test_last_matching_rule_wins() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "*.log\n!important.log\nimportant.log\n");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("important.log"));

        create_test_ignore(dir.path(), "*.log\nimportant.log\n!important.log\n");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(!matcher.is_ignored_str("important.log"));
    }

    #[test]
    fn test_dits_metadata_cannot_be_reincluded() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "!.dits/HEAD\n!.dits/**\n");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str(".dits/HEAD"));
        assert!(matcher.is_ignored_str(".dits/objects/test"));
        assert!(matcher.is_ignored_str("nested/.dits/HEAD"));
    }

    #[test]
    fn test_directory_pruning_preserves_negated_descendants() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "ignored/\n!ignored/keep.txt\n");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.should_descend_into("ignored"));
        assert!(!matcher.is_ignored_str("ignored/keep.txt"));
        assert!(!matcher.should_descend_into(".dits"));
    }

    #[test]
    fn test_ignored_directory_without_negations_can_be_pruned() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "ignored/\n");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(!matcher.should_descend_into("ignored"));
        assert!(matcher.should_descend_into("src"));
    }

    #[test]
    fn test_comment_and_empty_lines() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "# This is a comment\n\n*.tmp\n   # Another comment\n*.log");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("test.tmp"));
        assert!(matcher.is_ignored_str("test.log"));
    }

    #[test]
    fn test_rooted_pattern() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "/build\n/dist");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("build/output.bin"));
        assert!(matcher.is_ignored_str("dist/app.js"));
        // Nested directories should NOT be ignored with rooted pattern
        // (though our simplified implementation might match them)
    }

    #[test]
    fn test_nested_directory_pattern() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(dir.path(), "**/cache/**");
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("cache/data.bin"));
        assert!(matcher.is_ignored_str("src/cache/temp.bin"));
        assert!(matcher.is_ignored_str("a/b/cache/c/d.bin"));
    }

    #[test]
    fn test_common_media_patterns() {
        let dir = TempDir::new().unwrap();
        create_test_ignore(
            dir.path(),
            r#"
# Build artifacts
*.o
*.a
target/

# OS files
.DS_Store
Thumbs.db

# Temp files
*.tmp
*.swp
*~

# Generated renders
renders/
exports/
"#,
        );
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("main.o"));
        assert!(matcher.is_ignored_str(".DS_Store"));
        assert!(matcher.is_ignored_str("renders/output.mp4"));
        assert!(matcher.is_ignored_str("exports/final.mov"));
        assert!(!matcher.is_ignored_str("src/main.rs"));
        assert!(!matcher.is_ignored_str("video.mp4"));
    }
}
