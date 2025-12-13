//! Proxy variant storage.

use crate::core::Hash;
use super::variant::{ProxyVariant, VariantType};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Storage for proxy variants.
pub struct ProxyStore {
    /// Base directory for proxy storage (.dits/proxies).
    base_dir: PathBuf,
}

impl ProxyStore {
    /// Create a new proxy store.
    pub fn new(dits_dir: &Path) -> Self {
        Self {
            base_dir: dits_dir.join("proxies"),
        }
    }

    /// Initialize the proxy store directory structure.
    pub fn init(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.base_dir)?;
        fs::create_dir_all(self.base_dir.join("variants"))?;
        fs::create_dir_all(self.base_dir.join("data"))?;
        Ok(())
    }

    /// Get the path to a variant's metadata file.
    fn variant_path(&self, parent_hash: &Hash, variant_type: VariantType) -> PathBuf {
        let hash_hex = parent_hash.to_hex();
        let type_name = format!("{:?}", variant_type).to_lowercase();
        self.base_dir
            .join("variants")
            .join(&hash_hex[..2])
            .join(format!("{}_{}.json", &hash_hex[2..], type_name))
    }

    /// Get the path to proxy data storage.
    fn data_path(&self, content_hash: &Hash) -> PathBuf {
        let hash_hex = content_hash.to_hex();
        self.base_dir
            .join("data")
            .join(&hash_hex[..2])
            .join(&hash_hex[2..])
    }

    /// Store a proxy variant.
    pub fn store(&self, variant: &ProxyVariant) -> std::io::Result<()> {
        let path = self.variant_path(&variant.parent_hash, variant.variant_type);

        // Create parent directory
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        // Write variant metadata
        let json = variant.to_json();
        fs::write(&path, json)?;

        Ok(())
    }

    /// Store proxy data (the actual proxy file content).
    pub fn store_data(&self, content_hash: &Hash, data: &[u8]) -> std::io::Result<()> {
        let path = self.data_path(content_hash);

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::write(&path, data)?;
        Ok(())
    }

    /// Load a proxy variant.
    pub fn load(
        &self,
        parent_hash: &Hash,
        variant_type: VariantType,
    ) -> std::io::Result<Option<ProxyVariant>> {
        let path = self.variant_path(parent_hash, variant_type);

        if !path.exists() {
            return Ok(None);
        }

        let json = fs::read_to_string(&path)?;
        let variant = ProxyVariant::from_json(&json)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

        Ok(Some(variant))
    }

    /// Load proxy data.
    pub fn load_data(&self, content_hash: &Hash) -> std::io::Result<Option<Vec<u8>>> {
        let path = self.data_path(content_hash);

        if !path.exists() {
            return Ok(None);
        }

        let data = fs::read(&path)?;
        Ok(Some(data))
    }

    /// Check if a proxy variant exists.
    pub fn exists(&self, parent_hash: &Hash, variant_type: VariantType) -> bool {
        self.variant_path(parent_hash, variant_type).exists()
    }

    /// List all variants for a parent asset.
    pub fn list_variants(&self, parent_hash: &Hash) -> std::io::Result<Vec<ProxyVariant>> {
        let hash_hex = parent_hash.to_hex();
        let dir = self.base_dir.join("variants").join(&hash_hex[..2]);

        if !dir.exists() {
            return Ok(Vec::new());
        }

        let mut variants = Vec::new();
        let prefix = &hash_hex[2..];

        for entry in fs::read_dir(&dir)? {
            let entry = entry?;
            let file_name = entry.file_name().to_string_lossy().to_string();

            if file_name.starts_with(prefix) && file_name.ends_with(".json") {
                if let Ok(json) = fs::read_to_string(entry.path()) {
                    if let Ok(variant) = ProxyVariant::from_json(&json) {
                        variants.push(variant);
                    }
                }
            }
        }

        Ok(variants)
    }

    /// List all proxies in the store.
    pub fn list_all(&self) -> std::io::Result<Vec<ProxyVariant>> {
        let variants_dir = self.base_dir.join("variants");

        if !variants_dir.exists() {
            return Ok(Vec::new());
        }

        let mut variants = Vec::new();

        // Walk through fan-out directories
        for dir_entry in fs::read_dir(&variants_dir)? {
            let dir_entry = dir_entry?;
            if !dir_entry.file_type()?.is_dir() {
                continue;
            }

            for file_entry in fs::read_dir(dir_entry.path())? {
                let file_entry = file_entry?;
                let path = file_entry.path();

                if path.extension().map_or(false, |e| e == "json") {
                    if let Ok(json) = fs::read_to_string(&path) {
                        if let Ok(variant) = ProxyVariant::from_json(&json) {
                            variants.push(variant);
                        }
                    }
                }
            }
        }

        Ok(variants)
    }

    /// Delete a proxy variant.
    pub fn delete(
        &self,
        parent_hash: &Hash,
        variant_type: VariantType,
    ) -> std::io::Result<bool> {
        let path = self.variant_path(parent_hash, variant_type);

        if !path.exists() {
            return Ok(false);
        }

        // Load variant to get content hash for data cleanup
        if let Ok(json) = fs::read_to_string(&path) {
            if let Ok(variant) = ProxyVariant::from_json(&json) {
                // Remove data file
                let data_path = self.data_path(&variant.content_hash);
                let _ = fs::remove_file(&data_path);
            }
        }

        fs::remove_file(&path)?;
        Ok(true)
    }

    /// Get proxy storage statistics.
    pub fn stats(&self) -> std::io::Result<ProxyStoreStats> {
        let mut stats = ProxyStoreStats::default();

        let data_dir = self.base_dir.join("data");
        if data_dir.exists() {
            for dir_entry in fs::read_dir(&data_dir)? {
                let dir_entry = dir_entry?;
                if !dir_entry.file_type()?.is_dir() {
                    continue;
                }

                for file_entry in fs::read_dir(dir_entry.path())? {
                    let file_entry = file_entry?;
                    if let Ok(metadata) = file_entry.metadata() {
                        stats.data_files += 1;
                        stats.data_size += metadata.len();
                    }
                }
            }
        }

        let variants = self.list_all()?;
        stats.variant_count = variants.len();

        // Count by type
        for variant in &variants {
            *stats.by_type.entry(format!("{:?}", variant.variant_type)).or_insert(0) += 1;
        }

        Ok(stats)
    }
}

