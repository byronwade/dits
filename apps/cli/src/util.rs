//! Common utilities for formatting and display.

/// Format bytes as human-readable string with consistent formatting.
/// Uses 2 decimal places for MB/GB, 0 for KB/bytes for consistency.
pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.2} TB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.0} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

/// Format bytes as human-readable string with short units (GiB, MiB, etc.)
/// Used for storage stats where binary units are preferred.
pub fn format_bytes_short(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    const TB: u64 = GB * 1024;

    if bytes >= TB {
        format!("{:.1} TiB", bytes as f64 / TB as f64)
    } else if bytes >= GB {
        format!("{:.1} GiB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.1} MiB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KiB", bytes as f64 / KB as f64)
    } else {
        format!("{} bytes", bytes)
    }
}

/// Format percentage with consistent precision.
pub fn format_percentage(value: f64) -> String {
    format!("{:.1}%", value)
}

/// Safely calculate percentage to avoid division by zero.
pub fn safe_percentage(numerator: u64, denominator: u64) -> f64 {
    if denominator == 0 {
        0.0
    } else {
        (numerator as f64 / denominator as f64) * 100.0
    }
}

/// Format file size change with clear before/after display.
/// Shows: "37.9 MB → 28.0 MB (-9.9 MB)"
pub fn format_size_change(current_size: u64, previous_size: u64) -> String {
    let current = format_bytes(current_size);
    let previous = format_bytes(previous_size);

    if current_size > previous_size {
        let diff = format_bytes(current_size - previous_size);
        format!("{} → {} (+{})", previous, current, diff)
    } else if current_size < previous_size {
        let diff = format_bytes(previous_size - current_size);
        format!("{} → {} (-{})", previous, current, diff)
    } else {
        format!("{} (unchanged)", current)
    }
}

/// Format file size change as a simple diff (for compact displays).
/// Shows: "+1.2 MB" or "-5.7 MB" or "~"
pub fn format_size_diff(current_size: u64, previous_size: u64) -> String {
    if current_size > previous_size {
        format!("+{}", format_bytes(current_size - previous_size))
    } else if current_size < previous_size {
        format!("-{}", format_bytes(previous_size - current_size))
    } else {
        "~".to_string()
    }
}