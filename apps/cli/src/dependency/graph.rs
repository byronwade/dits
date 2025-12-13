//! Dependency graph data structures.
//!
//! Represents the relationship between project files and their media dependencies.

use crate::core::Hash;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

/// A node in the dependency graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyNode {
    /// Path to the file (relative to repo root).
    pub path: String,
    /// Content hash of the file (if tracked).
    pub hash: Option<Hash>,
    /// Whether this is a project file (vs media).
    pub is_project: bool,
    /// Whether this file exists in the repository.
    pub is_tracked: bool,
    /// Whether this file exists on disk.
    pub exists_on_disk: bool,
}

impl DependencyNode {
    /// Create a new dependency node.
    pub fn new(path: impl Into<String>) -> Self {
        Self {
            path: path.into(),
            hash: None,
            is_project: false,
            is_tracked: false,
            exists_on_disk: false,
        }
    }

    /// Set the content hash.
    pub fn with_hash(mut self, hash: Hash) -> Self {
        self.hash = Some(hash);
        self
    }

    /// Mark as a project file.
    pub fn as_project(mut self) -> Self {
        self.is_project = true;
        self
    }

    /// Mark as tracked.
    pub fn as_tracked(mut self) -> Self {
        self.is_tracked = true;
        self
    }

    /// Mark as existing on disk.
    pub fn as_exists(mut self) -> Self {
        self.exists_on_disk = true;
        self
    }
}

/// An edge in the dependency graph.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyEdge {
    /// Source node (the project file).
    pub from: String,
    /// Target node (the dependency).
    pub to: String,
    /// Type of dependency.
    pub edge_type: EdgeType,
}

/// Type of dependency edge.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EdgeType {
    /// Direct media reference.
    Media,
    /// Nested project reference.
    NestedProject,
    /// Transitive dependency (from nested project).
    Transitive,
}

/// A dependency graph for a repository.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DependencyGraph {
    /// All nodes in the graph.
    pub nodes: HashMap<String, DependencyNode>,
    /// All edges in the graph.
    pub edges: Vec<DependencyEdge>,
}

impl DependencyGraph {
    /// Create a new empty dependency graph.
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a node to the graph.
    pub fn add_node(&mut self, node: DependencyNode) {
        self.nodes.insert(node.path.clone(), node);
    }

    /// Add an edge to the graph.
    pub fn add_edge(&mut self, from: impl Into<String>, to: impl Into<String>, edge_type: EdgeType) {
        self.edges.push(DependencyEdge {
            from: from.into(),
            to: to.into(),
            edge_type,
        });
    }

    /// Get a node by path.
    pub fn get_node(&self, path: &str) -> Option<&DependencyNode> {
        self.nodes.get(path)
    }

    /// Get all dependencies of a file (direct and transitive).
    pub fn get_dependencies(&self, path: &str) -> Vec<&DependencyNode> {
        let mut visited = HashSet::new();
        let mut result = Vec::new();
        self.collect_dependencies(path, &mut visited, &mut result);
        result
    }

