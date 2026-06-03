//! UI utilities for enhanced user experience
//!
//! Provides:
//! - QR code generation for join codes
//! - Progress bars with speed and ETA
//! - Spinner for connection status

use std::io::{self, Write};
use std::time::{Duration, Instant};

/// Generate a terminal-friendly QR code for a URL
///
/// Uses Unicode block characters to render the QR code in the terminal.
/// The QR code can be scanned with any phone camera to open the share link.
pub fn generate_qr_code(url: &str) -> String {
    use qrcode::{QrCode, EcLevel};

    let code = match QrCode::with_error_correction_level(url, EcLevel::L) {
        Ok(c) => c,
        Err(_) => return String::new(),
    };

    let mut result = String::new();
    let width = code.width();
    let colors = code.to_colors();

    // Use Unicode block characters for compact display
    // Each character represents 2 rows of QR modules
    // Top block = ▀ (U+2580), Bottom block = ▄ (U+2584)
    // Full block = █ (U+2588), Empty = space

    // Add top quiet zone
    result.push_str("  ");
    for _ in 0..width + 4 {
        result.push('█');
    }
    result.push('\n');

    // Process two rows at a time
    for row in (0..width).step_by(2) {
        result.push_str("  ██"); // Left quiet zone

        for col in 0..width {
            let top = colors[row * width + col] == qrcode::Color::Dark;
            let bottom = if row + 1 < width {
                colors[(row + 1) * width + col] == qrcode::Color::Dark
            } else {
                false
            };

            // Use Unicode block characters based on top/bottom state
            // Dark = white in terminal (inverted for visibility)
            let c = match (top, bottom) {
                (false, false) => '█', // Both light -> full block (white)
                (true, false) => '▄',  // Top dark, bottom light
                (false, true) => '▀',  // Top light, bottom dark
                (true, true) => ' ',   // Both dark -> space (black)
            };
            result.push(c);
        }

        result.push_str("██\n"); // Right quiet zone
    }

    // Add bottom quiet zone
    result.push_str("  ");
    for _ in 0..width + 4 {
        result.push('█');
    }
    result.push('\n');

    result
}

/// Display the QR code with a label
pub fn print_qr_code(url: &str, label: &str) {
    let qr = generate_qr_code(url);
    if !qr.is_empty() {
        println!();
        println!("  {} Scan to connect:", label);
        println!();
        for line in qr.lines() {
            println!("  {}", line);
        }
    }
}

/// Progress bar for file transfers
pub struct TransferProgress {
    bar: indicatif::ProgressBar,
    start_time: Instant,
    total_bytes: u64,
}

impl TransferProgress {
    /// Create a new transfer progress bar
    pub fn new(total_bytes: u64, filename: &str) -> Self {
        use indicatif::{ProgressBar, ProgressStyle};

        let bar = ProgressBar::new(total_bytes);
        bar.set_style(
            ProgressStyle::default_bar()
                .template("  {spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {bytes}/{total_bytes} ({bytes_per_sec}, {eta})")
                .unwrap()
                .progress_chars("█▓▒░  ")
        );
        bar.set_message(filename.to_string());

        Self {
            bar,
            start_time: Instant::now(),
            total_bytes,
        }
    }

    /// Update progress
    pub fn update(&self, bytes_transferred: u64) {
        self.bar.set_position(bytes_transferred);
    }

    /// Increment progress by delta
    pub fn inc(&self, delta: u64) {
        self.bar.inc(delta);
    }

    /// Finish with success message
    pub fn finish_success(&self) {
        let elapsed = self.start_time.elapsed();
        let speed = if elapsed.as_secs_f64() > 0.0 {
            (self.total_bytes as f64 / elapsed.as_secs_f64()) / (1024.0 * 1024.0)
        } else {
            0.0
        };

        self.bar.finish_with_message(format!(
            "✓ Complete ({:.2} MB/s)",
            speed
        ));
    }

    /// Finish with error
    pub fn finish_error(&self, msg: &str) {
        self.bar.abandon_with_message(format!("✗ {}", msg));
    }
}

/// Multi-file transfer progress
pub struct MultiFileProgress {
    multi: indicatif::MultiProgress,
    main_bar: indicatif::ProgressBar,
    start_time: Instant,
}

