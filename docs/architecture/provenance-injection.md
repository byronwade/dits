# Provenance Injection (Self-Aware Containers)

Embedded metadata system that gives video files permanent, traceable identity even when shared outside the system.

---

## Overview

Provenance Injection solves the **Boomerang Problem**: files leave your version control system, get edited by clients, and return as mysterious orphans with no history. By injecting hidden metadata directly into video container headers, Dits maintains provenance even when files travel through email, Dropbox, or USB drives.

### The Problem

```
Traditional Workflow:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Your System           Outside World              Back to You            │
│  ┌─────────┐          ┌─────────────┐           ┌─────────────┐         │
│  │ video.  │  email   │ Client gets │  6 months │ Unknown     │         │
│  │ mp4     │ ──────►  │ file, edits │  later    │ file.mp4    │ = ???   │
│  │ (v1.3)  │          │ it          │ ◄──────── │ (who knows) │         │
│  └─────────┘          └─────────────┘           └─────────────┘         │
│                                                                          │
│  Result: Duplicate files, lost history, broken links                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

With Provenance Injection:
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Your System           Outside World              Back to You            │
│  ┌─────────┐          ┌─────────────┐           ┌─────────────┐         │
│  │ video.  │  email   │ Client gets │  6 months │ Unknown     │         │
│  │ mp4     │ ──────►  │ file, edits │  later    │ file.mp4    │         │
│  │ +DITS   │          │ metadata    │ ◄──────── │ +DITS       │         │
│  │ header  │          │ survives!   │           │ header      │         │
│  └─────────┘          └─────────────┘           └────┬────────┘         │
│                                                       │                  │
│  ┌────────────────────────────────────────────────────▼─────────────┐   │
│  │ "I recognize this! It's frames 500-1000 from Project X,          │   │
│  │  Commit abc123, Branch 'main'. Linking to history..."            │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Result: Automatic re-linking, zero duplication, full traceability       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Innovation

Video containers (MP4, MOV, MKV) have "User Data" atoms or metadata boxes that:
- Are ignored by all video players
- Survive most editing operations
- Can store arbitrary data
- Are invisible to end users

Dits injects a small encrypted payload containing provenance information. When files return, this payload identifies their origin and history.

---

## Architecture

```
                            HYDRATION (Export)
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  .dits repository                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │   Asset: project/footage/interview.mp4                            │   │
│  │   Commit: a7b9c3d2e1f0...                                         │   │
│  │   Branch: main                                                    │   │
│  │   Chunks: [hash1, hash2, hash3, ...]                              │   │
│  │                                                                   │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│                               │ dits checkout / dits export              │
│                               ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Provenance Injector                            │   │
│  │                                                                   │   │
│  │   1. Reconstruct file from chunks                                 │   │
│  │   2. Parse container (ISOBMFF/MKV)                                │   │
│  │   3. Create provenance payload                                    │   │
│  │   4. Encrypt payload with repo key                                │   │
│  │   5. Inject into udta/uuid atom                                   │   │
│  │                                                                   │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│                               ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │   Output: interview.mp4 with embedded provenance                  │   │
│  │                                                                   │   │
│  │   ┌─────────────────────────────────────────────────────────┐    │   │
│  │   │ ftyp │ moov │ udta │ DITS metadata │ mdat              │    │   │
│  │   └─────────────────────────────────────────────────────────┘    │   │
│  │                     ▲                                             │   │
│  │                     │                                             │   │
│  │                     └── Hidden provenance payload                 │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘


                            INGEST (Import)
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Unknown file arrives                                                    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │   received_from_client.mp4                                        │   │
│  │   (no idea where this came from)                                  │   │
│  │                                                                   │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│                               │ dits add / dits import                   │
│                               ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Provenance Scanner                             │   │
│  │                                                                   │   │
│  │   1. Parse container                                              │   │
│  │   2. Search for DITS metadata atom                                │   │
│  │   3. If found:                                                    │   │
│  │      a. Decrypt payload                                           │   │
│  │      b. Extract commit hash, branch, chunk map                    │   │
│  │      c. Query repository for matching history                     │   │
│  │      d. Compute content delta                                     │   │
│  │   4. If not found:                                                │   │
│  │      a. Standard import as new asset                              │   │
│  │                                                                   │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                               │                                          │
│                               ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                   │   │
│  │   MATCH FOUND!                                                    │   │
│  │                                                                   │   │
│  │   Original: project/footage/interview.mp4                         │   │
│  │   Commit: a7b9c3d2e1f0 (main, 6 months ago)                       │   │
│  │   Changes: Color grading applied, 15% brightness increase         │   │
│  │                                                                   │   │
│  │   Actions:                                                        │   │
│  │   - Link to existing history                                      │   │
│  │   - Create new commit as child of original                        │   │
│  │   - Store only delta (changed chunks)                             │   │
│  │   - Zero duplication                                              │   │
│  │                                                                   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Provenance Payload Format