/// Proxy store statistics.
#[derive(Debug, Default)]
pub struct ProxyStoreStats {
    /// Number of variant metadata files.
    pub variant_count: usize,
    /// Number of proxy data files.
    pub data_files: usize,
    /// Total size of proxy data in bytes.
    pub data_size: u64,
    /// Counts by variant type.
    pub by_type: HashMap<String, usize>,
}

impl ProxyStoreStats {
    /// Get human-readable size string.
    pub fn data_size_human(&self) -> String {
        if self.data_size >= 1024 * 1024 * 1024 {
            format!("{:.2} GB", self.data_size as f64 / (1024.0 * 1024.0 * 1024.0))
        } else if self.data_size >= 1024 * 1024 {
            format!("{:.2} MB", self.data_size as f64 / (1024.0 * 1024.0))
        } else {
            format!("{:.2} KB", self.data_size as f64 / 1024.0)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Hasher;
    use tempfile::TempDir;

    #[test]
    fn test_proxy_store_init() {
        let temp = TempDir::new().unwrap();
        let store = ProxyStore::new(temp.path());

        store.init().unwrap();

        assert!(temp.path().join("proxies").exists());
        assert!(temp.path().join("proxies/variants").exists());
        assert!(temp.path().join("proxies/data").exists());
    }

    #[test]
    fn test_store_and_load_variant() {
        let temp = TempDir::new().unwrap();
        let store = ProxyStore::new(temp.path());
        store.init().unwrap();

        let parent_hash = Hasher::hash(b"test parent content");
        let content_hash = Hasher::hash(b"test proxy content");

        let variant = ProxyVariant::new(
            parent_hash,
            VariantType::Proxy1080p,
            content_hash,
            1024,
            vec![content_hash],
        );

        store.store(&variant).unwrap();

        let loaded = store.load(&parent_hash, VariantType::Proxy1080p).unwrap();
        assert!(loaded.is_some());
        let loaded = loaded.unwrap();
        assert_eq!(loaded.parent_hash, parent_hash);
        assert_eq!(loaded.variant_type, VariantType::Proxy1080p);
    }
}
