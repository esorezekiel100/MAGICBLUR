# MAGICBLUR

A browser-based video toolkit. Video editing and export happen on your device. Your video is never uploaded to MAGICBLUR.

## Run locally

```sh
npm install
npm run dev
```

The Vite development and preview servers set the COOP/COEP headers needed by SharedArrayBuffer-enabled FFmpeg. Use the single-threaded FFmpeg core if the host doesn't support cross-origin isolation.

## Current build

- Responsive home and tool routes, categorized video-conversion navigation, privacy and pricing pages, and English-first language switching with locale scaffolding.
- One local video editor with preview, keyboard-operable timeline scrubbing, trim, crop, rotate, flip, resize, speed, volume, loop, merge and format conversion.
- Reorderable edit steps, undo/redo, export progress and cancellation, local download/share controls, and a synthetic sample clip.
- FFmpeg WebAssembly is loaded only when exporting. Videos and chained edits can be restored using local IndexedDB; choose **Forget saved edit** to delete that session from this browser.
- An installable PWA caches the application shell for offline use. FFmpeg core files are cached on-device the first time they are requested.

Smart Blur detection, authentication, subscriptions, and the remaining privacy tools have not been implemented.
"# MAGICBLUR" 