### Payload Structure

```rust
use serde::{Serialize, Deserialize};

/// Provenance payload embedded in video files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenancePayload {
    /// Magic number for identification
    pub magic: [u8; 4],  // "DITS"

    /// Payload version for forward compatibility
    pub version: u8,

    /// Repository identifier
    pub repo_id: Uuid,

    /// Commit hash at time of hydration
    pub commit_hash: Blake3Hash,

    /// Branch name
    pub branch: String,

    /// Original asset path in repository
    pub asset_path: String,

    /// Chunk map reference (for efficient delta detection)
    pub chunk_map_id: Blake3Hash,

    /// Frame range (if partial export)
    pub frame_range: Option<FrameRange>,

    /// Timestamp of hydration
    pub hydrated_at: DateTime<Utc>,

    /// User who exported the file
    pub hydrated_by: Option<String>,

    /// Custom metadata
    pub custom: HashMap<String, String>,

    /// Signature for tamper detection
    pub signature: [u8; 64],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameRange {
    pub start: u64,
    pub end: u64,
    pub total_frames: u64,
}

impl ProvenancePayload {
    /// Create new payload for export
    pub fn new(
        repo_id: Uuid,
        commit: &Commit,
        asset: &Asset,
        signing_key: &SigningKey,
    ) -> Self {
        let mut payload = Self {
            magic: *b"DITS",
            version: 1,
            repo_id,
            commit_hash: commit.hash,
            branch: commit.branch.clone().unwrap_or_default(),
            asset_path: asset.path.to_string_lossy().to_string(),
            chunk_map_id: asset.chunk_map_hash(),
            frame_range: None,
            hydrated_at: Utc::now(),
            hydrated_by: None,
            custom: HashMap::new(),
            signature: [0u8; 64],
        };

        // Sign the payload
        payload.signature = payload.sign(signing_key);
        payload
    }

    /// Serialize to binary
    pub fn to_bytes(&self) -> Result<Vec<u8>> {
        let mut buf = Vec::new();

        // Magic
        buf.extend_from_slice(&self.magic);

        // Version
        buf.push(self.version);

        // Serialize rest with MessagePack (compact binary)
        let data = rmp_serde::to_vec(&self)?;
        buf.extend_from_slice(&(data.len() as u32).to_be_bytes());
        buf.extend_from_slice(&data);

        Ok(buf)
    }

    /// Deserialize from binary
    pub fn from_bytes(data: &[u8]) -> Result<Self> {
        // Check magic
        if data.len() < 9 || &data[0..4] != b"DITS" {
            return Err(Error::NotDitsProvenance);
        }

        let version = data[4];
        if version != 1 {
            return Err(Error::UnsupportedProvenanceVersion(version));
        }

        let len = u32::from_be_bytes(data[5..9].try_into()?) as usize;
        let payload: Self = rmp_serde::from_slice(&data[9..9 + len])?;

        Ok(payload)
    }

    /// Sign the payload
    fn sign(&self, key: &SigningKey) -> [u8; 64] {
        let mut signable = self.clone();
        signable.signature = [0u8; 64];
        let bytes = signable.to_bytes().unwrap();
        let sig = key.sign(&bytes);
        sig.to_bytes()
    }

    /// Verify signature
    pub fn verify(&self, key: &VerifyingKey) -> bool {
        let mut signable = self.clone();
        signable.signature = [0u8; 64];
        let bytes = match signable.to_bytes() {
            Ok(b) => b,
            Err(_) => return false,
        };

        let signature = Signature::from_bytes(&self.signature);
        key.verify(&bytes, &signature).is_ok()
    }
}
```

### Encrypted Payload

