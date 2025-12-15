# Dits Fish Completion
# Add this to your ~/.config/fish/completions/dits.fish

function __dits_branches
    command dits branch 2>/dev/null | string replace -r '^\* ' '' | string trim
end

function __dits_tags
    command dits tag -l 2>/dev/null
end

function __dits_remotes
    command dits remote 2>/dev/null
end

function __dits_refs
    __dits_branches
    __dits_tags
end

function __dits_files
    # Only complete files that are tracked or modified
    set -l files (command dits status --porcelain 2>/dev/null | string replace -r '^..' '')
    printf '%s\n' $files
end

# Main completion
complete -c dits -f

# Commands
complete -c dits -n '__fish_is_first_arg' -a 'init' -d 'Initialize a new repository'
complete -c dits -n '__fish_is_first_arg' -a 'add' -d 'Add files to staging'
complete -c dits -n '__fish_is_first_arg' -a 'commit' -d 'Record changes to the repository'
complete -c dits -n '__fish_is_first_arg' -a 'status' -d 'Show the working tree status'
complete -c dits -n '__fish_is_first_arg' -a 'log' -d 'Show commit logs'
complete -c dits -n '__fish_is_first_arg' -a 'show' -d 'Show various types of objects'
complete -c dits -n '__fish_is_first_arg' -a 'diff' -d 'Show changes between commits'
complete -c dits -n '__fish_is_first_arg' -a 'branch' -d 'List, create, or delete branches'
complete -c dits -n '__fish_is_first_arg' -a 'switch' -d 'Switch branches'
complete -c dits -n '__fish_is_first_arg' -a 'merge' -d 'Join two or more development histories'
complete -c dits -n '__fish_is_first_arg' -a 'tag' -d 'Create, list, delete or verify tags'
complete -c dits -n '__fish_is_first_arg' -a 'reset' -d 'Reset current HEAD to the specified state'
complete -c dits -n '__fish_is_first_arg' -a 'restore' -d 'Restore working tree files'
complete -c dits -n '__fish_is_first_arg' -a 'stash' -d 'Stash the changes in a dirty working directory'
complete -c dits -n '__fish_is_first_arg' -a 'clone' -d 'Clone a repository'
complete -c dits -n '__fish_is_first_arg' -a 'push' -d 'Update remote refs'
complete -c dits -n '__fish_is_first_arg' -a 'pull' -d 'Fetch from and integrate with another repository'
complete -c dits -n '__fish_is_first_arg' -a 'fetch' -d 'Download objects and refs from another repository'
complete -c dits -n '__fish_is_first_arg' -a 'remote' -d 'Manage set of tracked repositories'
complete -c dits -n '__fish_is_first_arg' -a 'config' -d 'Get and set repository or global options'
complete -c dits -n '__fish_is_first_arg' -a 'mount' -d 'Mount repository as virtual filesystem'
complete -c dits -n '__fish_is_first_arg' -a 'unmount' -d 'Unmount virtual filesystem'
complete -c dits -n '__fish_is_first_arg' -a 'fsck' -d 'Verify the connectivity and validity of objects'
complete -c dits -n '__fish_is_first_arg' -a 'gc' -d 'Cleanup unnecessary files and optimize the local repository'
complete -c dits -n '__fish_is_first_arg' -a 'clean' -d 'Remove untracked files from the working tree'
complete -c dits -n '__fish_is_first_arg' -a 'help' -d 'Display help information'

# Global options
complete -c dits -s h -l help -d 'Display help information'
complete -c dits -s v -l version -d 'Display version information'

# init command
complete -c dits -n '__fish_seen_subcommand_from init' -F -d 'Directory to initialize'

# add command
complete -c dits -n '__fish_seen_subcommand_from add' -F -d 'Files to add'

# commit command
complete -c dits -n '__fish_seen_subcommand_from commit' -s m -l message -d 'Use given message as commit message'
complete -c dits -n '__fish_seen_subcommand_from commit' -s a -l all -d 'Commit all changed files'
complete -c dits -n '__fish_seen_subcommand_from commit' -l amend -d 'Amend previous commit'
complete -c dits -n '__fish_seen_subcommand_from commit' -F -d 'Files to commit'

