//! Security CLI commands (Phase 9).

use anyhow::{Context, Result, bail};
use std::path::Path;
use dits::security::{
    KeyStore, KeyStoreError, AuditLog, AuditEventType, AuditOutcome,
    Argon2Params, KeyBundle,
};

/// Initialize encryption for a repository.
///
/// Creates a new keystore with the given password.
pub fn encrypt_init(password: Option<&str>) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let keystore = KeyStore::new(&dits_dir);
    let audit = AuditLog::open(&dits_dir);

    if keystore.exists() {
        audit.log_failure(AuditEventType::KeystoreCreated, "Keystore already exists", None)?;
        bail!("Encryption already initialized. Use 'dits encrypt-status' to check status.");
    }

    // Get password (prompt if not provided)
    let password = match password {
        Some(p) => p.to_string(),
        None => {
            let pass = rpassword::prompt_password("Enter encryption password: ")
                .context("Failed to read password")?;
            let confirm = rpassword::prompt_password("Confirm password: ")
                .context("Failed to read confirmation")?;
            if pass != confirm {
                audit.log_failure(AuditEventType::KeystoreCreated, "Password mismatch", None)?;
                bail!("Passwords do not match");
            }
            pass
        }
    };

    if password.len() < 8 {
        audit.log_failure(AuditEventType::KeystoreCreated, "Password too short", None)?;
        bail!("Password must be at least 8 characters");
    }

    println!("Deriving encryption keys (this may take a moment)...");

    // Use default params (secure but slow)
    let bundle = keystore.create(&password, None)
        .context("Failed to create keystore")?;

    audit.log_success(AuditEventType::KeystoreCreated, None)?;
    audit.log_success(AuditEventType::EncryptionEnabled, None)?;

    println!("Encryption initialized successfully.");
    println!();
    println!("Your encryption keystore has been created at:");
    println!("  {}", keystore.path().display());
    println!();
    println!("IMPORTANT: Remember your password! Without it, encrypted data cannot be recovered.");
    println!();
    println!("Hint: You can use 'dits encrypt-status' to check encryption status.");

    Ok(())
}

/// Show encryption status.
pub fn encrypt_status() -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let keystore = KeyStore::new(&dits_dir);

    if !keystore.exists() {
        println!("Encryption: NOT INITIALIZED");
        println!();
        println!("Run 'dits encrypt-init' to enable encryption.");
        return Ok(());
    }

    println!("Encryption: ENABLED");
    println!();
    println!("Keystore: {}", keystore.path().display());
    println!();
    println!("To unlock for operations, use 'dits login'");
    println!("To change password, use 'dits change-password'");

    Ok(())
}

/// Login to unlock the keystore.
pub fn login(password: Option<&str>) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let keystore = KeyStore::new(&dits_dir);
    let audit = AuditLog::open(&dits_dir);

    if !keystore.exists() {
        audit.log_failure(AuditEventType::Login, "No keystore found", None)?;
        bail!("Encryption not initialized. Run 'dits encrypt-init' first.");
    }

    let password = match password {
        Some(p) => p.to_string(),
        None => rpassword::prompt_password("Enter password: ")
            .context("Failed to read password")?,
    };

    println!("Verifying password...");

    match keystore.load(&password) {
        Ok(_bundle) => {
            audit.log_success(AuditEventType::Login, None)?;
            println!("Login successful.");
            println!();
            println!("Note: In a full implementation, keys would be cached securely");
            println!("in the OS keychain for the duration of the session.");
            Ok(())
        }
        Err(KeyStoreError::WrongPassword) => {
            audit.log_failure(AuditEventType::LoginFailed, "Wrong password", None)?;
            bail!("Incorrect password");
        }
        Err(e) => {
            audit.log_failure(AuditEventType::LoginFailed, &e.to_string(), None)?;
            bail!("Login failed: {}", e);
        }
    }
}

/// Logout (clear cached keys).
pub fn logout() -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let audit = AuditLog::open(&dits_dir);

    // In a full implementation, this would clear keys from OS keychain
    audit.log_success(AuditEventType::Logout, None)?;

    println!("Logged out successfully.");
    println!();
    println!("Note: In a full implementation, this would clear cached keys");
    println!("from the OS keychain.");

    Ok(())
}

/// Change the keystore password.
pub fn change_password(old: Option<&str>, new: Option<&str>) -> Result<()> {
    let dits_dir = find_dits_dir()?;
    let keystore = KeyStore::new(&dits_dir);
    let audit = AuditLog::open(&dits_dir);

    if !keystore.exists() {
        bail!("Encryption not initialized. Run 'dits encrypt-init' first.");
    }

    let old_password = match old {
        Some(p) => p.to_string(),
        None => rpassword::prompt_password("Enter current password: ")
            .context("Failed to read password")?,
    };

    let new_password = match new {
        Some(p) => p.to_string(),
        None => {
            let pass = rpassword::prompt_password("Enter new password: ")
                .context("Failed to read password")?;
            let confirm = rpassword::prompt_password("Confirm new password: ")
                .context("Failed to read confirmation")?;
            if pass != confirm {
                bail!("Passwords do not match");
            }
            pass
        }
    };

    if new_password.len() < 8 {
        bail!("New password must be at least 8 characters");
    }

    println!("Changing password (this may take a moment)...");

    keystore.change_password(&old_password, &new_password, None)
        .context("Failed to change password")?;

    audit.log_success(AuditEventType::PasswordChanged, None)?;

    println!("Password changed successfully.");

    Ok(())
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

        println!("{} | {:20} | {:10} | {}",
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
        }
        None => {
            println!("{}", json);
        }
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
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_find_dits_dir_not_found() {
        // In a temp dir without .dits
        let dir = tempdir().unwrap();
        std::env::set_current_dir(dir.path()).unwrap();

        let result = find_dits_dir();
        assert!(result.is_err());
    }
}
