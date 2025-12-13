#!/usr/bin/perl
#
# Copyright (c) 2024 Dits Contributors
#
# Chainlint file concatenation tool
# Based on Git's chainlint-cat.pl

use strict;
use warnings;

my $file = shift @ARGV;
open(my $fh, '<', $file) or die "Cannot open $file: $!";

my @lines;
while (<$fh>) {
    chomp;
    s/\s+$//;  # Remove trailing whitespace
    push @lines, $_;
}

close($fh);

# Simple concatenation for now
print join("\n", @lines), "\n";
