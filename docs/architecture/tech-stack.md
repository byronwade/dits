# Tech Stack (Rust Ecosystem)

| Component | Library/Tool | Rationale |
| :--- | :--- | :--- |
| Core Language | Rust | Memory safety, zero-GC, strong concurrency. |
| CLI Framework | `clap` | Standard, type-safe CLI parsing. |
| Chunking Engine | `fastcdc` | State-of-the-art rolling hash chunking. |
| Hashing Algorithm | `blake3` | Fast, parallelizable hashing. |
| Container Parsing | `mp4`, `isolang` | Safe manipulation of MP4 atoms. |
| Video Inspection | `ffmpeg-next` | Detect keyframes (I-Frames) for smart cuts. |
| Local Database | `sled` | Embedded, high-performance KV store. |
| Virtual FS | `fuser` (Unix) / `dokany` (Win) | Mount repo as a virtual drive. |
| Network Transport | `quinn` (QUIC) | UDP-based transfer to maximize bandwidth. |
| GUI (Future) | Tauri | Lightweight React + Rust desktop UI. |


