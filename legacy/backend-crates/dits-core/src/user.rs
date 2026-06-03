//! User and author types.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A user in the Dits system.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct User {
    /// Unique user ID.
    pub id: Uuid,
    /// Display name.
    pub name: String,
    /// Email address.
    pub email: String,
}

impl User {
    /// Create a new user.
    pub fn new(name: impl Into<String>, email: impl Into<String>) -> Self {
        Self {
            id: Uuid::new_v4(),
            name: name.into(),
            email: email.into(),
        }
    }

    /// Create a user with a specific ID.
    pub fn with_id(id: Uuid, name: impl Into<String>, email: impl Into<String>) -> Self {
        Self {
            id,
            name: name.into(),
            email: email.into(),
        }
    }
}

/// An author (for commits).
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Author {
    /// Display name.
    pub name: String,
    /// Email address.
    pub email: String,
}

impl Author {
    /// Create a new author.
    pub fn new(name: impl Into<String>, email: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            email: email.into(),
        }
    }

    /// Format as "Name <email>" string.
    pub fn to_string_with_email(&self) -> String {
        format!("{} <{}>", self.name, self.email)
    }
}

impl From<User> for Author {
    fn from(user: User) -> Self {
        Self {
            name: user.name,
            email: user.email,
        }
    }
}

impl From<&User> for Author {
    fn from(user: &User) -> Self {
        Self {
            name: user.name.clone(),
            email: user.email.clone(),
        }
    }
}

/// Full user profile information.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserProfile {
    /// User ID.
    pub id: Uuid,
    /// Username (unique).
    pub username: String,
    /// Display name.
    pub name: String,
    /// Email address.
    pub email: String,
    /// Avatar URL.
    pub avatar_url: Option<String>,
    /// User bio.
    pub bio: Option<String>,
    /// User's website.
    pub website: Option<String>,
    /// When the account was created.
    pub created_at: DateTime<Utc>,
    /// When the profile was last updated.
    pub updated_at: DateTime<Utc>,
}

/// An organization.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Organization {
    /// Organization ID.
    pub id: Uuid,
    /// Organization name (unique).
    pub name: String,
    /// Display name.
    pub display_name: String,
    /// Description.
    pub description: Option<String>,
    /// Avatar URL.
    pub avatar_url: Option<String>,
    /// When the org was created.
    pub created_at: DateTime<Utc>,
}

/// Member role in an organization.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrgRole {
    /// Full admin access.
    Owner,
    /// Can manage members and settings.
    Admin,
    /// Can read and write repositories.
    Member,
    /// Can only read repositories.
    Reader,
}

impl OrgRole {
    /// Check if this role can manage members.
    pub fn can_manage_members(&self) -> bool {
        matches!(self, OrgRole::Owner | OrgRole::Admin)
    }

    /// Check if this role can write to repositories.
    pub fn can_write(&self) -> bool {
        matches!(self, OrgRole::Owner | OrgRole::Admin | OrgRole::Member)
    }

    /// Check if this role can delete the organization.
    pub fn can_delete_org(&self) -> bool {
        matches!(self, OrgRole::Owner)
    }
}

/// Repository permissions.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RepoPermission {
    /// Can read repository.
    Read,
    /// Can read and write.
    Write,
    /// Full admin access.
    Admin,
}

impl RepoPermission {
    /// Check if this permission allows writing.
    pub fn can_write(&self) -> bool {
        matches!(self, RepoPermission::Write | RepoPermission::Admin)
    }

    /// Check if this permission allows admin operations.
    pub fn can_admin(&self) -> bool {
        matches!(self, RepoPermission::Admin)
    }
}

/// A team within an organization.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Team {
    /// Team ID.
    pub id: Uuid,
    /// Organization ID.
    pub org_id: Uuid,
    /// Team name.
    pub name: String,
    /// Team description.
    pub description: Option<String>,
    /// Default permission for team members.
    pub default_permission: RepoPermission,
    /// When the team was created.
    pub created_at: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_new() {
        let user = User::new("John Doe", "john@example.com");
        assert_eq!(user.name, "John Doe");
        assert_eq!(user.email, "john@example.com");
    }

    #[test]
    fn test_author_format() {
        let author = Author::new("Jane Doe", "jane@example.com");
        assert_eq!(author.to_string_with_email(), "Jane Doe <jane@example.com>");
    }

    #[test]
    fn test_author_from_user() {
        let user = User::new("Test User", "test@example.com");
        let author: Author = user.into();
        assert_eq!(author.name, "Test User");
        assert_eq!(author.email, "test@example.com");
    }

    #[test]
    fn test_org_role_permissions() {
        assert!(OrgRole::Owner.can_manage_members());
        assert!(OrgRole::Admin.can_manage_members());
        assert!(!OrgRole::Member.can_manage_members());
        assert!(!OrgRole::Reader.can_manage_members());

        assert!(OrgRole::Owner.can_delete_org());
        assert!(!OrgRole::Admin.can_delete_org());
    }

    #[test]
    fn test_repo_permission() {
        assert!(!RepoPermission::Read.can_write());
        assert!(RepoPermission::Write.can_write());
        assert!(RepoPermission::Admin.can_write());
        assert!(RepoPermission::Admin.can_admin());
        assert!(!RepoPermission::Write.can_admin());
    }
}
