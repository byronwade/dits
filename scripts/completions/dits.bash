#!/bin/bash

# Dits Bash Completion
# Add this to your ~/.bashrc or ~/.bash_profile:
# source /path/to/dits.bash

_dits() {
    local cur prev words cword
    _init_completion -s || return

    local commands=(
        "init"
        "add"
        "commit"
        "status"
        "log"
        "show"
        "diff"
        "branch"
        "switch"
        "merge"
        "tag"
        "reset"
        "restore"
        "stash"
        "clone"
        "push"
        "pull"
        "fetch"
        "remote"
        "config"
        "mount"
        "unmount"
        "fsck"
        "gc"
        "clean"
        "help"
        "--version"
        "--help"
    )

    local config_keys=(
        "user.name"
        "user.email"
        "core.editor"
        "core.pager"
        "merge.tool"
        "diff.tool"
        "color.ui"
        "credential.helper"
        "http.proxy"
        "https.proxy"
        "remote.origin.url"
        "remote.origin.fetch"
        "branch.master.remote"
        "branch.master.merge"
    )

    case $prev in
        init)
            _filedir -d
            return
            ;;
        add)
            _filedir
            return
            ;;
        commit)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "-m --message -a --all --amend --no-edit --reset-author" -- "$cur"))
                    ;;
                *)
                    # File completion for specific files
                    _filedir
                    ;;
            esac
            return
            ;;
        log)
            COMPREPLY=($(compgen -W "--oneline --graph --decorate --all --since --until --author --grep --follow -p --patch -S --pickaxe-regex -G --grep --grep-reflog --merges --no-merges -n --max-count --skip --pretty --format --abbrev-commit --no-abbrev-commit --abbrev --relative-date --date --name-only --name-status --reverse --topo-order --date-order --author-date-order" -- "$cur"))
            return
            ;;
        show)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--format --abbrev-commit --oneline --name-only --name-status" -- "$cur"))
                    ;;
                *)
                    # Commit/branch/tag completion
                    __dits_refs
                    ;;
            esac
            return
            ;;
        diff)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--cached --staged --no-index --name-only --name-status -p --patch -u --unified --raw --patch-with-raw --minimal --patience --histogram --diff-algorithm --stat --numstat --shortstat --dirstat --summary --patch-with-stat --z --word-diff --word-diff-regex --color --no-color --color-words --color-moved --ignore-space-at-eol --ignore-space-change --ignore-all-space --ignore-blank-lines --ignore-cr-at-eol --textconv --no-textconv --ignore-submodules --src-prefix --dst-prefix" -- "$cur"))
                    ;;
                *)
                    # File completion or refs
                    if [[ $cword -eq 2 ]]; then
                        __dits_refs
                    else
                        _filedir
                    fi
                    ;;
            esac
            return
            ;;
        branch)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "-d --delete -D --delete-force -m --move -M --move-force -c --copy -C --copy-force -l --list -a --all -r --remotes --contains --no-contains --merged --no-merged --column --no-column --sort --points-at --format" -- "$cur"))
                    ;;
                *)
                    # Branch name completion or existing branches
                    __dits_branches
                    ;;
            esac
            return
            ;;
        switch)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "-c --create -C --create-force -d --detach --guess --ignore-other-worktrees --orphan --track --no-track --force-create" -- "$cur"))
                    ;;
                *)
                    __dits_branches_and_refs
                    ;;
            esac
            return
            ;;
        merge)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--commit --no-commit --edit --no-edit --ff --no-ff --ff-only --log --no-log --stat --no-stat --squash --no-squash --ff-only --verify-signatures --no-verify-signatures --quiet --verbose --progress --no-progress -m --message --rerere-autoupdate --no-rerere-autoupdate --abort --continue --quit --cleanup --no-cleanup" -- "$cur"))
                    ;;
                *)
                    __dits_branches_and_refs
                    ;;
            esac
            return
            ;;
        tag)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "-l --list -d --delete -v --verify -a --annotate -m --message -F --file -s --sign -u --local-user --force --column --no-column --contains --no-contains --points-at --format --sort --merged --no-merged" -- "$cur"))
                    ;;
                *)
                    # Tag name completion or existing tags
                    __dits_tags
                    ;;
            esac
            return
            ;;
        reset)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--soft --mixed --hard --merge --keep --quiet" -- "$cur"))
                    ;;
                *)
                    __dits_refs
                    ;;
            esac
            return
            ;;
        restore)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "-s --source --staged --worktree -W --worktree -S --staged --quiet --progress --no-progress --ignore-unmerged --ignore-skip-worktree-bits --recurse-submodules --no-recurse-submodules --overlay --no-overlay" -- "$cur"))
                    ;;
                *)
                    _filedir
                    ;;
            esac
            return
            ;;
        stash)
            COMPREPLY=($(compgen -W "push pop apply drop create list show branch clear" -- "$cur"))
            return
            ;;
        clone)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--local --no-hardlinks --shared --reference --dissociate --quiet --verbose --progress --no-checkout --bare --mirror --origin --branch --upload-pack --template --config --depth --single-branch --no-tags --recurse-submodules --shallow-submodules --jobs" -- "$cur"))
                    ;;
                *)
                    # Repository URL completion
                    _filedir
                    ;;
            esac
            return
            ;;
        push)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--all --prune --mirror --dry-run --porcelain --delete --tags --follow-tags --signed --atomic --no-atomic --receive-pack --force-with-lease --force-if-includes --no-force-with-lease --repo --set-upstream --thin --no-thin --quiet --verbose --progress --recurse-submodules --verify --no-verify" -- "$cur"))
                    ;;
                *)
                    if [[ $cword -eq 2 ]]; then
                        __dits_remotes
                    elif [[ $cword -eq 3 ]]; then
                        __dits_branches
                    fi
                    ;;
            esac
            return
            ;;
        pull)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--quiet --verbose --progress --recurse-submodules --no-recurse-submodules --commit --no-commit --edit --no-edit --ff --no-ff --ff-only --log --no-log --stat --no-stat --squash --no-squash --no-verify --verify --cleanup --no-cleanup --signoff --no-signoff --keep --no-keep --rebase --no-rebase --autostash --no-autostash --all --append --depth --deepen --shallow --no-shallow --unshallow --update-shallow --refmap --server-option" -- "$cur"))
                    ;;
                *)
                    if [[ $cword -eq 2 ]]; then
                        __dits_remotes
                    fi
                    ;;
            esac
            return
            ;;
        remote)
            COMPREPLY=($(compgen -W "add rm remove set-head set-branches get-url set-url show prune update" -- "$cur"))
            return
            ;;
        config)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--local --global --system --worktree --file --blob --get --get-all --get-regexp --get-urlmatch --replace-all --add --unset --unset-all --rename-section --remove-section --list --fixed-value --null --bool --int --bool-or-int --path --expiry-date --type --no-type --show-origin --show-scope --get-color --get-colorbool --edit --includes --no-includes --default" -- "$cur"))
                    ;;
                *)
                    if [[ $cword -eq 2 ]]; then
                        COMPREPLY=($(compgen -W "${config_keys[*]}" -- "$cur"))
                    fi
                    ;;
            esac
            return
            ;;
        mount)
            case $cur in
                -*)
                    COMPREPLY=($(compgen -W "--background --foreground --read-only --allow-other --allow-root --debug --verbose --quiet" -- "$cur"))
                    ;;
                *)
                    _filedir -d
                    ;;
            esac
            return
            ;;
        fsck)
            COMPREPLY=($(compgen -W "--tags --root --unreachable --cache --no-reflogs --full --connectivity-only --strict --lost-found --progress --verbose" -- "$cur"))
            return
            ;;
        help)
            COMPREPLY=($(compgen -W "${commands[*]}" -- "$cur"))
            return
            ;;
    esac

    # Default completion for commands
    if [[ $cword -eq 1 ]]; then
        COMPREPLY=($(compgen -W "${commands[*]}" -- "$cur"))
    fi
}

