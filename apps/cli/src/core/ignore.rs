//! .ditsignore file parsing and pattern matching.
//!
//! Implements gitignore-style pattern matching for excluding files from version control.

use globset::{Glob, GlobSet, GlobSetBuilder};
use std::fs;
use std::path::{Path, PathBuf};

/// Ignore pattern matcher for filtering files.
#[derive(Debug)]
pub struct IgnoreMatcher {
    /// Compiled glob patterns for ignored files.
    ignore_set: GlobSet,
    /// Negation patterns (files to include despite matching ignore).
    negate_set: GlobSet,
    /// Root directory for relative pattern matching.
    root: PathBuf,
}

impl IgnoreMatcher {
    /// Create a new ignore matcher for the given repository root.
    pub fn new(root: &Path) -> Self {
        let mut builder = GlobSetBuilder::new();
        let mut negate_builder = GlobSetBuilder::new();

        // Always ignore .dits directory
        if let Ok(glob) = Glob::new("**/.dits/**") {
            builder.add(glob);
        }
        if let Ok(glob) = Glob::new(".dits/**") {
            builder.add(glob);
        }

        // Load .ditsignore from root
        let ignore_file = root.join(".ditsignore");
        if ignore_file.exists() {
            if let Ok(content) = fs::read_to_string(&ignore_file) {
                Self::parse_ignore_file(&content, &mut builder, &mut negate_builder);
            }
        }

        Self {
            ignore_set: builder.build().unwrap_or_else(|_| GlobSet::empty()),
            negate_set: negate_builder.build().unwrap_or_else(|_| GlobSet::empty()),
            root: root.to_path_buf(),
        }
    }

    /// Parse ignore file content and add patterns to builders.
    fn parse_ignore_file(
        content: &str,
        ignore_builder: &mut GlobSetBuilder,
        negate_builder: &mut GlobSetBuilder,
    ) {
        for line in content.lines() {
            let line = line.trim();

            // Skip empty lines and comments
            if line.is_empty() || line.starts_with('#') {
                continue;
            }

            // Handle negation patterns
            let (pattern, is_negation) = if let Some(stripped) = line.strip_prefix('!') {
                (stripped.trim(), true)
            } else {
                (line, false)
            };

            // Convert gitignore pattern to glob pattern
            let glob_patterns = Self::convert_to_glob(pattern);

            for glob_pattern in glob_patterns {
                if let Ok(glob) = Glob::new(&glob_pattern) {
                    if is_negation {
                        negate_builder.add(glob);
                    } else {
                        ignore_builder.add(glob);
                    }
                }
            }
        }
    }

    /// Convert gitignore-style pattern to glob patterns.
    fn convert_to_glob(pattern: &str) -> Vec<String> {
        let mut patterns = Vec::new();
        let pattern = pattern.trim_end_matches('/');

        // If pattern starts with /, it's anchored to root
        if pattern.starts_with('/') {
            let p = &pattern[1..];
            patterns.push(p.to_string());
            // Also match as directory pattern
            patterns.push(format!("{}/**", p));
        } else {
            // Pattern can match anywhere in the tree
            patterns.push(format!("**/{}", pattern));
            patterns.push(format!("{}", pattern));
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

        // Check if it matches ignore patterns
        let ignored = self.ignore_set.is_match(relative);

        // Check if it matches negation patterns (overrides ignore)
        if ignored && self.negate_set.is_match(relative) {
            return false;
        }

        ignored
    }

    /// Check if a path should be ignored (accepts string).
    pub fn is_ignored_str(&self, path: &str) -> bool {
        self.is_ignored(Path::new(path))
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
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

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
        create_test_ignore(dir.path(), r#"
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
"#);
        let matcher = IgnoreMatcher::new(dir.path());

        assert!(matcher.is_ignored_str("main.o"));
        assert!(matcher.is_ignored_str(".DS_Store"));
        assert!(matcher.is_ignored_str("renders/output.mp4"));
        assert!(matcher.is_ignored_str("exports/final.mov"));
        assert!(!matcher.is_ignored_str("src/main.rs"));
        assert!(!matcher.is_ignored_str("video.mp4"));
    }
}
