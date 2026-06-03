//! QUIC delta-push origin: a content-addressed segment store reachable over QUIC, plus a client
//! that pushes only the segments the remote lacks. Because segments are content-addressed, pushing
//! v2 after v1 transfers only the *changed* segments — "only changed segments cross the network".
//!
//! Built on the existing `p2p::net` QUIC transport (self-signed cert + pinning, framed streams).
//! The build pipeline stays sync+local; delta-push is a separate async step (see the design spec).

use crate::core::Hash;
use crate::p2p::net::{
    connect, create_client_endpoint_with_pinned_cert, create_server_endpoint, QuicConnection,
};
use crate::p2p::types::CertFingerprint;
use crate::stream::origin::SegmentOrigin;
use anyhow::{bail, Context, Result};
use quinn::{RecvStream, SendStream};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::task::JoinHandle;

/// Generous per-frame cap (segments are small, but don't depend on p2p's 1 MiB message limit).
const MAX_FRAME: usize = 64 * 1024 * 1024;

/// rustls 0.23 needs a process-wide crypto provider installed before any TLS handshake. The p2p
/// QUIC layer never installed one (it had no runtime users), so we install `ring` once here.
fn ensure_crypto_provider() {
    use std::sync::Once;
    static ONCE: Once = Once::new();
    ONCE.call_once(|| {
        let _ = rustls::crypto::ring::default_provider().install_default();
    });
}

/// One request or response on the segment-transfer protocol.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SegMessage {
    Have(Hash),
    HaveResp(bool),
    Put { hash: Hash, bytes: Vec<u8> },
    PutOk,
    Get(Hash),
    GetResp(Option<Vec<u8>>),
}

/// What a delta-push actually moved.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct PushStats {
    pub pushed: usize,
    pub skipped: usize,
    pub bytes: u64,
}

async fn write_msg(send: &mut SendStream, msg: &SegMessage) -> Result<()> {
    let payload = bincode::serialize(msg).context("serialize SegMessage")?;
    send.write_all(&(payload.len() as u32).to_le_bytes())
        .await
        .context("write frame length")?;
    send.write_all(&payload).await.context("write frame payload")?;
    Ok(())
}

async fn read_msg(recv: &mut RecvStream) -> Result<SegMessage> {
    let mut len_buf = [0u8; 4];
    recv.read_exact(&mut len_buf).await.context("read frame length")?;
    let len = u32::from_le_bytes(len_buf) as usize;
    if len > MAX_FRAME {
        bail!("segment frame too large: {len} bytes");
    }
    let mut buf = vec![0u8; len];
    recv.read_exact(&mut buf).await.context("read frame payload")?;
    bincode::deserialize(&buf).context("deserialize SegMessage")
}

/// Start a QUIC origin server backed by `backing`. One request/response per accepted stream.
/// Returns the bound address, its cert fingerprint (for client pinning), and the accept-loop task.
pub async fn serve_quic_origin(
    bind: SocketAddr,
    backing: Arc<dyn SegmentOrigin + Send + Sync>,
) -> Result<(SocketAddr, CertFingerprint, JoinHandle<()>)> {
    ensure_crypto_provider();
    let (endpoint, fingerprint) =
        create_server_endpoint(bind).map_err(|e| anyhow::anyhow!("server endpoint: {e}"))?;
    let addr = endpoint.local_addr().context("server local_addr")?;

    let handle = tokio::spawn(async move {
        while let Some(incoming) = endpoint.accept().await {
            let backing = backing.clone();
            tokio::spawn(async move {
                if let Ok(conn) = incoming.await {
                    handle_connection(QuicConnection::new(conn), backing).await;
                }
            });
        }
    });
    Ok((addr, fingerprint, handle))
}

/// Serve requests on one connection until it closes.
async fn handle_connection(conn: QuicConnection, backing: Arc<dyn SegmentOrigin + Send + Sync>) {
    while let Ok((mut send, mut recv)) = conn.accept_stream().await {
        let req = match read_msg(&mut recv).await {
            Ok(m) => m,
            Err(_) => continue,
        };
        let resp = match req {
            SegMessage::Have(h) => SegMessage::HaveResp(backing.has(&h)),
            SegMessage::Put { hash, bytes } => {
                let _ = backing.put(&hash, &bytes);
                SegMessage::PutOk
            }
            SegMessage::Get(h) => SegMessage::GetResp(backing.get(&h).ok()),
            // Response-only variants are never valid requests.
            _ => continue,
        };
        if write_msg(&mut send, &resp).await.is_ok() {
            let _ = send.finish();
        }
    }
}

/// A cert-pinned client to a QUIC origin.
pub struct QuicOriginClient {
    conn: QuicConnection,
}