# log command
complete -c dits -n '__fish_seen_subcommand_from log' -l oneline -d 'Condense log output'
complete -c dits -n '__fish_seen_subcommand_from log' -l graph -d 'Draw commit graph'
complete -c dits -n '__fish_seen_subcommand_from log' -l decorate -d 'Show ref names'
complete -c dits -n '__fish_seen_subcommand_from log' -l all -d 'Show all branches'
complete -c dits -n '__fish_seen_subcommand_from log' -l since -d 'Show commits since date'
complete -c dits -n '__fish_seen_subcommand_from log' -l until -d 'Show commits until date'
complete -c dits -n '__fish_seen_subcommand_from log' -l author -d 'Show commits by author'
complete -c dits -n '__fish_seen_subcommand_from log' -l grep -d 'Show commits with log message matching pattern'
complete -c dits -n '__fish_seen_subcommand_from log' -s n -d 'Limit number of commits'
complete -c dits -n '__fish_seen_subcommand_from log' -l follow -d 'Continue listing file history beyond renames'
complete -c dits -n '__fish_seen_subcommand_from log' -s p -d 'Show patch'

# show command
complete -c dits -n '__fish_seen_subcommand_from show' -l format -d 'Pretty-print with given format'
complete -c dits -n '__fish_seen_subcommand_from show' -l abbrev-commit -d 'Show only partial hashes'
complete -c dits -n '__fish_seen_subcommand_from show' -l oneline -d 'Show each commit on a single line'
complete -c dits -n '__fish_seen_subcommand_from show' -a '(__dits_refs)' -d 'Commit, branch, or tag to show'

# diff command
complete -c dits -n '__fish_seen_subcommand_from diff' -l cached -d 'Show diff of staged changes'
complete -c dits -n '__fish_seen_subcommand_from diff' -l name-only -d 'Show only names of changed files'
complete -c dits -n '__fish_seen_subcommand_from diff' -l name-status -d 'Show names and status of changed files'
complete -c dits -n '__fish_seen_subcommand_from diff' -s p -d 'Show patch'
complete -c dits -n '__fish_seen_subcommand_from diff' -l stat -d 'Show diffstat'
complete -c dits -n '__fish_seen_subcommand_from diff' -l word-diff -d 'Show word diff'
complete -c dits -n '__fish_seen_subcommand_from diff' -a '(__dits_refs)' -d 'Reference to compare against'

# branch command
complete -c dits -n '__fish_seen_subcommand_from branch' -s d -l delete -d 'Delete branch'
complete -c dits -n '__fish_seen_subcommand_from branch' -s m -l move -d 'Move/rename branch'
complete -c dits -n '__fish_seen_subcommand_from branch' -s l -l list -d 'List branches'
complete -c dits -n '__fish_seen_subcommand_from branch' -s a -l all -d 'List all branches'
complete -c dits -n '__fish_seen_subcommand_from branch' -s r -l remotes -d 'List remote branches'
complete -c dits -n '__fish_seen_subcommand_from branch' -a '(__dits_branches)' -d 'Branch name'

# switch command
complete -c dits -n '__fish_seen_subcommand_from switch' -s c -l create -d 'Create and switch to branch'
complete -c dits -n '__fish_seen_subcommand_from switch' -s d -l detach -d 'Detach HEAD'
complete -c dits -n '__fish_seen_subcommand_from switch' -a '(__dits_refs)' -d 'Branch or commit to switch to'

# merge command
complete -c dits -n '__fish_seen_subcommand_from merge' -l no-ff -d 'Create merge commit even for fast-forward'
complete -c dits -n '__fish_seen_subcommand_from merge' -l ff-only -d 'Refuse to merge unless it can be fast-forwarded'
complete -c dits -n '__fish_seen_subcommand_from merge' -l squash -d 'Create single commit instead of merge commit'
complete -c dits -n '__fish_seen_subcommand_from merge' -l abort -d 'Abort the current merge operation'
complete -c dits -n '__fish_seen_subcommand_from merge' -a '(__dits_refs)' -d 'Branch or commit to merge'

# tag command
complete -c dits -n '__fish_seen_subcommand_from tag' -s l -l list -d 'List tags'
complete -c dits -n '__fish_seen_subcommand_from tag' -s d -l delete -d 'Delete tag'
complete -c dits -n '__fish_seen_subcommand_from tag' -s a -l annotate -d 'Create annotated tag'
complete -c dits -n '__fish_seen_subcommand_from tag' -s m -l message -d 'Use given tag message'
complete -c dits -n '__fish_seen_subcommand_from tag' -a '(__dits_tags)' -d 'Tag name'

