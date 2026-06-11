# Dits CLI — multi-stage Docker build.
#
# This is the supported, cross-platform way to run `dits` — including on
# Windows, where the npm package currently ships no prebuilt binary
# ("Binary not found for your platform"). It compiles the CLI from source in
# a pinned Rust toolchain and ships a small Debian runtime image.
#
#   docker build -t dits .
#   docker run --rm -v "$PWD:/data" dits init
#   docker run --rm -v "$PWD:/data" dits status
#
# Add --user "$(id -u):$(id -g)" if you want files created as your host user
# instead of root, e.g.:
#   docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/data" dits init
#
# Note: the COPY paths in the runtime stage assume linux/amd64 (x86_64).
#
# -------- Stage 1: Build --------
# Pin the toolchain so a future compiler release can't silently break the build.
FROM rust:1.94-bookworm AS builder

WORKDIR /usr/src/dits

# Copy the workspace. .dockerignore keeps target/, node_modules, the web app,
# and the quarantined legacy/ crates out of the build context.
COPY . .

# The official rust:bookworm image is built on buildpack-deps, which already
# provides the C toolchain, pkg-config, perl and libssl-dev that the dits
# dependency tree needs (git2's vendored libgit2, and reqwest's OpenSSL TLS
# backend). No extra apt packages are required to compile.
#
# Build only the dits CLI in release mode; `-p dits --bin dits` skips the
# wasm/web packages that aren't part of the CLI. The trailing --version is a
# build-time smoke test: the build fails loudly if the binary can't run.
RUN cargo build --release -p dits --bin dits \
    && cp target/release/dits /usr/local/bin/dits \
    && /usr/local/bin/dits --version

# -------- Stage 2: Runtime --------
FROM debian:bookworm-slim

# The CLI dynamically links system OpenSSL and needs a CA bundle for HTTPS.
# Both the builder and this runtime are Debian bookworm, so the OpenSSL 3
# libraries are ABI-compatible. Copying them (instead of `apt-get install`)
# keeps the runtime tiny and lets the image build even on networks with
# locked-down apt mirrors.
COPY --from=builder /etc/ssl/certs/ca-certificates.crt        /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /usr/lib/x86_64-linux-gnu/libssl.so.3     /usr/lib/x86_64-linux-gnu/
COPY --from=builder /usr/lib/x86_64-linux-gnu/libcrypto.so.3  /usr/lib/x86_64-linux-gnu/
COPY --from=builder /usr/local/bin/dits                       /usr/local/bin/dits

# /data is the working directory for a repo you mount in with `-v "$PWD:/data"`.
WORKDIR /data

ENTRYPOINT ["dits"]
CMD ["--help"]