impl QuicOriginClient {
    pub async fn connect(addr: SocketAddr, fingerprint: CertFingerprint) -> Result<Self> {
        ensure_crypto_provider();
        let endpoint = create_client_endpoint_with_pinned_cert(0, fingerprint)
            .map_err(|e| anyhow::anyhow!("client endpoint: {e}"))?;
        let conn = connect(&endpoint, addr, "localhost")
            .await
            .map_err(|e| anyhow::anyhow!("connect: {e}"))?;
        Ok(Self { conn })
    }

    /// One request -> one response on a fresh bidirectional stream.
    async fn request(&self, msg: SegMessage) -> Result<SegMessage> {
        let (mut send, mut recv) = self
            .conn
            .open_stream()
            .await
            .map_err(|e| anyhow::anyhow!("open stream: {e}"))?;
        write_msg(&mut send, &msg).await?;
        let _ = send.finish();
        read_msg(&mut recv).await
    }

    pub async fn has(&self, h: &Hash) -> Result<bool> {
        match self.request(SegMessage::Have(*h)).await? {
            SegMessage::HaveResp(b) => Ok(b),
            other => bail!("unexpected response to Have: {other:?}"),
        }
    }

    pub async fn put(&self, h: &Hash, bytes: &[u8]) -> Result<()> {
        match self.request(SegMessage::Put { hash: *h, bytes: bytes.to_vec() }).await? {
            SegMessage::PutOk => Ok(()),
            other => bail!("unexpected response to Put: {other:?}"),
        }
    }

    pub async fn get(&self, h: &Hash) -> Result<Option<Vec<u8>>> {
        match self.request(SegMessage::Get(*h)).await? {
            SegMessage::GetResp(b) => Ok(b),
            other => bail!("unexpected response to Get: {other:?}"),
        }
    }
}

/// Push only the segments the remote lacks. `hashes` is deduped internally.
pub async fn push_delta(
    local: &dyn SegmentOrigin,
    client: &QuicOriginClient,
    hashes: &[Hash],
) -> Result<PushStats> {
    let mut seen = HashSet::new();
    let mut stats = PushStats::default();
    for h in hashes {
        if !seen.insert(*h) {
            continue;
        }
        if client.has(h).await? {
            stats.skipped += 1;
            continue;
        }
        let bytes = local.get(h).with_context(|| format!("local origin missing {}", h.short()))?;
        client.put(h, &bytes).await?;
        stats.pushed += 1;
        stats.bytes += bytes.len() as u64;
    }
    Ok(stats)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::stream::origin::LocalDiskOrigin;

    fn h(b: &[u8]) -> Hash {
        Hash::from_slice(blake3::hash(b).as_bytes())
    }

    async fn start_origin() -> (SocketAddr, CertFingerprint, Arc<LocalDiskOrigin>, tempfile::TempDir) {
        let dir = tempfile::tempdir().unwrap();
        let backing = Arc::new(LocalDiskOrigin::new(dir.path()).unwrap());
        let (addr, fp, _task) =
            serve_quic_origin("127.0.0.1:0".parse().unwrap(), backing.clone()).await.unwrap();
        (addr, fp, backing, dir)
    }

    #[tokio::test]
    async fn put_get_has_roundtrip_over_quic() {
        let (addr, fp, _backing, _dir) = start_origin().await;
        let client = QuicOriginClient::connect(addr, fp).await.unwrap();
        let data = b"hello-segment".to_vec();
        let key = h(&data);

        assert!(!client.has(&key).await.unwrap());
        client.put(&key, &data).await.unwrap();
        assert!(client.has(&key).await.unwrap());
        assert_eq!(client.get(&key).await.unwrap(), Some(data));
        assert_eq!(client.get(&h(b"absent")).await.unwrap(), None);
    }

    #[tokio::test]
    async fn delta_push_only_sends_missing() {
        let (addr, fp, backing, _dir) = start_origin().await;
        let client = QuicOriginClient::connect(addr, fp).await.unwrap();

        let a = b"aaa".to_vec();
        let b = b"bbbb".to_vec();
        let c = b"ccccc".to_vec();
        // Seed local origin with all three so push_delta can read them.
        let local_dir = tempfile::tempdir().unwrap();
        let local = LocalDiskOrigin::new(local_dir.path()).unwrap();
        for d in [&a, &b, &c] {
            local.put(&h(d), d).unwrap();
        }

        // First push: a, b -> both new.
        let s1 = push_delta(&local, &client, &[h(&a), h(&b)]).await.unwrap();
        assert_eq!((s1.pushed, s1.skipped), (2, 0));
        assert_eq!(s1.bytes, (a.len() + b.len()) as u64);

        // Second push: a, b, c -> only c is new.
        let s2 = push_delta(&local, &client, &[h(&a), h(&b), h(&c)]).await.unwrap();
        assert_eq!((s2.pushed, s2.skipped), (1, 2));
        assert_eq!(s2.bytes, c.len() as u64);

        // The remote now has everything.
        assert!(backing.has(&h(&a)) && backing.has(&h(&b)) && backing.has(&h(&c)));
    }
}