# reset command
complete -c dits -n '__fish_seen_subcommand_from reset' -l soft -d 'Reset index but not working tree'
complete -c dits -n '__fish_seen_subcommand_from reset' -l mixed -d 'Reset index but not working tree (default)'
complete -c dits -n '__fish_seen_subcommand_from reset' -l hard -d 'Reset index and working tree'
complete -c dits -n '__fish_seen_subcommand_from reset' -a '(__dits_refs)' -d 'Reference to reset to'

# restore command
complete -c dits -n '__fish_seen_subcommand_from restore' -s s -l source -d 'Restore from given commit'
complete -c dits -n '__fish_seen_subcommand_from restore' -l staged -d 'Restore staged files'
complete -c dits -n '__fish_seen_subcommand_from restore' -l worktree -d 'Restore working tree files'
complete -c dits -n '__fish_seen_subcommand_from restore' -a '(__dits_refs)' -d 'Source reference'
complete -c dits -n '__fish_seen_subcommand_from restore' -F -d 'Files to restore'

# stash command
complete -c dits -n '__fish_seen_subcommand_from stash' -a 'push pop apply drop create list show clear' -d 'Stash operation'

# clone command
complete -c dits -n '__fish_seen_subcommand_from clone' -l depth -d 'Create shallow clone'
complete -c dits -n '__fish_seen_subcommand_from clone' -l branch -d 'Checkout given branch'
complete -c dits -n '__fish_seen_subcommand_from clone' -l bare -d 'Create bare repository'

# push command
complete -c dits -n '__fish_seen_subcommand_from push' -l all -d 'Push all branches'
complete -c dits -n '__fish_seen_subcommand_from push' -l tags -d 'Push tags'
complete -c dits -n '__fish_seen_subcommand_from push' -l force -d 'Force push'
complete -c dits -n '__fish_seen_subcommand_from push' -l dry-run -d 'Show what would be pushed'
complete -c dits -n '__fish_seen_subcommand_from push' -a '(__dits_remotes)' -d 'Remote to push to'

# pull command
complete -c dits -n '__fish_seen_subcommand_from pull' -l rebase -d 'Rebase instead of merge'
complete -c dits -n '__fish_seen_subcommand_from pull' -l no-rebase -d 'Merge instead of rebase'
complete -c dits -n '__fish_seen_subcommand_from pull' -a '(__dits_remotes)' -d 'Remote to pull from'

# remote command
complete -c dits -n '__fish_seen_subcommand_from remote' -a 'add rm remove set-head set-branches get-url set-url show prune update' -d 'Remote operation'
complete -c dits -n '__fish_seen_subcommand_from remote' -a '(__dits_remotes)' -d 'Remote name'

# config command
complete -c dits -n '__fish_seen_subcommand_from config' -l global -d 'Use global config'
complete -c dits -n '__fish_seen_subcommand_from config' -l local -d 'Use local config'
complete -c dits -n '__fish_seen_subcommand_from config' -l list -d 'List all config'
complete -c dits -n '__fish_seen_subcommand_from config' -a 'user.name user.email core.editor core.pager merge.tool diff.tool color.ui credential.helper http.proxy https.proxy remote.origin.url remote.origin.fetch branch.master.remote branch.master.merge' -d 'Config key'

# mount command
complete -c dits -n '__fish_seen_subcommand_from mount' -l background -d 'Run in background'
complete -c dits -n '__fish_seen_subcommand_from mount' -l read-only -d 'Mount read-only'
complete -c dits -n '__fish_seen_subcommand_from mount' -F -d 'Mount point directory'

# fsck command
complete -c dits -n '__fish_seen_subcommand_from fsck' -l full -d 'Do full check'
complete -c dits -n '__fish_seen_subcommand_from fsck' -l strict -d 'Do strict checking'
complete -c dits -n '__fish_seen_subcommand_from fsck' -l lost-found -d 'Write dangling objects to .dits/lost-found'

# help command
complete -c dits -n '__fish_seen_subcommand_from help' -a '(dits --help | string match -r "^\s+\w+" | string trim)' -d 'Command to get help for'



