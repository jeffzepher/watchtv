# Android TV implementation plan

1. Build independent Android application targeting API 28 and later; use leanback launcher, remote-friendly controls, and a restrained memory footprint.
2. Import WatchTV sources JSON from the system file picker; retain enabled sources locally and validate URLs and list limits.
3. Search enabled Apple CMS JSON APIs on background threads with bounded timeouts; present results and episode/line selection navigable by remote.
4. Play direct HLS/MP4 using the Android media stack, provide remote playback controls and clear failure messages; no server dependency.
5. Verify build and focused parsing tests, then test APK on available emulator; record that actual 65V69E installation, formats and performance need user validation.
