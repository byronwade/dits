use tempfile::tempdir;

use super::*;

#[test]
fn test_create_and_load() {
    let dir = tempdir().unwrap();
    let keystore = KeyStore::new(dir.path());

    // Create keystore
    let bundle1 = keystore
        .create("test-password", Some(&Argon2Params::fast()))
        .unwrap();

    // Load keystore
    let bundle2 = keystore.load("test-password").unwrap();

    // Keys should match
    assert_eq!(bundle1.user_secret.as_bytes(), bundle2.user_secret.as_bytes());
    assert_eq!(bundle1.metadata_key, bundle2.metadata_key);
    assert_eq!(bundle1.recovery_key, bundle2.recovery_key);
}

#[test]
fn test_wrong_password() {
    let dir = tempdir().unwrap();
    let keystore = KeyStore::new(dir.path());

    keystore
        .create("correct-password", Some(&Argon2Params::fast()))
        .unwrap();

    let result = keystore.load("wrong-password");
    assert!(matches!(result, Err(KeyStoreError::WrongPassword)));
}

#[test]
fn test_already_exists() {
    let dir = tempdir().unwrap();
    let keystore = KeyStore::new(dir.path());

    keystore
        .create("password", Some(&Argon2Params::fast()))
        .unwrap();

    let result = keystore.create("password", Some(&Argon2Params::fast()));
    assert!(matches!(result, Err(KeyStoreError::AlreadyExists)));
}

#[test]
fn test_change_password() {
    let dir = tempdir().unwrap();
    let keystore = KeyStore::new(dir.path());

    let bundle1 = keystore
        .create("old-password", Some(&Argon2Params::fast()))
        .unwrap();

    keystore
        .change_password("old-password", "new-password", Some(&Argon2Params::fast()))
        .unwrap();

    // Old password should fail
    let result = keystore.load("old-password");
    assert!(matches!(result, Err(KeyStoreError::WrongPassword)));

    // New password should work and keys should be the same
    let bundle2 = keystore.load("new-password").unwrap();
    assert_eq!(bundle1.user_secret.as_bytes(), bundle2.user_secret.as_bytes());
}

#[test]
fn test_delete() {
    let dir = tempdir().unwrap();
    let keystore = KeyStore::new(dir.path());

    keystore
        .create("password", Some(&Argon2Params::fast()))
        .unwrap();
    assert!(keystore.exists());

    keystore.delete().unwrap();
    assert!(!keystore.exists());
}
