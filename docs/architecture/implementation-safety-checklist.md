# Implementation Safety Checklist

> Pre-flight verification checklist for implementing Dits features safely. Use this document to verify each component meets safety requirements before deployment.

## How to Use This Checklist

1. **Before Implementation**: Review relevant sections
2. **During Implementation**: Check off items as you implement them
3. **Before Code Review**: Verify all applicable items are complete
4. **Before Deployment**: Final verification with the deployment checklist

---

## 1. Storage Operations

### Chunk Storage

- [ ] **Read Verification**: All chunk reads verify BLAKE3 checksum before returning data
- [ ] **Write Verification**: Critical writes use read-after-write verification
- [ ] **Atomic Operations**: Use temp file + rename for atomic writes
- [ ] **Error Handling**: Corrupted chunk triggers recovery from replicas
- [ ] **Metrics**: Storage operations emit latency and error metrics

```typescript
// Example: Safe chunk read
async function readChunk(hash: string): Promise<Buffer> {
  const data = await storage.get(hash);
  const computed = blake3(data);
  if (computed !== hash) {
    metrics.increment('storage.corruption');
    return await recoverFromReplica(hash);
  }
  return data;
}
```

### Reference Counting

- [ ] **Atomicity**: Ref count changes use database transactions
- [ ] **Locking**: Advisory locks prevent concurrent modifications
- [ ] **Constraints**: Database constraint prevents negative counts
- [ ] **Logging**: All ref count changes logged for debugging
- [ ] **Idempotency**: Duplicate operations are idempotent

```sql
-- Required constraint
ALTER TABLE chunk_refs
ADD CONSTRAINT positive_refs CHECK (ref_count >= 0);
```

### Garbage Collection

- [ ] **Grace Period**: Minimum 24-hour delay before deletion
- [ ] **Checkpoint**: GC saves progress for crash recovery
- [ ] **Verification**: Double-check refs before actual deletion
- [ ] **Rate Limiting**: Deletion is throttled to prevent I/O spikes
- [ ] **Rollback**: Soft delete first, hard delete after confirmation

---

## 2. Network Operations

### Connection Handling

- [ ] **Timeouts**: All network operations have explicit timeouts
- [ ] **Retries**: Retries use exponential backoff with jitter
- [ ] **Idempotency**: Retryable operations include idempotency keys
- [ ] **Circuit Breaker**: Failing endpoints are temporarily bypassed
- [ ] **Connection Pooling**: Pool size is configured and monitored

```typescript
// Required timeout configuration
const TIMEOUTS = {
  connect: 5000,      // 5 seconds
  upload: 300000,     // 5 minutes
  download: 300000,   // 5 minutes
  metadata: 10000,    // 10 seconds
};
```

### Request Handling

- [ ] **Rate Limiting**: Per-user and global rate limits enforced
- [ ] **Request Size**: Maximum request body size enforced
- [ ] **Validation**: All inputs validated before processing
- [ ] **Sanitization**: User inputs sanitized in logs and responses
- [ ] **Error Responses**: Errors don't leak internal details

### WebSocket

- [ ] **Heartbeat**: Ping/pong every 30 seconds
- [ ] **Reconnection**: Automatic reconnect with backoff
- [ ] **State Sync**: Reconnection resumes from last event ID
- [ ] **Connection Limits**: Per-user connection limits enforced
- [ ] **Idle Timeout**: Idle connections closed after 5 minutes

---

## 3. Concurrency Safety

### Locking

- [ ] **Lock Ordering**: Locks acquired in consistent order (by resource ID)
- [ ] **Lock Timeouts**: All locks have explicit TTL
- [ ] **Lock Extension**: Long operations extend locks before expiry
- [ ] **Deadlock Detection**: Wait-for graph monitored
- [ ] **Fencing Tokens**: Write operations include fencing tokens

```typescript
// Required: Lock acquisition with timeout
async function acquireLock(resource: string): Promise<Lock> {
  const lock = await lockManager.acquire(resource, {
    ttl: 30000,  // 30 seconds
    retry: { count: 3, delay: 1000 },
  });

  // Start auto-extension
  lock.startHeartbeat(10000);

  return lock;
}
```

### Transactions

