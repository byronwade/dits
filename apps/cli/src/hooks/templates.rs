//! Sample hook templates.

use super::HookType;

/// Get sample hook script for a given hook type
pub fn get_sample_hook(hook_type: HookType) -> &'static str {
    match hook_type {
        HookType::PreCommit => PRE_COMMIT_SAMPLE,
        HookType::PrepareCommitMsg => PREPARE_COMMIT_MSG_SAMPLE,
        HookType::CommitMsg => COMMIT_MSG_SAMPLE,
        HookType::PostCommit => POST_COMMIT_SAMPLE,
        HookType::PrePush => PRE_PUSH_SAMPLE,
        HookType::PostMerge => POST_MERGE_SAMPLE,
        HookType::PreCheckout => PRE_CHECKOUT_SAMPLE,
        HookType::PostCheckout => POST_CHECKOUT_SAMPLE,
        HookType::PreRebase => PRE_REBASE_SAMPLE,
        HookType::PostRebase => POST_REBASE_SAMPLE,
        HookType::PreAutoGc => PRE_AUTO_GC_SAMPLE,
        HookType::PostRewrite => POST_REWRITE_SAMPLE,
    }
}

const PRE_COMMIT_SAMPLE: &str = r#"#!/bin/sh
#
# Pre-commit hook - runs before each commit
#
# This hook can be used to:
# - Run linters and formatters
# - Run tests
# - Check for debug statements
# - Validate file sizes
#
# Exit with non-zero to abort the commit.

# Example: Check for TODO/FIXME comments
if git diff --cached --name-only | xargs grep -l 'TODO\|FIXME' 2>/dev/null; then
    echo "Warning: You have TODO/FIXME comments in staged files"
    # Uncomment to make this a hard failure:
    # exit 1
fi

# Example: Run formatter check
# cargo fmt --check || exit 1

# Example: Run linter
# cargo clippy -- -D warnings || exit 1

exit 0
"#;

const PREPARE_COMMIT_MSG_SAMPLE: &str = r#"#!/bin/sh
#
# Prepare-commit-msg hook - prepares the commit message
#
# Arguments:
#   $1 - Path to commit message file
#   $2 - Source of commit message (message, template, merge, squash, commit)
#   $3 - Commit SHA (when amending)
#
# This hook can be used to:
# - Add issue numbers from branch name
# - Add prefix based on file types changed
# - Format the commit message

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2
SHA1=$3

# Example: Add branch name as prefix
BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ -n "$BRANCH" ] && [ "$COMMIT_SOURCE" = "message" ]; then
    # Extract issue number from branch name (e.g., feature/ISSUE-123-description)
    ISSUE=$(echo "$BRANCH" | grep -oE '[A-Z]+-[0-9]+' | head -1)
    if [ -n "$ISSUE" ]; then
        sed -i.bak -e "1s/^/[$ISSUE] /" "$COMMIT_MSG_FILE"
    fi
fi

exit 0
"#;

const COMMIT_MSG_SAMPLE: &str = r#"#!/bin/sh
#
# Commit-msg hook - validates the commit message
#
# Arguments:
#   $1 - Path to commit message file
#
# Exit with non-zero to reject the commit.

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Example: Check minimum message length
MSG_LENGTH=$(echo "$COMMIT_MSG" | head -1 | wc -c)
if [ "$MSG_LENGTH" -lt 10 ]; then
    echo "Error: Commit message must be at least 10 characters"
    exit 1
fi

# Example: Enforce conventional commits format
# if ! echo "$COMMIT_MSG" | grep -qE '^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+'; then
#     echo "Error: Commit message must follow Conventional Commits format"
#     echo "Example: feat(cli): add new command"
#     exit 1
# fi

exit 0
"#;

const POST_COMMIT_SAMPLE: &str = r#"#!/bin/sh
#
# Post-commit hook - runs after a commit is created
#
# This hook can be used to:
# - Send notifications
# - Update external systems
# - Generate documentation

# Example: Show commit summary
echo "Committed: $(git log -1 --pretty=format:'%h %s')"

# Example: Notify via webhook
# curl -X POST -H 'Content-Type: application/json' \
#   -d '{"text":"New commit: '"$(git log -1 --pretty=format:'%s')"'"}' \
#   https://hooks.example.com/notify

exit 0
"#;

