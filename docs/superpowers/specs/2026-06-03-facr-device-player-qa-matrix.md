# FACR Streaming — Device / Player QA Matrix (P5 #3)

*Status: documentation only. 2026-06-03.*

This is the **operational** piece of P5. Unlike every other phase, there is nothing to *build* and
nothing this environment can verify — device QA needs real players on real hardware. This doc is the
honest checklist a team would run before shipping the FACR streaming output, mapped to the features
actually built (P1–P5 #2). Where in-session verification already covered a row, it is marked
**[auto]**; everything else is **[manual]** and explicitly not done here.

## What was already verified in-session (not device QA, but the objective baseline)

- Container correctness: ffmpeg/ffprobe decode the CMAF/ABR playlists to the full frame count;
  master + per-rung playlists valid; segment seams clean (no `Packet corrupt`). **[auto]**
- Incremental reuse, JPEG-XL determinism, QUIC delta-push byte counts, VMAF targets, CDC
  edit-resilience, OTIO 0-new-frames, AES-128 encrypt→decrypt round-trip, token auth. **[auto]**
- Real-browser hls.js pixel playback of the CMAF/ABR stream: **user-confirmed once (P1-era)**; later
  phases' playback was not re-observed because the automation browser tab is `visibility:hidden`
  (MediaSource stays closed). **[manual, partial]**

## Player matrix

| Player | Container | Notes / what to check |
|---|---|---|
| hls.js (Chrome/Firefox/Edge desktop) | fMP4/CMAF | Primary target. ABR switching, discontinuity (edit mode), `EXT-X-KEY` AES-128 decrypt. |
| Safari (macOS/iOS) — native HLS | fMP4/CMAF | Native HLS; verify `#EXT-X-MAP`, AES-128, ABR selection without hls.js. |
| Android ExoPlayer | fMP4/CMAF | HLS via ExoPlayer; AES-128 key fetch; ABR. |
| AVPlayer (iOS/tvOS) | fMP4/CMAF | Apple-native; strictest about `EXT-X-VERSION`, `EXT-X-MAP`, key delivery. |
| Smart TV / STB (Tizen, webOS, Roku) | fMP4/CMAF | Most fragmented; the real reason device QA exists. |
| ffmpeg/ffprobe (reference decoder) | any | Already **[auto]**: full-timeline decode, frame counts, seam corruption. |

## Test dimensions (per player)

1. **Single-rendition playback [manual]** — plays start→end, no stalls at segment seams.
2. **ABR adaptation [manual]** — throttle bandwidth; player steps 720p↔480p↔240p; `RESOLUTION`/
   `BANDWIDTH` honoured (already validated against ffmpeg-measured dimensions **[auto]**).
3. **Discontinuity / edit mode [manual]** — the `bMDT=0` + `EXT-X-DISCONTINUITY` path (trim/insert);
   confirm the player re-bases cleanly (hls.js does; native players vary — the documented risk).
4. **Encryption [manual]** — `EXT-X-KEY:METHOD=AES-128`: key fetched, segments decrypt and play;
   wrong/absent key fails closed.
5. **Seeking / scrubbing [manual]** — seek across segment and discontinuity boundaries.
6. **Startup latency & rebuffering [manual]** — time-to-first-frame; rebuffer ratio under loss.
7. **Init-segment handling [manual]** — `EXT-X-MAP` fetched once and reused across segments.

## Known gaps surfaced by earlier phases (carry into device QA)

- **Edit/CDC mode uses discontinuity playback** (position-independent segments). hls.js handles it;
  native players (AVPlayer, ExoPlayer, TV browsers) need explicit verification — this is the single
  biggest device-QA risk and is *by design* (the trade for edit-resilient reuse).
- **Encryption key is served openly** today; the auth token (P5 #2) gates the QUIC origin but a real
  deployment must gate the HTTP `/key` endpoint (and ideally move to SAMPLE-AES/CENC + a license
  server for premium content).
- **CMAF, not SAMPLE-AES/CENC** — fine for AES-128 HLS; premium DRM (Widevine/FairPlay/PlayReady)
  is out of scope and would change the encryption packaging.

## Exit criteria (per release)

All `[manual]` rows green on: hls.js (Chrome+Firefox+Safari), Safari native (macOS+iOS), one Android
(ExoPlayer), one TV/STB. Encryption + ABR + discontinuity verified on each. ffmpeg reference decode
**[auto]** in CI.

## Why this is a doc, not code

Device QA is a labour + hardware activity (device labs, real networks, manual observation). It cannot
be unit-tested or run in this environment. The objective, automatable slice — reference-decoder
correctness — is already in the test suite; the rest is this checklist.