```rust
use chacha20poly1305::{ChaCha20Poly1305, Key, Nonce};
use chacha20poly1305::aead::{Aead, NewAead};

/// Encrypt provenance payload
pub fn encrypt_payload(
    payload: &ProvenancePayload,
    repo_key: &[u8; 32],
) -> Result<Vec<u8>> {
    let plaintext = payload.to_bytes()?;

    // Generate nonce from content hash (deterministic for same content)
    let content_hash = blake3::hash(&plaintext);
    let nonce_bytes: [u8; 12] = content_hash.as_bytes()[0..12].try_into()?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cipher = ChaCha20Poly1305::new(Key::from_slice(repo_key));
    let ciphertext = cipher.encrypt(nonce, plaintext.as_slice())
        .map_err(|_| Error::EncryptionFailed)?;

    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Decrypt provenance payload
pub fn decrypt_payload(
    encrypted: &[u8],
    repo_key: &[u8; 32],
) -> Result<ProvenancePayload> {
    if encrypted.len() < 12 {
        return Err(Error::InvalidEncryptedPayload);
    }

    let nonce = Nonce::from_slice(&encrypted[0..12]);
    let ciphertext = &encrypted[12..];

    let cipher = ChaCha20Poly1305::new(Key::from_slice(repo_key));
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|_| Error::DecryptionFailed)?;

    ProvenancePayload::from_bytes(&plaintext)
}
```

---

## Container Injection

### ISOBMFF (MP4/MOV) Injection

```rust
/// Inject provenance into ISOBMFF container
pub struct IsobmffInjector;

impl IsobmffInjector {
    /// Inject provenance payload into MP4/MOV file
    pub fn inject(
        input: &Path,
        output: &Path,
        payload: &[u8],
    ) -> Result<()> {
        let mut reader = BufReader::new(File::open(input)?);
        let mut writer = BufWriter::new(File::create(output)?);

        // Parse box structure
        let boxes = parse_top_level_boxes(&mut reader)?;

        // Find injection point (after moov, before mdat)
        let injection_offset = find_injection_point(&boxes)?;

        // Copy file up to injection point
        reader.seek(SeekFrom::Start(0))?;
        std::io::copy(&mut reader.take(injection_offset), &mut writer)?;

        // Write provenance atom
        Self::write_provenance_atom(&mut writer, payload)?;

        // Copy rest of file
        reader.seek(SeekFrom::Start(injection_offset))?;
        std::io::copy(&mut reader, &mut writer)?;

        // Update moov chunk offsets if mdat was shifted
        let payload_size = Self::atom_size(payload);
        if boxes.iter().any(|b| b.box_type == *b"moov" && b.offset < injection_offset) {
            Self::patch_chunk_offsets(output, payload_size as i64)?;
        }

        Ok(())
    }

    /// Write provenance as uuid atom
    fn write_provenance_atom(writer: &mut impl Write, payload: &[u8]) -> Result<()> {
        // Atom structure:
        // - 4 bytes: size
        // - 4 bytes: type ("uuid")
        // - 16 bytes: UUID (custom namespace for DITS)
        // - N bytes: payload

        let atom_size = 8 + 16 + payload.len();

        // Size
        if atom_size > u32::MAX as usize {
            // Extended size
            writer.write_all(&1u32.to_be_bytes())?;
            writer.write_all(b"uuid")?;
            writer.write_all(&(atom_size as u64 + 8).to_be_bytes())?;
        } else {
            writer.write_all(&(atom_size as u32).to_be_bytes())?;
            writer.write_all(b"uuid")?;
        }

        // DITS UUID: f47ac10b-58cc-4372-a567-0e02b2c3d479
        writer.write_all(&[
            0xf4, 0x7a, 0xc1, 0x0b, 0x58, 0xcc, 0x43, 0x72,
            0xa5, 0x67, 0x0e, 0x02, 0xb2, 0xc3, 0xd4, 0x79,
        ])?;

        // Payload
        writer.write_all(payload)?;

        Ok(())
    }

    /// Extract provenance from ISOBMFF file
    pub fn extract(input: &Path) -> Result<Option<Vec<u8>>> {
        let mut reader = BufReader::new(File::open(input)?);
        let boxes = parse_top_level_boxes(&mut reader)?;

        // Look for DITS uuid atom
        for box_ in &boxes {
            if box_.box_type == *b"uuid" {
                reader.seek(SeekFrom::Start(box_.data_offset))?;

                // Read UUID
                let mut uuid = [0u8; 16];
                reader.read_exact(&mut uuid)?;

                // Check if DITS UUID
                if uuid == [
                    0xf4, 0x7a, 0xc1, 0x0b, 0x58, 0xcc, 0x43, 0x72,
                    0xa5, 0x67, 0x0e, 0x02, 0xb2, 0xc3, 0xd4, 0x79,
                ] {
                    let payload_size = box_.data_size - 16;
                    let mut payload = vec![0u8; payload_size as usize];
                    reader.read_exact(&mut payload)?;
                    return Ok(Some(payload));
                }
            }
        }

        // Also check inside moov/udta
        if let Some(moov) = boxes.iter().find(|b| b.box_type == *b"moov") {
            return Self::extract_from_moov(&mut reader, moov);
        }

        Ok(None)
    }

    /// Extract provenance from moov/udta
    fn extract_from_moov(
        reader: &mut impl Read + Seek,
        moov: &Box,
    ) -> Result<Option<Vec<u8>>> {
        let children = parse_boxes_in_range(reader, moov.data_offset, moov.offset + moov.size)?;

        // Find udta
        if let Some(udta) = children.iter().find(|b| b.box_type == *b"udta") {
            let udta_children = parse_boxes_in_range(
                reader,
                udta.data_offset,
                udta.offset + udta.size,
            )?;

            // Look for DITS atom (custom four-char code)
            if let Some(dits) = udta_children.iter().find(|b| b.box_type == *b"DITS") {
                reader.seek(SeekFrom::Start(dits.data_offset))?;
                let mut payload = vec![0u8; dits.data_size as usize];
                reader.read_exact(&mut payload)?;
                return Ok(Some(payload));
            }
        }

        Ok(None)
    }
}
```

