#!/usr/bin/perl
#
# Copyright (c) 2024 Dits Contributors
#
# Chainlint - validate test script structure and style
# Based on Git's chainlint.pl

use strict;
use warnings;

my $chainlint_file = $ENV{CHAINLINT_FILE} || "";
my $exit_code = 0;

# Read the file
open(my $fh, '<', $chainlint_file) or die "Cannot open $chainlint_file: $!";
my @lines = <$fh>;
close($fh);

# Remove trailing whitespace and newlines
chomp @lines;
s/\s+$// for @lines;

# Track state
my $in_test = 0;
my $test_depth = 0;
my $brace_depth = 0;
my $paren_depth = 0;
my $line_number = 0;

foreach my $line (@lines) {
    $line_number++;

    # Skip comments and empty lines
    next if $line =~ /^\s*(#|$)/;

    # Track braces and parentheses
    my $brace_count = ($line =~ tr/{//) - ($line =~ tr/}//);
    my $paren_count = ($line =~ tr/(//) - ($line =~ tr/)//);

    $brace_depth += $brace_count;
    $paren_depth += $paren_count;

    # Check for test_expect_success/test_expect_failure
    if ($line =~ /^\s*test_expect_(success|failure)\s/) {
        if ($in_test) {
            print STDERR "$chainlint_file:$line_number: nested test function\n";
            $exit_code = 1;
        }
        $in_test = 1;
        $test_depth = $brace_depth + $paren_depth;
    }

    # Check for test completion
    if ($in_test && $brace_depth + $paren_depth < $test_depth) {
        $in_test = 0;
    }

    # Check for && chains that span multiple lines inappropriately
    if ($line =~ /&&\s*$/ && $line !~ /\\\s*$/) {
        my $next_line = $lines[$line_number] || "";
        chomp $next_line;
        $next_line =~ s/\s+$//;

        # Allow continuation if next line starts with test_ or has proper indentation
        unless ($next_line =~ /^\s*(test_|#|$)/ ||
                ($next_line =~ /^\s+/ && $next_line !~ /^\s*echo/)) {
            print STDERR "$chainlint_file:$line_number: && chain continues on next line without proper continuation\n";
            $exit_code = 1;
        }
    }

    # Check for unescaped single quotes in test descriptions
    if ($line =~ /test_expect_(success|failure)\s+['"]([^'"]*)['"]/) {
        my $desc = $2;
        if ($desc =~ /'/) {
            print STDERR "$chainlint_file:$line_number: unescaped single quote in test description\n";
            $exit_code = 1;
        }
    }
}

# Check for unmatched braces/parentheses at end
if ($brace_depth != 0) {
    print STDERR "$chainlint_file: unmatched braces (depth: $brace_depth)\n";
    $exit_code = 1;
}

if ($paren_depth != 0) {
    print STDERR "$chainlint_file: unmatched parentheses (depth: $paren_depth)\n";
    $exit_code = 1;
}

exit $exit_code;
