//! Security CLI commands (Phase 9).

use anyhow::{bail, Result};
use dits::security::{AuditEventType, AuditLog, AuditOutcome, KeyStore};

/// Initialize encryption for a repository.
///
/// The early encryption experiment is disabled until it covers the complete
/// repository and has a reviewed key-lifecycle design.
pub fn encrypt_init(_password: Option<&str>) -> Result<()> {
    let _ = find_dits_dir()?;
    bail!(
        "Repository encryption is disabled in this alpha. The experimental implementation did not \
         encrypt every storage engine or metadata path, so enabling it could create a false \
         security boundary. No keystore or repository data was changed."
    )
}

/// Show encryption status.
pub fn encrypt_status() -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let keystore = KeyStore::new(&dits_dir);

    if !keystore.exists() {
        println!("Encryption: UNAVAILABLE IN THIS ALPHA");
        println!("No experimental keystore is present.");
        return Ok(());
    }

    println!("Encryption: EXPERIMENTAL KEYSTORE PRESENT; REPOSITORY LOCKED");
    println!("Keystore: {}", keystore.path().display());
    println!(
        "This alpha refuses repository operations because the old experiment did not protect \
         every storage engine or metadata path."
    );
    println!("`dits logout` can clear any legacy on-disk key cache.");

    Ok(())
}

/// Login to unlock the keystore.
pub fn login(_password: Option<&str>) -> Result<()> {
    let _ = find_dits_dir()?;
    bail!(
        "Encryption unlock is disabled in this alpha. No key was loaded or cached. Use `dits \
         encrypt-status` for repository-specific recovery guidance."
    )
}

/// Logout (clear cached keys).
pub fn logout() -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let keystore = KeyStore::new(&dits_dir);
    let audit = AuditLog::open(&dits_dir);

    // Clear cached keys
    keystore.clear_cache()?;
    audit.log_success(AuditEventType::Logout, None)?;

    println!("Logged out successfully.");
    println!("Cached encryption keys cleared.");

    Ok(())
}

/// Change the keystore password.
pub fn change_password(_old: Option<&str>, _new: Option<&str>) -> Result<()> {
    let _ = find_dits_dir()?;
    bail!(
        "Encryption password changes are disabled in this alpha while the repository encryption \
         format and recovery policy are under redesign. No keystore was changed."
    )
}

/// Show audit log.
pub fn audit_show(last: usize, event_type: Option<&str>) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let audit = AuditLog::open(&dits_dir);

    let events = if let Some(type_str) = event_type {
        let event_type = parse_event_type(type_str)?;
        audit.query_by_type(event_type)?
    } else {
        audit.read_last(last)?
    };

    if events.is_empty() {
        println!("No audit events found.");
        return Ok(());
    }

    println!("Audit Log ({} events):", events.len());
    println!("{}", "-".repeat(80));

    for event in events {
        let outcome_str = match &event.outcome {
            AuditOutcome::Success => "SUCCESS".to_string(),
            AuditOutcome::Failure { reason } => format!("FAILED: {}", reason),
            AuditOutcome::Denied { reason } => format!("DENIED: {}", reason),
        };

        let resource = event.resource.as_deref().unwrap_or("-");

        println!(
            "{} | {:20} | {:10} | {}",
            event.timestamp_str,
            event.event_type.name(),
            outcome_str,
            resource
        );
    }

    Ok(())
}

/// Show audit statistics.
pub fn audit_stats() -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let audit = AuditLog::open(&dits_dir);

    let stats = audit.stats()?;

    println!("Audit Log Statistics");
    println!("{}", "-".repeat(40));
    println!("Total events:  {}", stats.total_events);
    println!("Successful:    {}", stats.successful);
    println!("Failed:        {}", stats.failed);
    println!("Denied:        {}", stats.denied);

    if let Some(oldest) = stats.oldest_event {
        let oldest_str = chrono::DateTime::<chrono::Utc>::from_timestamp(oldest as i64, 0)
            .map(|dt| dt.format("%Y-%m-%d %H:%M:%S UTC").to_string())
            .unwrap_or_else(|| "unknown".to_string());
        println!("Oldest event:  {}", oldest_str);
    }

    if let Some(newest) = stats.newest_event {
        let newest_str = chrono::DateTime::<chrono::Utc>::from_timestamp(newest as i64, 0)
            .map(|dt| dt.format("%Y-%m-%d %H:%M:%S UTC").to_string())
            .unwrap_or_else(|| "unknown".to_string());
        println!("Newest event:  {}", newest_str);
    }

    Ok(())
}

/// Export audit log to JSON.
pub fn audit_export(output: Option<&str>) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let audit = AuditLog::open(&dits_dir);

    let json = audit.export_json()?;

    match output {
        Some(path) => {
            std::fs::write(path, &json)?;
            println!("Audit log exported to: {}", path);
        },
        None => {
            println!("{}", json);
        },
    }

    Ok(())
}

/// Find the .dits directory.
fn find_dits_dir() -> Result<std::path::PathBuf> {
    let current = std::env::current_dir()?;

    let dits_dir = current.join(".dits");
    if dits_dir.exists() {
        return Ok(dits_dir);
    }

    // Search parent directories
    let mut dir = current.as_path();
    while let Some(parent) = dir.parent() {
        let dits = parent.join(".dits");
        if dits.exists() {
            return Ok(dits);
        }
        dir = parent;
    }

    bail!("Not a dits repository (or any parent up to mount point)")
}

/// Parse an event type string.
fn parse_event_type(s: &str) -> Result<AuditEventType> {
    match s.to_lowercase().as_str() {
        "login" => Ok(AuditEventType::Login),
        "logout" => Ok(AuditEventType::Logout),
        "login_failed" | "loginfailed" => Ok(AuditEventType::LoginFailed),
        "password_changed" | "passwordchanged" => Ok(AuditEventType::PasswordChanged),
        "keystore_created" | "keystorecreated" => Ok(AuditEventType::KeystoreCreated),
        "repo_init" | "repoinit" | "init" => Ok(AuditEventType::RepoInit),
        "commit_created" | "commitcreated" | "commit" => Ok(AuditEventType::CommitCreated),
        "file_added" | "fileadded" => Ok(AuditEventType::FileAdded),
        "file_accessed" | "fileaccessed" => Ok(AuditEventType::FileAccessed),
        "encryption_enabled" | "encryptionenabled" => Ok(AuditEventType::EncryptionEnabled),
        _ => bail!("Unknown event type: {}", s),
    }
}

#[cfg(test)]
mod tests {
    use tempfile::tempdir;

    use super::*;

    #[test]
    fn test_find_dits_dir_not_found() {
        // In a temp dir without .dits
        let dir = tempdir().unwrap();
        std::env::set_current_dir(dir.path()).unwrap();

        let result = find_dits_dir();
        assert!(result.is_err());
    }
}
