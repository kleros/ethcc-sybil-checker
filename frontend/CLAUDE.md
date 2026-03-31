# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server
npm run build      # production build
npm run lint       # ESLint
npm run preview    # preview production build locally
```

There are no tests. No test framework is configured.

## Environment

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. These are required at build time (Vite injects them via `import.meta.env`).

## Architecture

Single-page React 18 PWA (Vite, JSX — no TypeScript, no router, no auth). The entire app lives in `src/App.jsx`. Deployed to Netlify.

**Purpose:** Booth staff at EthCC scan visitors' ticket QR codes. Each code can only be scanned once (sybil prevention for swag distribution).

**Scan flow:**
1. On mount, all previously scanned codes are loaded from Supabase `scanned_codes` table into an in-memory array (`db` state).
2. `html5-qrcode` uses the rear camera to decode QR codes.
3. On scan, the code is checked against the local `db` array:
   - Already present → "Already scanned" (red) — reject.
   - New → inserted into Supabase, appended to local state → "Not scanned yet" (green) — approve.
4. Scanning auto-stops after each decode so the operator sees the result.

**Supabase schema:** A single `scanned_codes` table with a `code` text column.

**PWA:** Configured via `vite-plugin-pwa` in `vite.config.js` (standalone mode, auto-update).

## Gotchas

- **Status values are counterintuitive:** `status` state is `null | "found" | "notfound" | "error"`. `"found"` means the code was already in the DB (duplicate — bad, red). `"notfound"` means the code is new (good, green). Don't invert these.
- **`html5-qrcode` requires a DOM element with `id="reader"`** to exist before calling `Html5Qrcode.start()`. The code conditionally renders `<div id="reader" ref={readerRef} />` only when `scanning` is true, and the `useEffect` that starts the scanner checks both `scanning` and `readerRef.current`. If you restructure the scanner UI, preserve this ordering.
- **Duplicate check is client-side only:** The `db` array is loaded once on mount. If multiple devices scan simultaneously, there's no server-side unique constraint preventing races — be aware of this if adding multi-device support.
