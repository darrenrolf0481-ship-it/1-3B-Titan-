# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NEXUS // SAGE-7 is a paranormal-investigation-themed "intelligence terminal" — a single-page React app styled as a sci-fi dashboard (neon terminal aesthetic, scanlines, simulated sensor feeds) with real AI chat and vision analysis wired in. It started as a Google AI Studio applet and was migrated from Next.js to Vite + React (leftovers from that migration still exist — see Gotchas).

## Commands

```bash
npm install          # install dependencies
npm run dev          # Vite dev server
npm run build        # tsc -b && vite build (type-check is part of the build)
npm run preview      # serve the production build
```

There is no test suite and no working lint setup (`eslint.config.mjs` is an empty config; `.eslintrc.json` extends "next" and is vestigial). `npm run build` is the only verification gate — run it to type-check changes.

### Vision server (optional Python sidecar)

```bash
python3 vision_server.py   # FastAPI on http://localhost:8765
```

Dependencies (no requirements.txt): `fastapi`, `uvicorn`, `httpx`, `pydantic`, `pillow`. It proxies image frames to a local Ollama instance (`http://localhost:11434`) using a vision model (e.g. `ollama pull llava`), injecting a paranormal-analysis system prompt. Endpoints: `GET /health`, `GET /models`, `POST /analyze` (streaming), `POST /analyze/snapshot` (JSON).

### Environment

The Gemini chat engine reads `import.meta.env.VITE_GEMINI_API_KEY`. Because this is Vite, the variable **must** be prefixed `VITE_` in `.env` to reach the client — `.env.example` and the README mention `GEMINI_API_KEY` (AI Studio convention), but the code only sees `VITE_GEMINI_API_KEY`.

## Architecture

Entry chain: `index.html` → `src/main.tsx` → `app/NexusPlatform.tsx`.

**No router.** `NexusPlatform` is the root shell (Header, Sidebar, Footer, background layers) and switches between screens with a `useState`/`switch` on `activeScreen`. Each screen is a lazily-loaded component in `components/Screen*.tsx`:

- `ScreenNeural` — the AI chat (default screen), largest component. Dual-engine: Gemini (`@google/genai`) or a direct connection to Ollama at a user-configurable endpoint. Supports attachments (image/video/audio/document as base64 inline data), Web Speech dictation, and TTS.
- `ScreenFeeds` — camera feeds; polls `http://localhost:8765/health` and sends frames to `vision_server.py` for Ollama vision analysis.
- `ScreenCommand`, `ScreenSensors`, `ScreenEVP`, `ScreenTemporal`, `ScreenConfig` — dashboard screens driven mostly by simulated data.

**Shared state** lives in `hooks/use-nexus-state.ts`, owned by `NexusPlatform` and passed down as props (no context/store). It simulates sensor readings on a 5 Hz interval and the anomaly level every 5 s. Sensor histories are `Float32Array`s held in a ref (not state) specifically to avoid re-renders — screens that chart them (`ScreenSensors`) receive the ref and read it on their own animation ticks.

**Simulated vs. real:** most "sensor" numbers (EMF, temp, phi, neurochemical levels, motion alerts) are `Math.random()` drift — part of the aesthetic, not bugs. The real integrations are the Gemini/Ollama chat in `ScreenNeural` and the vision pipeline in `ScreenFeeds` + `vision_server.py`.

**Imports:** `@/` aliases the repo root (configured in both `vite.config.js` and `tsconfig.json`). Components live flat in `components/`; use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes.

**Styling:** Tailwind CSS v3 via PostCSS. The theme (`tailwind.config.ts`) defines the palette used everywhere: `neon-blue/violet/cyan/red/green`, `void` (background), `panel`, `border-subtle`, `text-ghost/dim/bright`, plus fonts `font-orbitron` (headings), `font-rajdhani` (body), `font-mono` (Share Tech Mono, terminal text). `app/globals.css` imports `app/styles/{theme,animations,components}.css`. Match this palette and the terminal typography conventions (tiny tracking-widest uppercase mono labels) when adding UI.

## Gotchas

- **Next.js remnants:** `.eslintrc.json` (extends "next"), the `./pages/**` glob in `tailwind.config.ts`, and `app/`-directory naming are leftovers from the Next.js → Vite migration. There is no Next.js runtime; don't reintroduce `next/*` imports or server components.
- **Tailwind version mismatch in devDeps:** both `tailwindcss` v3 and `@tailwindcss/postcss` v4 are installed, but `postcss.config.mjs` uses the v3 `tailwindcss` plugin — v3 is what's actually active.
- **Gemini SDK usage:** `ScreenNeural` calls `genAI.getGenerativeModel(...)` behind `@ts-ignore` — that's the old `@google/generative-ai` API shape, not the installed `@google/genai` SDK's, so the Gemini path type-checks only via the ignores. If you touch it, migrate to the `@google/genai` `models.generateContent` API rather than adding more ignores.