    /// Recursively collect dependencies.
    fn collect_dependencies<'a>(
        &'a self,
        path: &str,
        visited: &mut HashSet<String>,
        result: &mut Vec<&'a DependencyNode>,
    ) {
        if visited.contains(path) {
            return;
        }
        visited.insert(path.to_string());

        for edge in &self.edges {
            if edge.from == path {
                if let Some(node) = self.nodes.get(&edge.to) {
                    result.push(node);
                    // Recurse for nested projects
                    if node.is_project {
                        self.collect_dependencies(&edge.to, visited, result);
                    }
                }
            }
        }
    }

    /// Get all dependents of a file (files that depend on this).
    pub fn get_dependents(&self, path: &str) -> Vec<&DependencyNode> {
        self.edges
            .iter()
            .filter(|e| e.to == path)
            .filter_map(|e| self.nodes.get(&e.from))
            .collect()
    }

    /// Get all project files in the graph.
    pub fn project_files(&self) -> Vec<&DependencyNode> {
        self.nodes.values().filter(|n| n.is_project).collect()
    }

    /// Get all media files in the graph.
    pub fn media_files(&self) -> Vec<&DependencyNode> {
        self.nodes.values().filter(|n| !n.is_project).collect()
    }

    /// Get all untracked dependencies.
    pub fn untracked_dependencies(&self) -> Vec<&DependencyNode> {
        self.nodes.values().filter(|n| !n.is_tracked && !n.is_project).collect()
    }

    /// Get all missing files (don't exist on disk).
    pub fn missing_files(&self) -> Vec<&DependencyNode> {
        self.nodes.values().filter(|n| !n.exists_on_disk).collect()
    }

    /// Check if all dependencies are satisfied (tracked).
    pub fn all_dependencies_satisfied(&self) -> bool {
        self.untracked_dependencies().is_empty()
    }

    /// Merge another graph into this one.
    pub fn merge(&mut self, other: DependencyGraph) {
        for (path, node) in other.nodes {
            self.nodes.entry(path).or_insert(node);
        }
        self.edges.extend(other.edges);
    }

    /// Get statistics about the graph.
    pub fn stats(&self) -> GraphStats {
        GraphStats {
            total_nodes: self.nodes.len(),
            project_files: self.nodes.values().filter(|n| n.is_project).count(),
            media_files: self.nodes.values().filter(|n| !n.is_project).count(),
            tracked_files: self.nodes.values().filter(|n| n.is_tracked).count(),
            untracked_files: self.nodes.values().filter(|n| !n.is_tracked).count(),
            missing_files: self.nodes.values().filter(|n| !n.exists_on_disk).count(),
            total_edges: self.edges.len(),
        }
    }

    /// Render the graph as a tree string for CLI display.
    pub fn render_tree(&self, root: &str) -> String {
        let mut output = String::new();
        let mut visited = HashSet::new();
        self.render_tree_recursive(root, "", true, &mut visited, &mut output);
        output
    }

    fn render_tree_recursive(
        &self,
        path: &str,
        prefix: &str,
        is_last: bool,
        visited: &mut HashSet<String>,
        output: &mut String,
    ) {
        let connector = if is_last { "└── " } else { "├── " };
        let node = self.nodes.get(path);

        let status = match node {
            Some(n) if !n.exists_on_disk => " [MISSING]",
            Some(n) if !n.is_tracked => " [UNTRACKED]",
            _ => "",
        };

        let display_path = PathBuf::from(path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| path.to_string());

        output.push_str(&format!("{}{}{}{}\n", prefix, connector, display_path, status));

        if visited.contains(path) {
            return;
        }
        visited.insert(path.to_string());

        let children: Vec<_> = self.edges
            .iter()
            .filter(|e| e.from == path)
            .map(|e| e.to.clone())
            .collect();

        let child_prefix = format!("{}{}   ", prefix, if is_last { " " } else { "│" });

        for (i, child) in children.iter().enumerate() {
            let is_last_child = i == children.len() - 1;
            self.render_tree_recursive(child, &child_prefix, is_last_child, visited, output);
        }
    }
}

/// Statistics about a dependency graph.
#[derive(Debug, Clone)]
pub struct GraphStats {
    pub total_nodes: usize,
    pub project_files: usize,
    pub media_files: usize,
    pub tracked_files: usize,
    pub untracked_files: usize,
    pub missing_files: usize,
    pub total_edges: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dependency_graph() {
        let mut graph = DependencyGraph::new();

        graph.add_node(DependencyNode::new("project.prproj").as_project().as_tracked().as_exists());
        graph.add_node(DependencyNode::new("media/video.mp4").as_tracked().as_exists());
        graph.add_node(DependencyNode::new("media/audio.wav").as_tracked().as_exists());
        graph.add_node(DependencyNode::new("missing.mp4"));

        graph.add_edge("project.prproj", "media/video.mp4", EdgeType::Media);
        graph.add_edge("project.prproj", "media/audio.wav", EdgeType::Media);
        graph.add_edge("project.prproj", "missing.mp4", EdgeType::Media);

        let deps = graph.get_dependencies("project.prproj");
        assert_eq!(deps.len(), 3);

        let untracked = graph.untracked_dependencies();
        assert_eq!(untracked.len(), 1);
        assert_eq!(untracked[0].path, "missing.mp4");

        assert!(!graph.all_dependencies_satisfied());
    }

    #[test]
    fn test_nested_projects() {
        let mut graph = DependencyGraph::new();

        graph.add_node(DependencyNode::new("main.prproj").as_project().as_tracked().as_exists());
        graph.add_node(DependencyNode::new("sub.prproj").as_project().as_tracked().as_exists());
        graph.add_node(DependencyNode::new("video.mp4").as_tracked().as_exists());

        graph.add_edge("main.prproj", "sub.prproj", EdgeType::NestedProject);
        graph.add_edge("sub.prproj", "video.mp4", EdgeType::Media);

        // Should get both direct and transitive dependencies
        let deps = graph.get_dependencies("main.prproj");
        assert_eq!(deps.len(), 2); // sub.prproj and video.mp4
    }
}
