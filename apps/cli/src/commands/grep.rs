//! Search tracked file contents for a pattern (`dits grep`).

use std::path::Path;

use anyhow::{Context, Result};
use console::style;
use regex::RegexBuilder;

use crate::store::Repository;

/// Options controlling a grep search.
#[derive(Clone, Debug, Default)]
pub struct GrepOptions {
    /// Pattern to search for (regex unless `fixed_strings`).
    pub pattern:            String,
    /// Show 1-based line numbers.
    pub line_number:        bool,
    /// Case-insensitive search.
    pub ignore_case:        bool,
    /// Match whole words only.
    pub word_regexp:        bool,
    /// Show only a per-file match count.
    pub count:              bool,
    /// Show only the names of files containing matches.
    pub files_with_matches: bool,
    /// Treat the pattern as a literal string (no regex).
    pub fixed_strings:      bool,
    /// Restrict the search to these path prefixes (relative to repo root).
    pub paths:              Vec<String>,
}

/// A single matching line.
#[derive(Clone, Debug)]
pub struct GrepMatch {
    pub path:        String,
    pub line_number: usize,
    pub line:        String,
}

/// Result of a grep search.
#[derive(Clone, Debug, Default)]
pub struct GrepResult {
    pub matches: Vec<GrepMatch>,
}

/// Search tracked files for `options.pattern`.
pub fn grep(options: &GrepOptions) -> Result<GrepResult> {
    let repo = Repository::open(Path::new("."))
        .context("Not a Dits repository (or any parent directory)")?;

    // Build the matcher. Literal patterns are escaped; word matching wraps in \b.
    let mut pattern = if options.fixed_strings {
        regex::escape(&options.pattern)
    } else {
        options.pattern.clone()
    };
    if options.word_regexp {
        pattern = format!(r"\b(?:{})\b", pattern);
    }
    let re = RegexBuilder::new(&pattern)
        .case_insensitive(options.ignore_case)
        .build()
        .with_context(|| format!("Invalid pattern: {}", options.pattern))?;

    let work_dir = repo.work_dir().to_path_buf();
    let mut result = GrepResult::default();

    for rel_path in repo.list_files()? {
        if !options.paths.is_empty()
            && !options.paths.iter().any(|p| {
                rel_path == *p || rel_path.starts_with(&format!("{}/", p.trim_end_matches('/')))
            })
        {
            continue;
        }

        let abs = work_dir.join(&rel_path);
        // Only text files are searchable; skip anything that isn't valid UTF-8.
        let bytes = match std::fs::read(&abs) {
            Ok(b) => b,
            Err(_) => continue,
        };
        let text = match String::from_utf8(bytes) {
            Ok(t) => t,
            Err(_) => continue,
        };

        for (idx, line) in text.lines().enumerate() {
            if re.is_match(line) {
                result.matches.push(GrepMatch {
                    path:        rel_path.clone(),
                    line_number: idx + 1,
                    line:        line.to_string(),
                });
            }
        }
    }

    Ok(result)
}

/// Print grep results honoring the output-mode flags.
pub fn print_results(result: &GrepResult, options: &GrepOptions) {
    if options.files_with_matches {
        let mut seen = std::collections::BTreeSet::new();
        for m in &result.matches {
            if seen.insert(m.path.clone()) {
                println!("{}", style(&m.path).magenta());
            }
        }
        return;
    }

    if options.count {
        let mut counts: std::collections::BTreeMap<&str, usize> = std::collections::BTreeMap::new();
        for m in &result.matches {
            *counts.entry(m.path.as_str()).or_insert(0) += 1;
        }
        for (path, n) in counts {
            println!("{}:{}", style(path).magenta(), n);
        }
        return;
    }

    for m in &result.matches {
        if options.line_number {
            println!("{}:{}:{}", style(&m.path).magenta(), style(m.line_number).green(), m.line);
        } else {
            println!("{}:{}", style(&m.path).magenta(), m.line);
        }
    }
}