- [ ] **Isolation Level**: Document required isolation per operation
- [ ] **Transaction Duration**: Keep transactions short
- [ ] **Retry Logic**: Serialization failures trigger retry
- [ ] **Savepoints**: Use savepoints for partial rollback
- [ ] **Connection Release**: Connections returned to pool after commit

### Async Operations

- [ ] **Cancellation**: Long operations support cancellation
- [ ] **Progress Tracking**: Large operations report progress
- [ ] **Timeout**: Async operations have maximum runtime
- [ ] **Cleanup**: Failed operations clean up partial work
- [ ] **Resumption**: Large operations are resumable

---

## 4. Data Integrity

### Input Validation

- [ ] **Type Checking**: All inputs are type-validated
- [ ] **Size Limits**: Maximum sizes enforced (file, string, array)
- [ ] **Format Validation**: Regex/schema validation for structured data
- [ ] **Path Traversal**: File paths validated against traversal attacks
- [ ] **Injection Prevention**: SQL, command, and XSS injection prevented

```typescript
// Required: Input validation
const schema = z.object({
  filename: z.string().max(255).regex(/^[a-zA-Z0-9._-]+$/),
  size: z.number().positive().max(100 * 1024 * 1024 * 1024), // 100GB
  chunks: z.array(z.string().length(64)).max(1000000),
});
```

### Output Validation

- [ ] **Null Checks**: All potentially null values checked
- [ ] **Boundary Checks**: Array indices and offsets validated
- [ ] **Type Coercion**: Explicit type conversion, no implicit coercion
- [ ] **Serialization**: JSON/binary serialization is reversible
- [ ] **Encoding**: Character encoding is consistent (UTF-8)

### Database Integrity

- [ ] **Foreign Keys**: All relationships have FK constraints
- [ ] **Unique Constraints**: Unique fields enforced at DB level
- [ ] **Check Constraints**: Business rules enforced at DB level
- [ ] **Triggers**: Audit triggers for sensitive tables
- [ ] **Migrations**: All migrations are reversible

---

## 5. Security

### Authentication

- [ ] **Token Validation**: All endpoints validate tokens
- [ ] **Token Expiry**: Tokens have appropriate TTL
- [ ] **Refresh Logic**: Token refresh doesn't create race conditions
- [ ] **Session Management**: Sessions regenerated on privilege change
- [ ] **Logout**: Logout invalidates all active sessions

### Authorization

- [ ] **Permission Checks**: Every resource access checks permissions
- [ ] **Default Deny**: No access without explicit permission
- [ ] **TOCTOU**: Permission and action in same transaction
- [ ] **Privilege Escalation**: Role changes require re-auth
- [ ] **Audit Logging**: All authorization decisions logged

### Secrets

- [ ] **No Hardcoding**: No secrets in code or config files
- [ ] **Environment Variables**: Secrets from env or secret manager
- [ ] **Log Sanitization**: Secrets never appear in logs
- [ ] **Memory Safety**: Secrets zeroed after use
- [ ] **Rotation**: Secrets rotatable without downtime

```typescript
// Required: Secret loading
const secrets = {
  dbPassword: process.env.DB_PASSWORD || throwRequired('DB_PASSWORD'),
  apiKey: process.env.API_KEY || throwRequired('API_KEY'),
};

function throwRequired(name: string): never {
  throw new Error(`Required secret ${name} not configured`);
}
```

### Cryptography

- [ ] **Algorithm Selection**: Use approved algorithms only
- [ ] **Key Length**: Minimum 256-bit for symmetric, 2048-bit for RSA
- [ ] **Nonce Handling**: Never reuse nonces
- [ ] **Random Generation**: Use cryptographic RNG only
- [ ] **Constant Time**: Comparison operations are constant-time

---

## 6. Error Handling

### Exception Handling

- [ ] **Catch Specificity**: Catch specific exceptions, not all
- [ ] **Resource Cleanup**: Finally blocks release resources
- [ ] **Error Context**: Errors include actionable context
- [ ] **Error Codes**: Machine-readable error codes for clients
- [ ] **Stack Traces**: Stack traces in dev, not in prod responses

```typescript
// Required: Error handling pattern
try {
  await operation();
} catch (e) {
  if (e instanceof ValidationError) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: e.message });
  }
  if (e instanceof NotFoundError) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Resource not found' });
  }
  // Unknown errors - log but don't expose details
  logger.error('Unexpected error', { error: e, requestId: req.id });
  return res.status(500).json({ code: 'INTERNAL_ERROR', requestId: req.id });
}
```