### Matroska (MKV/WebM) Injection

```rust
/// Inject provenance into Matroska container
pub struct MatroskaInjector;

impl MatroskaInjector {
    /// Inject provenance into MKV file using Tags element
    pub fn inject(
        input: &Path,
        output: &Path,
        payload: &[u8],
    ) -> Result<()> {
        let mut reader = BufReader::new(File::open(input)?);
        let mut writer = BufWriter::new(File::create(output)?);

        // Parse EBML structure
        let elements = parse_ebml_elements(&mut reader)?;

        // Find Segment element
        let segment = elements.iter()
            .find(|e| e.id == SEGMENT_ID)
            .ok_or(Error::InvalidMatroska)?;

        // Find or create Tags element
        let tags_offset = find_or_calculate_tags_offset(&mut reader, segment)?;

        // Copy up to tags position
        reader.seek(SeekFrom::Start(0))?;
        std::io::copy(&mut reader.take(tags_offset), &mut writer)?;

        // Write provenance tag
        Self::write_provenance_tag(&mut writer, payload)?;

        // Copy rest of file
        reader.seek(SeekFrom::Start(tags_offset))?;
        std::io::copy(&mut reader, &mut writer)?;

        Ok(())
    }

    /// Write provenance as Matroska Tag
    fn write_provenance_tag(writer: &mut impl Write, payload: &[u8]) -> Result<()> {
        // Tags element structure:
        // - Tag
        //   - Targets (empty = global)
        //   - SimpleTag
        //     - TagName: "DITS_PROVENANCE"
        //     - TagBinary: [payload]

        // Encode as EBML
        let tag_name = "DITS_PROVENANCE";

        // SimpleTag
        let simple_tag_data = encode_ebml_element(TAG_NAME_ID, tag_name.as_bytes())
            .chain(encode_ebml_element(TAG_BINARY_ID, payload));

        let simple_tag = encode_ebml_element(SIMPLE_TAG_ID, &simple_tag_data.collect::<Vec<_>>());

        // Tag (with empty Targets for global scope)
        let targets = encode_ebml_element(TARGETS_ID, &[]);
        let tag = encode_ebml_element(TAG_ID, &[targets, simple_tag].concat());

        // Tags container
        let tags = encode_ebml_element(TAGS_ID, &tag);

        writer.write_all(&tags)?;
        Ok(())
    }

    /// Extract provenance from MKV file
    pub fn extract(input: &Path) -> Result<Option<Vec<u8>>> {
        let mut reader = BufReader::new(File::open(input)?);

        // Parse EBML structure
        let elements = parse_ebml_elements(&mut reader)?;

        // Find Tags element
        let segment = elements.iter().find(|e| e.id == SEGMENT_ID)?;
        let tags = find_child_element(&mut reader, segment, TAGS_ID)?;

        if let Some(tags) = tags {
            // Find DITS_PROVENANCE tag
            let tag_elements = parse_ebml_children(&mut reader, &tags)?;

            for tag in tag_elements.iter().filter(|e| e.id == TAG_ID) {
                let simple_tags = parse_ebml_children(&mut reader, tag)?;

                for simple_tag in simple_tags.iter().filter(|e| e.id == SIMPLE_TAG_ID) {
                    let children = parse_ebml_children(&mut reader, simple_tag)?;

                    // Check TagName
                    if let Some(name_el) = children.iter().find(|e| e.id == TAG_NAME_ID) {
                        let name = read_ebml_string(&mut reader, name_el)?;
                        if name == "DITS_PROVENANCE" {
                            // Found it! Read TagBinary
                            if let Some(binary_el) = children.iter().find(|e| e.id == TAG_BINARY_ID) {
                                let payload = read_ebml_binary(&mut reader, binary_el)?;
                                return Ok(Some(payload));
                            }
                        }
                    }
                }
            }
        }

        Ok(None)
    }
}
```

