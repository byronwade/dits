//! QUIC networking layer for DITS P2P

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use quinn::{ClientConfig, Connection, Endpoint, RecvStream, SendStream, ServerConfig, TransportConfig, VarInt};
use rustls::pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer};
use tracing::{info, warn};

use crate::p2p::protocol::{deserialize_message, serialize_message, NetMessage, ProtocolError};
use crate::p2p::types::CertFingerprint;
use crate::p2p::MAX_MESSAGE_SIZE;

pub const NAT_KEEPALIVE_INTERVAL: Duration = Duration::from_secs(25);
pub const IDLE_TIMEOUT: Duration = Duration::from_secs(120);

/// QUIC connection wrapper
#[derive(Clone)]
pub struct QuicConnection {
    connection: Connection,
}

impl QuicConnection {
    pub fn new(connection: Connection) -> Self {
        Self { connection }
    }

    #[allow(dead_code)]
    pub async fn open_stream(&self) -> Result<(SendStream, RecvStream), ConnectionError> {
        let (send, recv) = self.connection.open_bi().await
            .map_err(|e| ConnectionError::StreamOpen(e.to_string()))?;
        Ok((send, recv))
    }

    #[allow(dead_code)]
    pub async fn accept_stream(&self) -> Result<(SendStream, RecvStream), ConnectionError> {
        let (send, recv) = self.connection.accept_bi().await
            .map_err(|e| ConnectionError::StreamAccept(e.to_string()))?;
        Ok((send, recv))
    }

    pub fn remote_address(&self) -> SocketAddr {
        self.connection.remote_address()
    }

    #[allow(dead_code)]
    pub fn close(&self, code: u32, reason: &str) {
        self.connection.close(code.into(), reason.as_bytes());
    }
}

#[derive(Debug, Clone)]
pub enum ConnectionError {
    Connect(String),
    StreamOpen(String),
    StreamAccept(String),
    Send(String),
    Receive(String),
    Protocol(ProtocolError),
    #[allow(dead_code)]
    Timeout,
}

impl std::fmt::Display for ConnectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConnectionError::Connect(e) => write!(f, "Connection error: {}", e),
            ConnectionError::StreamOpen(e) => write!(f, "Stream open error: {}", e),
            ConnectionError::StreamAccept(e) => write!(f, "Stream accept error: {}", e),
            ConnectionError::Send(e) => write!(f, "Send error: {}", e),
            ConnectionError::Receive(e) => write!(f, "Receive error: {}", e),
            ConnectionError::Protocol(e) => write!(f, "Protocol error: {}", e),
            ConnectionError::Timeout => write!(f, "Connection timeout"),
        }
    }
}

impl std::error::Error for ConnectionError {}

impl From<ProtocolError> for ConnectionError {
    fn from(e: ProtocolError) -> Self {
        ConnectionError::Protocol(e)
    }
}

#[allow(dead_code)]
pub async fn send_message(stream: &mut SendStream, msg: &NetMessage) -> Result<(), ConnectionError> {
    let data = serialize_message(msg).map_err(|e| ConnectionError::Send(e.to_string()))?;
    stream.write_all(&data).await.map_err(|e| ConnectionError::Send(e.to_string()))?;
    Ok(())
}

#[allow(dead_code)]
pub async fn recv_message(stream: &mut RecvStream) -> Result<NetMessage, ConnectionError> {
    let mut len_buf = [0u8; 4];
    stream.read_exact(&mut len_buf).await.map_err(|e| ConnectionError::Receive(e.to_string()))?;
    let len = u32::from_le_bytes(len_buf) as usize;
    if len > MAX_MESSAGE_SIZE {
        return Err(ConnectionError::Protocol(ProtocolError::MessageTooLarge { size: len, max: MAX_MESSAGE_SIZE }));
    }
    let mut payload = vec![0u8; len];
    stream.read_exact(&mut payload).await.map_err(|e| ConnectionError::Receive(e.to_string()))?;
    deserialize_message(&payload).map_err(|e| ConnectionError::Protocol(ProtocolError::Deserialization(e.to_string())))
}

pub fn generate_self_signed_cert() -> (Vec<CertificateDer<'static>>, PrivateKeyDer<'static>) {
    let certified_key = rcgen::generate_simple_self_signed(vec!["localhost".into()]).unwrap();
    let key_der = certified_key.key_pair.serialize_der();
    let cert_der = CertificateDer::from(certified_key.cert.der().to_vec());
    let key = PrivatePkcs8KeyDer::from(key_der).into();
    (vec![cert_der], key)
}