### Failure Modes

- [ ] **Graceful Degradation**: Partial functionality on partial failure
- [ ] **Circuit Breakers**: Failing dependencies are isolated
- [ ] **Fallbacks**: Critical paths have fallback options
- [ ] **Bulkheads**: Failures don't cascade across components
- [ ] **Health Checks**: Component health is monitorable

### Recovery

- [ ] **Idempotency**: Recovery operations are idempotent
- [ ] **Compensation**: Failed multi-step operations compensate
- [ ] **Retry Safety**: Retries don't cause duplicate effects
- [ ] **Manual Override**: Admin can manually fix stuck states
- [ ] **Documentation**: Recovery procedures are documented

---

## 7. Video Processing

### Container Parsing

- [ ] **Corruption Handling**: Corrupted files fail gracefully
- [ ] **Size Limits**: Maximum file size enforced before parsing
- [ ] **Timeout**: Parser has timeout for malicious files
- [ ] **Memory Limits**: Parser memory usage bounded
- [ ] **Validation**: Output validated before use

```typescript
// Required: Safe parsing
async function parseVideo(file: Buffer): Promise<VideoInfo> {
  if (file.length > MAX_FILE_SIZE) {
    throw new FileTooLargeError(file.length, MAX_FILE_SIZE);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PARSE_TIMEOUT);

  try {
    return await parser.parse(file, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
```

### Chunking

- [ ] **Keyframe Alignment**: Chunks aligned to keyframes where possible
- [ ] **Fallback**: Graceful fallback when keyframes unavailable
- [ ] **Metadata Preservation**: HDR/color metadata preserved
- [ ] **Codec Support**: Unsupported codecs handled gracefully
- [ ] **Verification**: Chunks can reconstruct original

### NLE Integration

- [ ] **Version Detection**: Unsupported versions fail clearly
- [ ] **Depth Limits**: Recursion depth limited
- [ ] **Node Limits**: Maximum node count enforced
- [ ] **Resource Limits**: Memory and CPU limits enforced
- [ ] **Validation**: Parsed project validated for consistency

---

## 8. API Design

### Request Handling

- [ ] **Versioning**: API version in path or header
- [ ] **Content-Type**: Validate Content-Type header
- [ ] **Accept**: Respect Accept header
- [ ] **Method Override**: Only allow safe method overrides
- [ ] **CORS**: CORS headers properly configured

### Response Design

- [ ] **Status Codes**: Appropriate HTTP status codes
- [ ] **Pagination**: List endpoints are paginated
- [ ] **Rate Limit Headers**: Include rate limit info in headers
- [ ] **Cache Headers**: Appropriate caching headers
- [ ] **Compression**: Response compression enabled

### Documentation

- [ ] **OpenAPI**: All endpoints documented in OpenAPI
- [ ] **Examples**: Request/response examples provided
- [ ] **Error Codes**: Error codes documented
- [ ] **Deprecation**: Deprecated endpoints marked
- [ ] **Changelog**: API changes documented

---

## 9. Observability

### Logging

- [ ] **Structured**: JSON structured logging
- [ ] **Levels**: Appropriate log levels used
- [ ] **Context**: Request ID and user ID in all logs
- [ ] **Sampling**: High-volume logs are sampled
- [ ] **Retention**: Log retention configured

```typescript
// Required: Log format
logger.info('Operation completed', {
  requestId: req.id,
  userId: req.user?.id,
  operation: 'uploadChunk',
  duration: endTime - startTime,
  chunkSize: chunk.length,
});
```

### Metrics

- [ ] **RED Metrics**: Rate, Errors, Duration for all endpoints
- [ ] **USE Metrics**: Utilization, Saturation, Errors for resources
- [ ] **Business Metrics**: Domain-specific metrics tracked
- [ ] **Labels**: Consistent label naming
- [ ] **Histograms**: Latency uses histograms, not averages

### Tracing

- [ ] **Trace Context**: Trace ID propagated across services
- [ ] **Span Creation**: Significant operations create spans
- [ ] **Span Attributes**: Relevant attributes added to spans
- [ ] **Error Recording**: Errors recorded on spans
- [ ] **Sampling**: Appropriate sampling rate configured