---

## Boomerang Ingest

### Automatic Recognition

```rust
/// Boomerang ingest processor
pub struct BoomerangIngest {
    /// Repository reference
    repo: Arc<Repository>,

    /// Known repo keys for decryption
    repo_keys: HashMap<Uuid, [u8; 32]>,
}

impl BoomerangIngest {
    /// Process an incoming file
    pub async fn process(&self, file_path: &Path) -> Result<IngestResult> {
        // Detect container type
        let container_type = detect_container_type(file_path)?;

        // Extract provenance if present
        let provenance = match container_type {
            ContainerType::Isobmff => IsobmffInjector::extract(file_path)?,
            ContainerType::Matroska => MatroskaInjector::extract(file_path)?,
            ContainerType::Unknown => None,
        };

        if let Some(encrypted_payload) = provenance {
            // Try to decrypt with known keys
            for (repo_id, key) in &self.repo_keys {
                if let Ok(payload) = decrypt_payload(&encrypted_payload, key) {
                    // Verify signature
                    let verify_key = self.repo.get_verify_key(*repo_id).await?;
                    if !payload.verify(&verify_key) {
                        warn!("Provenance signature invalid for repo {}", repo_id);
                        continue;
                    }

                    // Found valid provenance!
                    return self.process_with_provenance(file_path, &payload).await;
                }
            }
        }

        // No provenance found, standard import
        self.standard_import(file_path).await
    }

    /// Process file with valid provenance
    async fn process_with_provenance(
        &self,
        file_path: &Path,
        provenance: &ProvenancePayload,
    ) -> Result<IngestResult> {
        info!("Recognized file with provenance!");
        info!("  Original: {}", provenance.asset_path);
        info!("  Commit: {}", hex::encode(&provenance.commit_hash[..8]));
        info!("  Branch: {}", provenance.branch);
        info!("  Exported: {} by {:?}", provenance.hydrated_at, provenance.hydrated_by);

        // Look up original asset
        let original = self.repo.get_asset_at_commit(
            &provenance.asset_path,
            &provenance.commit_hash,
        ).await?;

        // Compute delta
        let current_chunks = chunk_file(file_path, FastCdcConfig::video()).await?;
        let original_chunks = self.repo.get_chunk_map(&provenance.chunk_map_id).await?;

        let delta = compute_chunk_delta(&original_chunks, &current_chunks);

        info!("  Changes detected:");
        info!("    Unchanged chunks: {} ({:.1}%)",
            delta.unchanged.len(),
            delta.unchanged_percent());
        info!("    Modified chunks: {}", delta.modified.len());
        info!("    New chunks: {}", delta.new.len());
        info!("    Removed chunks: {}", delta.removed.len());

        // Create linked commit
        let commit = self.repo.create_linked_commit(
            file_path,
            &provenance.commit_hash,
            &provenance.asset_path,
            &delta,
        ).await?;

        Ok(IngestResult::Recognized {
            original_path: provenance.asset_path.clone(),
            original_commit: provenance.commit_hash,
            new_commit: commit.hash,
            delta_summary: delta,
            storage_saved: delta.unchanged_bytes(),
        })
    }

    /// Standard import for files without provenance
    async fn standard_import(&self, file_path: &Path) -> Result<IngestResult> {
        // Hash-based dedup still works
        let asset = self.repo.add_file(file_path).await?;

        // Check for content-based matches
        let matches = self.repo.find_similar_assets(&asset).await?;

        if !matches.is_empty() {
            info!("No provenance, but found {} content-similar assets", matches.len());
        }

        Ok(IngestResult::NewAsset {
            asset_hash: asset.hash,
            chunks_deduplicated: asset.chunks_deduplicated,
            similar_assets: matches,
        })
    }
}

/// Result of boomerang ingest
#[derive(Debug)]
pub enum IngestResult {
    /// File recognized via provenance
    Recognized {
        original_path: String,
        original_commit: Blake3Hash,
        new_commit: Blake3Hash,
        delta_summary: ChunkDelta,
        storage_saved: u64,
    },

    /// New asset (no provenance or match)
    NewAsset {
        asset_hash: Blake3Hash,
        chunks_deduplicated: usize,
        similar_assets: Vec<SimilarAsset>,
    },
}

/// Chunk delta between versions
#[derive(Debug)]
pub struct ChunkDelta {
    pub unchanged: Vec<Blake3Hash>,
    pub modified: Vec<(Blake3Hash, Blake3Hash)>,  // (old, new)
    pub new: Vec<Blake3Hash>,
    pub removed: Vec<Blake3Hash>,
}

impl ChunkDelta {
    pub fn unchanged_percent(&self) -> f64 {
        let total = self.unchanged.len() + self.modified.len() + self.new.len();
        if total == 0 { return 0.0; }
        (self.unchanged.len() as f64 / total as f64) * 100.0
    }

    pub fn unchanged_bytes(&self) -> u64 {
        // Sum of unchanged chunk sizes
        self.unchanged.iter()
            .filter_map(|h| get_chunk_size(h).ok())
            .sum()
    }
}
```