pub fn compute_cert_fingerprint(cert: &CertificateDer<'_>) -> CertFingerprint {
    crate::p2p::crypto::checksum(cert.as_ref())
}

pub fn generate_self_signed_cert_with_fingerprint() -> (Vec<CertificateDer<'static>>, PrivateKeyDer<'static>, CertFingerprint) {
    let (certs, key) = generate_self_signed_cert();
    let fingerprint = compute_cert_fingerprint(&certs[0]);
    (certs, key, fingerprint)
}

pub fn create_nat_transport_config() -> TransportConfig {
    let mut transport = TransportConfig::default();
    transport.keep_alive_interval(Some(NAT_KEEPALIVE_INTERVAL));
    transport.max_idle_timeout(Some(IDLE_TIMEOUT.try_into().expect("idle timeout valid")));
    transport.initial_rtt(Duration::from_millis(100));
    transport.max_concurrent_bidi_streams(VarInt::from_u32(128));
    transport.max_concurrent_uni_streams(VarInt::from_u32(128));
    transport
}

pub fn create_client_endpoint() -> Result<Endpoint, ConnectionError> {
    warn!("Creating client endpoint without certificate pinning");
    let bind_addr: SocketAddr = "0.0.0.0:0".parse().unwrap();
    let mut endpoint = Endpoint::client(bind_addr).map_err(|e| ConnectionError::Connect(e.to_string()))?;

    let crypto = rustls::ClientConfig::builder()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(SkipServerVerification))
        .with_no_client_auth();

    let quic_config = quinn::crypto::rustls::QuicClientConfig::try_from(crypto)
        .map_err(|e| ConnectionError::Connect(e.to_string()))?;
    let mut config = ClientConfig::new(Arc::new(quic_config));
    config.transport_config(Arc::new(create_nat_transport_config()));
    endpoint.set_default_client_config(config);
    Ok(endpoint)
}

pub fn create_server_endpoint(bind_addr: SocketAddr) -> Result<(Endpoint, CertFingerprint), ConnectionError> {
    let (certs, key, fingerprint) = generate_self_signed_cert_with_fingerprint();
    let crypto = rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, key)
        .map_err(|e| ConnectionError::Connect(e.to_string()))?;

    let quic_config = quinn::crypto::rustls::QuicServerConfig::try_from(crypto)
        .map_err(|e| ConnectionError::Connect(e.to_string()))?;
    let mut config = ServerConfig::with_crypto(Arc::new(quic_config));
    config.transport_config(Arc::new(create_nat_transport_config()));
    let endpoint = Endpoint::server(config, bind_addr).map_err(|e| ConnectionError::Connect(e.to_string()))?;
    info!("Server endpoint created with cert fingerprint: {}", hex::encode(fingerprint));
    Ok((endpoint, fingerprint))
}

pub async fn connect(endpoint: &Endpoint, addr: SocketAddr, server_name: &str) -> Result<QuicConnection, ConnectionError> {
    let connection = endpoint.connect(addr, server_name)
        .map_err(|e| ConnectionError::Connect(e.to_string()))?
        .await
        .map_err(|e| ConnectionError::Connect(e.to_string()))?;
    info!("Connected to {}", addr);
    Ok(QuicConnection::new(connection))
}

#[derive(Debug)]
struct SkipServerVerification;

impl rustls::client::danger::ServerCertVerifier for SkipServerVerification {
    fn verify_server_cert(
        &self,
        _end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &rustls::pki_types::ServerName<'_>,
        _ocsp_response: &[u8],
        _now: rustls::pki_types::UnixTime,
    ) -> Result<rustls::client::danger::ServerCertVerified, rustls::Error> {
        warn!("Skipping certificate verification (development mode)");
        Ok(rustls::client::danger::ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &CertificateDer<'_>,
        _dss: &rustls::DigitallySignedStruct
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, rustls::Error> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        vec![
            rustls::SignatureScheme::RSA_PKCS1_SHA256,
            rustls::SignatureScheme::ECDSA_NISTP256_SHA256,
            rustls::SignatureScheme::RSA_PKCS1_SHA384,
            rustls::SignatureScheme::ECDSA_NISTP384_SHA384,
            rustls::SignatureScheme::ED25519,
        ]
    }
}