### Alerting

- [ ] **SLO-Based**: Alerts based on SLOs, not arbitrary thresholds
- [ ] **Actionable**: Every alert has a clear action
- [ ] **Deduplicated**: Related alerts grouped
- [ ] **Severity Levels**: Appropriate severity assigned
- [ ] **Runbooks**: Alerts link to runbooks

---

## 10. Deployment

### Pre-Deployment

- [ ] **Tests Pass**: All tests passing
- [ ] **Linting**: No linting errors
- [ ] **Type Check**: No type errors
- [ ] **Security Scan**: No critical vulnerabilities
- [ ] **License Check**: No prohibited licenses

### Database

- [ ] **Migration Tested**: Migrations tested in staging
- [ ] **Rollback Ready**: Migration rollback prepared
- [ ] **Backward Compatible**: New schema works with old code
- [ ] **Performance Tested**: Migration performance acceptable
- [ ] **Backup Verified**: Recent backup verified restorable

### Configuration

- [ ] **Secrets Available**: All required secrets configured
- [ ] **Feature Flags**: New features behind flags
- [ ] **Environment Specific**: Env-specific config correct
- [ ] **Limits Configured**: Resource limits appropriate
- [ ] **Health Checks**: Health check endpoints ready

### Rollout

- [ ] **Canary**: Canary deployment first
- [ ] **Monitoring**: Enhanced monitoring during rollout
- [ ] **Rollback Plan**: Rollback procedure documented
- [ ] **Communication**: Stakeholders notified
- [ ] **On-Call Ready**: On-call aware of deployment

---

## 11. Post-Deployment

### Verification

- [ ] **Health Check**: All health checks passing
- [ ] **Smoke Tests**: Smoke tests passing
- [ ] **Metrics Normal**: Key metrics within normal range
- [ ] **Error Rate**: Error rate not elevated
- [ ] **Latency**: Latency not elevated

### Monitoring

- [ ] **Dashboards**: Deployment visible in dashboards
- [ ] **Alerts Enabled**: Alerts not silenced
- [ ] **Log Review**: Logs reviewed for anomalies
- [ ] **User Feedback**: Support channels monitored
- [ ] **Performance**: Performance compared to baseline

### Documentation

- [ ] **Changelog Updated**: Changelog reflects changes
- [ ] **Runbooks Updated**: Runbooks updated if needed
- [ ] **Architecture Updated**: Architecture docs current
- [ ] **API Docs Updated**: API docs reflect changes
- [ ] **Training**: Team trained on new features

---

## Quick Reference: Critical Safety Rules

### Never Do

1. **Never** skip checksum verification on reads
2. **Never** delete without grace period
3. **Never** log secrets or tokens
4. **Never** trust client-provided sizes/offsets
5. **Never** catch and ignore exceptions
6. **Never** use hardcoded credentials
7. **Never** skip transaction for multi-step operations
8. **Never** deploy without rollback plan

### Always Do

1. **Always** validate all inputs
2. **Always** use parameterized queries
3. **Always** include timeouts
4. **Always** log with request context
5. **Always** handle partial failures
6. **Always** test migrations in staging
7. **Always** have monitoring in place
8. **Always** document non-obvious decisions

---

## Severity Definitions

| Level | Definition | Response |
|-------|------------|----------|
| **P0** | Data loss or corruption possible | Block deployment until fixed |
| **P1** | Security vulnerability | Fix within 24 hours |
| **P2** | Significant functionality broken | Fix within 1 week |
| **P3** | Minor issue or improvement | Schedule for next sprint |
| **P4** | Nice to have | Add to backlog |

---

## Sign-Off Template

```
Feature: _________________
Date: _________________
Reviewer: _________________

Pre-Implementation Review: [ ] Complete
Implementation Checklist: [ ] Complete
Code Review: [ ] Complete
Security Review: [ ] Complete (if applicable)
Staging Deployment: [ ] Successful
Production Deployment: [ ] Successful
Post-Deployment Verification: [ ] Complete

Notes:
_________________________________
_________________________________
```

---

## Related Documents

- [Known Issues and Solutions](./known-issues-and-solutions.md)
- [Edge Cases and Failure Modes](./edge-cases-failure-modes.md)
- [Security Architecture](./security.md)
- [Operations Runbook](../operations/runbook.md)
