//! Dependency graph and NLE project file parsing (Phase 7).
//!
//! This module provides:
//! - Project file parsers for Premiere Pro, DaVinci Resolve, Final Cut Pro
//! - Dependency tracking to prevent "Media Offline" errors
//! - Validation that all referenced assets are tracked before commit

mod parser;
mod graph;
mod validator;

pub use parser::{
    ProjectParser, ProjectType, ParsedProject, MediaReference, MediaType,
    PremiereParser, ResolveParser, FcpParser, AfterEffectsParser,
    parse_project, ParseError,
};
pub use graph::{DependencyGraph, DependencyNode, DependencyEdge, EdgeType, GraphStats};
pub use validator::{DependencyValidator, ValidationResult, ValidationError, is_project_file, filter_project_files};