const PRE_PUSH_SAMPLE: &str = r#"#!/bin/sh
#
# Pre-push hook - runs before pushing to remote
#
# Arguments (via stdin):
#   <local ref> <local sha> <remote ref> <remote sha>
#
# Exit with non-zero to abort the push.

# Example: Run tests before pushing
# cargo test || exit 1

# Example: Prevent force push to protected branches
protected_branches='main master'
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

for branch in $protected_branches; do
    if [ "$current_branch" = "$branch" ]; then
        if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
            echo "Error: Force pushing to $branch is not allowed"
            exit 1
        fi
    fi
done

exit 0
"#;

const POST_MERGE_SAMPLE: &str = r#"#!/bin/sh
#
# Post-merge hook - runs after a merge is completed
#
# Arguments:
#   $1 - Flag indicating if it was a squash merge
#
# This hook can be used to:
# - Install dependencies if package files changed
# - Rebuild if build config changed
# - Notify team

SQUASH=$1

# Example: Check if dependencies changed
CHANGED_FILES=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)

if echo "$CHANGED_FILES" | grep -q 'Cargo.toml\|Cargo.lock'; then
    echo "Dependencies changed, consider running: cargo build"
fi

if echo "$CHANGED_FILES" | grep -q 'package.json\|package-lock.json'; then
    echo "Dependencies changed, consider running: npm install"
fi

exit 0
"#;

const PRE_CHECKOUT_SAMPLE: &str = r#"#!/bin/sh
#
# Pre-checkout hook - runs before checkout
#
# Arguments:
#   $1 - Ref of previous HEAD
#   $2 - Ref of new HEAD
#   $3 - Flag (1 = branch checkout, 0 = file checkout)
#
# Exit with non-zero to abort the checkout.

exit 0
"#;

const POST_CHECKOUT_SAMPLE: &str = r#"#!/bin/sh
#
# Post-checkout hook - runs after checkout
#
# Arguments:
#   $1 - Ref of previous HEAD
#   $2 - Ref of new HEAD
#   $3 - Flag (1 = branch checkout, 0 = file checkout)

PREV_HEAD=$1
NEW_HEAD=$2
CHECKOUT_TYPE=$3

if [ "$CHECKOUT_TYPE" = "1" ]; then
    # Branch checkout
    echo "Switched branches"
    
    # Example: Check if dependencies changed
    if git diff "$PREV_HEAD" "$NEW_HEAD" --name-only | grep -q 'Cargo.toml'; then
        echo "Cargo.toml changed, consider running: cargo build"
    fi
fi

exit 0
"#;

const PRE_REBASE_SAMPLE: &str = r#"#!/bin/sh
#
# Pre-rebase hook - runs before rebase starts
#
# Arguments:
#   $1 - Upstream branch
#   $2 - Branch being rebased (or empty if current)
#
# Exit with non-zero to abort the rebase.

UPSTREAM=$1
BRANCH=$2

# Example: Prevent rebasing published branches
published_branches='main master release'
current_branch=${BRANCH:-$(git symbolic-ref --short HEAD)}

for branch in $published_branches; do
    if [ "$current_branch" = "$branch" ]; then
        echo "Error: Cannot rebase the $branch branch"
        exit 1
    fi
done

exit 0
"#;

const POST_REBASE_SAMPLE: &str = r#"#!/bin/sh
#
# Post-rebase hook - runs after rebase completes
#
# This hook can be used to:
# - Rebuild project
# - Notify about history changes

echo "Rebase completed successfully"

exit 0
"#;

const PRE_AUTO_GC_SAMPLE: &str = r#"#!/bin/sh
#
# Pre-auto-gc hook - runs before automatic garbage collection
#
# Exit with non-zero to prevent GC.

# Example: Check for low disk space
SPACE=$(df -P . | tail -1 | awk '{print $4}')
if [ "$SPACE" -lt 1048576 ]; then  # Less than 1GB
    echo "Warning: Low disk space, skipping GC"
    exit 1
fi

exit 0
"#;

const POST_REWRITE_SAMPLE: &str = r#"#!/bin/sh
#
# Post-rewrite hook - runs after history is rewritten
#
# Arguments:
#   $1 - Command that triggered rewrite (rebase, amend)
#
# Stdin contains: <old sha> <new sha>

COMMAND=$1

echo "History rewritten by: $COMMAND"

# Example: Update related systems with new SHAs
# while read old_sha new_sha; do
#     echo "  $old_sha -> $new_sha"
# done

exit 0
"#;
