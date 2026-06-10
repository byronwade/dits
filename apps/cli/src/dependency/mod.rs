//! Dependency graph and NLE project file parsing (Phase 7).
//!
//! This module provides:
//! - Project file parsers for Premiere Pro, DaVinci Resolve, Final Cut Pro
//! - Dependency tracking to prevent "Media Offline" errors
//! - Validation that all referenced assets are tracked before commit

mod graph;
mod parser;
mod validator;

pub use graph::{DependencyEdge, DependencyGraph, DependencyNode, EdgeType, GraphStats};
pub use parser::{
    parse_project, AfterEffectsParser, FcpParser, MediaReference, MediaType, ParseError,
    ParsedProject, PremiereParser, ProjectParser, ProjectType, ResolveParser,
};
pub use validator::{
    filter_project_files, is_project_file, DependencyValidator, ValidationError, ValidationResult,
};