### Frame-Level Recognition

```rust
/// Recognize partial exports (frame ranges)
pub struct FrameRecognizer {
    /// Visual fingerprint database
    fingerprint_db: Arc<FingerprintDb>,
}

impl FrameRecognizer {
    /// Try to identify frame range in a clip
    pub async fn identify_frames(
        &self,
        file_path: &Path,
        provenance: &ProvenancePayload,
    ) -> Result<Option<IdentifiedFrames>> {
        // If frame range is in provenance, use it directly
        if let Some(range) = &provenance.frame_range {
            return Ok(Some(IdentifiedFrames {
                start_frame: range.start,
                end_frame: range.end,
                original_total_frames: range.total_frames,
                confidence: 1.0,
            }));
        }

        // Otherwise, use visual fingerprinting
        let current_fingerprints = extract_frame_fingerprints(file_path).await?;

        // Look up in database
        let original_fingerprints = self.fingerprint_db
            .get_for_asset(&provenance.asset_path, &provenance.commit_hash)
            .await?;

        // Find matching range
        let match_result = find_matching_range(
            &current_fingerprints,
            &original_fingerprints,
        )?;

        Ok(match_result)
    }
}

/// Extract visual fingerprints from video
async fn extract_frame_fingerprints(file_path: &Path) -> Result<Vec<FrameFingerprint>> {
    // Sample every Nth frame
    const SAMPLE_INTERVAL: u64 = 30;  // ~1 per second at 30fps

    let mut fingerprints = Vec::new();

    let decoder = VideoDecoder::open(file_path)?;
    let total_frames = decoder.frame_count()?;

    for frame_num in (0..total_frames).step_by(SAMPLE_INTERVAL as usize) {
        decoder.seek_to_frame(frame_num)?;
        let frame = decoder.decode_frame()?;

        // Compute perceptual hash
        let phash = compute_phash(&frame)?;

        fingerprints.push(FrameFingerprint {
            frame_num,
            phash,
        });
    }

    Ok(fingerprints)
}
```

---

## CLI Commands