impl MultiFileProgress {
    /// Create progress for multiple files
    pub fn new(total_files: u64, total_bytes: u64) -> Self {
        use indicatif::{MultiProgress, ProgressBar, ProgressStyle};

        let multi = MultiProgress::new();

        let main_bar = multi.add(ProgressBar::new(total_bytes));
        main_bar.set_style(
            ProgressStyle::default_bar()
                .template("  Total: [{bar:40.green/white}] {bytes}/{total_bytes} | {msg}")
                .unwrap()
                .progress_chars("━━─")
        );
        main_bar.set_message(format!("0/{} files", total_files));

        Self {
            multi,
            main_bar,
            start_time: Instant::now(),
        }
    }

    /// Add a file progress bar
    pub fn add_file(&self, filename: &str, size: u64) -> indicatif::ProgressBar {
        use indicatif::{ProgressBar, ProgressStyle};

        let bar = self.multi.add(ProgressBar::new(size));
        bar.set_style(
            ProgressStyle::default_bar()
                .template("    {spinner:.blue} {msg:<30} [{bar:25.cyan/blue}] {bytes}/{total_bytes}")
                .unwrap()
                .progress_chars("█▓░")
        );
        bar.set_message(truncate_filename(filename, 28));
        bar
    }

    /// Update total progress
    pub fn update_total(&self, bytes: u64, files_done: u64, total_files: u64) {
        self.main_bar.set_position(bytes);
        self.main_bar.set_message(format!("{}/{} files", files_done, total_files));
    }

    /// Finish all progress
    pub fn finish(&self) {
        let elapsed = self.start_time.elapsed();
        self.main_bar.finish_with_message(format!(
            "✓ Complete in {:.1}s",
            elapsed.as_secs_f64()
        ));
    }
}

/// Spinner for indeterminate operations
pub struct Spinner {
    spinner: indicatif::ProgressBar,
}

impl Spinner {
    /// Create a new spinner with message
    pub fn new(msg: &str) -> Self {
        use indicatif::{ProgressBar, ProgressStyle};

        let spinner = ProgressBar::new_spinner();
        spinner.set_style(
            ProgressStyle::default_spinner()
                .template("  {spinner:.cyan} {msg}")
                .unwrap()
                .tick_chars("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏")
        );
        spinner.set_message(msg.to_string());
        spinner.enable_steady_tick(Duration::from_millis(80));

        Self { spinner }
    }

    /// Update message
    pub fn set_message(&self, msg: &str) {
        self.spinner.set_message(msg.to_string());
    }

    /// Finish with success
    pub fn finish_success(&self, msg: &str) {
        self.spinner.finish_with_message(format!("✓ {}", msg));
    }

    /// Finish with error
    pub fn finish_error(&self, msg: &str) {
        self.spinner.finish_with_message(format!("✗ {}", msg));
    }
}

/// Truncate filename for display
fn truncate_filename(name: &str, max_len: usize) -> String {
    if name.len() <= max_len {
        name.to_string()
    } else {
        let half = (max_len - 3) / 2;
        format!("{}...{}", &name[..half], &name[name.len()-half..])
    }
}

/// Format bytes as human readable
pub fn format_bytes(bytes: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;

    if bytes >= GB {
        format!("{:.2} GB", bytes as f64 / GB as f64)
    } else if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.2} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

/// Format duration as human readable
pub fn format_duration(duration: Duration) -> String {
    let secs = duration.as_secs();
    if secs >= 3600 {
        format!("{}h {}m", secs / 3600, (secs % 3600) / 60)
    } else if secs >= 60 {
        format!("{}m {}s", secs / 60, secs % 60)
    } else {
        format!("{}s", secs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(0), "0 B");
        assert_eq!(format_bytes(500), "500 B");
        assert_eq!(format_bytes(1024), "1.00 KB");
        assert_eq!(format_bytes(1024 * 1024), "1.00 MB");
        assert_eq!(format_bytes(1024 * 1024 * 1024), "1.00 GB");
    }

    #[test]
    fn test_truncate_filename() {
        assert_eq!(truncate_filename("short.txt", 20), "short.txt");
        // With max_len=15: half=(15-3)/2=6, so "verylo" + "..." + "me.txt" = 15 chars
        assert_eq!(truncate_filename("verylongfilename.txt", 15), "verylo...me.txt");
    }

    #[test]
    fn test_qr_generation() {
        let qr = generate_qr_code("https://dits.byronwade.com/j/ABC-123");
        assert!(!qr.is_empty());
        assert!(qr.contains('█')); // Contains block characters
    }
}