# Helper functions for ref completion
__dits_refs() {
    local refs=""
    if command -v dits >/dev/null 2>&1; then
        refs=$(dits branch -a 2>/dev/null | sed 's/^\*//' | sed 's/^  //')
        refs="$refs $(dits tag -l 2>/dev/null)"
    fi
    COMPREPLY=($(compgen -W "$refs" -- "$cur"))
}

__dits_branches() {
    local branches=""
    if command -v dits >/dev/null 2>&1; then
        branches=$(dits branch 2>/dev/null | sed 's/^\*//' | sed 's/^  //')
    fi
    COMPREPLY=($(compgen -W "$branches" -- "$cur"))
}

__dits_branches_and_refs() {
    local refs=""
    if command -v dits >/dev/null 2>&1; then
        refs=$(dits branch -a 2>/dev/null | sed 's/^\*//' | sed 's/^  //')
        refs="$refs $(dits tag -l 2>/dev/null)"
    fi
    COMPREPLY=($(compgen -W "$refs" -- "$cur"))
}

__dits_tags() {
    local tags=""
    if command -v dits >/dev/null 2>&1; then
        tags=$(dits tag -l 2>/dev/null)
    fi
    COMPREPLY=($(compgen -W "$tags" -- "$cur"))
}

__dits_remotes() {
    local remotes=""
    if command -v dits >/dev/null 2>&1; then
        remotes=$(dits remote 2>/dev/null)
    fi
    COMPREPLY=($(compgen -W "$remotes" -- "$cur"))
}

complete -F _dits dits