```bash
# Export with provenance injection
dits export project/footage/interview.mp4 --output ./export/
# Output:
# Exporting interview.mp4...
# Injecting provenance metadata...
# Export complete: ./export/interview.mp4 (with provenance)

# Import and check for provenance
dits import received_file.mp4
# Output:
# Scanning for provenance...
# MATCH FOUND!
#   Original: project/footage/interview.mp4
#   From commit: a7b9c3d2 (main, 6 months ago)
#   Exported by: editor@company.com on 2024-06-15
#
#   Changes detected:
#     Unchanged: 95.2% (4.8 GB)
#     Modified: 4.8% (245 MB)
#
#   Storage saved: 4.8 GB (only storing delta)
#   Linked to history as child of commit a7b9c3d2

# Check provenance of a file
dits provenance check video.mp4
# Output:
# Provenance found:
#   Repository: acme-corp/video-project
#   Commit: a7b9c3d2e1f0...
#   Branch: main
#   Asset: project/footage/interview.mp4
#   Exported: 2024-06-15 14:32:00 UTC
#   By: editor@company.com
#   Signature: VALID

# Strip provenance (for clean delivery)
dits provenance strip video.mp4 --output clean_video.mp4
# Output:
# Provenance removed. Output: clean_video.mp4

# Manually inject provenance
dits provenance inject video.mp4 --commit abc123 --asset path/to/asset.mp4
```

---

## Metadata Survival

### Operations That Preserve Provenance

| Operation | MP4/MOV | MKV | WebM |
|-----------|---------|-----|------|
| Copy | Yes | Yes | Yes |
| Remux (ffmpeg -c copy) | Yes | Yes | Yes |
| Transcode (same container) | Usually | Usually | Usually |
| Container conversion | No* | No* | No* |
| Cloud upload/download | Yes | Yes | Yes |
| Email attachment | Yes | Yes | Yes |
| Most NLE renders | Usually | Usually | N/A |

*Provenance lost on container conversion unless explicitly copied.

### Operations That May Remove Provenance

- Container format conversion (MP4 → MKV)
- Some social media platforms
- Aggressive metadata stripping tools
- Some legacy transcoders

### Mitigation: Redundant Storage

```rust
/// Store provenance in multiple locations for resilience
pub fn inject_redundant(
    file_path: &Path,
    payload: &[u8],
) -> Result<()> {
    // Primary: uuid atom at top level
    inject_uuid_atom(file_path, payload)?;

    // Secondary: inside moov/udta
    inject_udta_atom(file_path, payload)?;

    // Tertiary: XMP metadata (for apps that preserve XMP)
    inject_xmp_metadata(file_path, payload)?;

    Ok(())
}
```

---

## Security Considerations

### Encryption

- Payload is encrypted with repository-specific key
- Only users with repo access can read provenance
- Prevents competitors from analyzing your workflow

### Signature Verification

- Ed25519 signature prevents tampering
- Invalid signatures trigger warnings
- Signature includes timestamp to prevent replay

### Privacy

- No personally identifiable information required
- Optional user attribution
- Can be stripped for final delivery

### Limitations

- Provenance can be intentionally removed
- Not a DRM system
- Trust model assumes good faith

---

## Configuration

```toml
# .dits/config

[provenance]
# Enable provenance injection on export
inject_on_export = true

# Enable provenance scanning on import
scan_on_import = true

# Redundant storage locations
redundant_storage = ["uuid", "udta", "xmp"]

# Include optional metadata
include_user = true
include_timestamp = true
include_branch = true

# Custom metadata to include
[provenance.custom]
project = "Project Name"
client = "Client Name"
```

---

## Database Schema

```sql
-- Track provenance relationships
CREATE TABLE provenance_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_commit_hash BYTEA NOT NULL,
    original_asset_path TEXT NOT NULL,
    imported_commit_hash BYTEA NOT NULL,
    imported_asset_path TEXT NOT NULL,
    imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_by UUID REFERENCES users(id),
    delta_summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_provenance_original ON provenance_links(original_commit_hash, original_asset_path);
CREATE INDEX idx_provenance_imported ON provenance_links(imported_commit_hash);

-- Track exported files for auditing
CREATE TABLE provenance_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commit_hash BYTEA NOT NULL,
    asset_path TEXT NOT NULL,
    exported_to TEXT,
    exported_by UUID REFERENCES users(id),
    exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    frame_range JSONB
);

CREATE INDEX idx_exports_commit ON provenance_exports(commit_hash);
CREATE INDEX idx_exports_user ON provenance_exports(exported_by);
```

---

## References

- [ISO Base Media File Format (ISOBMFF)](https://www.iso.org/standard/68960.html)
- [Matroska Specification](https://www.matroska.org/technical/elements.html)
- [XMP Specification](https://www.adobe.com/devnet/xmp.html)
- [Ed25519 Digital Signatures](https://ed25519.cr.yp.to/)
- [ChaCha20-Poly1305 AEAD](https://datatracker.ietf.org/doc/html/rfc8439)
