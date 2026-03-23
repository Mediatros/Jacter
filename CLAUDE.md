# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is a fork of [Melvynx/Parler](https://github.com/Melvynx/Parler) (itself a fork of [cjpais/Handy](https://github.com/cjpais/Handy)). The goal of this fork is to add **Ollama as a dedicated local provider** for post-processing transcriptions.

## Development Commands

**Prerequisites:** [Rust](https://rustup.rs/) (latest stable), [Bun](https://bun.sh/)

```bash
# Install dependencies
bun install

# Run in development mode
bun run tauri dev
# If cmake error on macOS:
CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev

# Build for production
bun run tauri build

# Linting and formatting (run before committing)
bun run lint              # ESLint for frontend
bun run lint:fix          # ESLint with auto-fix
bun run format            # Prettier + cargo fmt
bun run format:check      # Check formatting without changes
```

**Model Setup (Required for Development):**

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx https://blob.handy.computer/silero_vad_v4.onnx
```

## Architecture Overview

Parler is a cross-platform desktop speech-to-text app built with Tauri 2.x (Rust backend + React/TypeScript frontend).

### Backend Structure (src-tauri/src/)

- `lib.rs` - Main entry point, Tauri setup, manager initialization
- `settings.rs` - Provider definitions, settings schema, defaults
- `actions.rs` - Post-processing pipeline, transcription flow
- `llm_client.rs` - HTTP client for all LLM providers (OpenAI-compatible API)
- `gemini_client.rs` - Gemini-specific client (different API format)
- `apple_intelligence.rs` - Apple Intelligence integration (macOS ARM64)
- `managers/` - Core business logic:
  - `audio.rs` - Audio recording and device management
  - `model.rs` - Model downloading and management
  - `transcription.rs` - Speech-to-text processing pipeline
  - `history.rs` - Transcription history storage (SQLite)
- `audio_toolkit/` - Low-level audio processing:
  - `audio/` - Device enumeration, recording, resampling
  - `vad/` - Voice Activity Detection (Silero VAD)
- `commands/` - Tauri command handlers for frontend communication
- `shortcut.rs` - Global keyboard shortcut handling

### Frontend Structure (src/)

- `App.tsx` - Main component with onboarding flow
- `components/settings/` - Settings UI (35+ files)
- `components/model-selector/` - Model management interface
- `components/onboarding/` - First-run experience
- `hooks/useSettings.ts`, `useModels.ts` - State management hooks
- `stores/settingsStore.ts` - Zustand store for settings
- `bindings.ts` - Auto-generated Tauri type bindings (via tauri-specta)
- `overlay/` - Recording overlay window code

### Key Patterns

**Manager Pattern:** Core functionality organized into managers (Audio, Model, Transcription) initialized at startup and managed via Tauri state.

**Command-Event Architecture:** Frontend → Backend via Tauri commands; Backend → Frontend via events.

**Pipeline Processing:** Audio → VAD → Whisper/Parakeet → Text → Post-Processing (LLM) → Clipboard/Paste

**State Flow:** Zustand → Tauri Command → Rust State → Persistence (tauri-plugin-store)

## Post-Processing Provider System

This is the core system that the Ollama integration extends.

### How providers work

1. **Provider definition** (`settings.rs::PostProcessProvider`): id, label, base_url, models_endpoint, supports_structured_output
2. **Provider list** (`settings.rs::default_post_process_providers()`): Built-in providers registered here
3. **API communication** (`llm_client.rs`): Uses OpenAI-compatible `/chat/completions` endpoint
4. **Model listing** (`llm_client.rs::fetch_models()`): Fetches from provider's `/models` endpoint
5. **Auth**: Bearer token by default, provider-specific overrides for Anthropic (x-api-key) and Gemini (x-goog-api-key)

### Current providers

| Provider | ID | Base URL | Auth | Structured Output |
|----------|-----|----------|------|-------------------|
| OpenAI | `openai` | `api.openai.com/v1` | Bearer | Yes |
| Z.AI | `zai` | `api.z.ai/api/paas/v4` | Bearer | Yes |
| OpenRouter | `openrouter` | `openrouter.ai/api/v1` | Bearer | Yes |
| Anthropic | `anthropic` | `api.anthropic.com/v1` | x-api-key | No |
| Groq | `groq` | `api.groq.com/openai/v1` | Bearer | No |
| Cerebras | `cerebras` | `api.cerebras.ai/v1` | Bearer | Yes |
| Apple Intelligence | `apple_intelligence` | local (native) | None | Yes |
| Gemini | `gemini` | Custom client | x-goog-api-key | No |
| Custom | `custom` | `localhost:11434/v1` | Bearer | No |

**Note:** The "Custom" provider already defaults to Ollama's URL (`localhost:11434/v1`), but lacks dedicated UX (no API key skip, no connection check, no Ollama branding).

### Adding a new provider (checklist)

1. `src-tauri/src/settings.rs` — Add to `default_post_process_providers()`
2. `src-tauri/src/llm_client.rs` — Handle any auth/API differences (if OpenAI-compatible, nothing to change)
3. `src/components/settings/` — Add provider icon/UI if needed
4. `src/i18n/locales/*/translation.json` — Add i18n strings

### Ollama specifics for integration

- **Base URL**: `http://localhost:11434/v1` (OpenAI-compatible endpoint)
- **Auth**: None required (local server)
- **Models endpoint**: `/models` works via OpenAI compat, also `/api/tags` natively
- **Structured output**: Ollama supports JSON mode but NOT strict JSON schema — set `supports_structured_output: false`
- **Connection check**: Should verify Ollama is running before use (GET `http://localhost:11434/`)
- **Port**: Configurable (allow_base_url_edit: true)

## Internationalization (i18n)

All user-facing strings must use i18next translations. ESLint enforces this (no hardcoded strings in JSX).

**Adding new text:**

1. Add key to `src/i18n/locales/en/translation.json`
2. Use in component: `const { t } = useTranslation(); t('key.path')`

**File structure:**

```
src/i18n/
├── index.ts           # i18n setup
├── languages.ts       # Language metadata
└── locales/
    ├── en/translation.json  # English (source)
    ├── es/translation.json  # Spanish
    ├── fr/translation.json  # French
    └── vi/translation.json  # Vietnamese
```

## Code Style

**Rust:**

- Run `cargo fmt` and `cargo clippy` before committing
- Handle errors explicitly (avoid unwrap in production)
- Use descriptive names, add doc comments for public APIs

**TypeScript/React:**

- Strict TypeScript, avoid `any` types
- Functional components with hooks
- Tailwind CSS for styling
- Path aliases: `@/` → `./src/`

## Commit Guidelines

Use conventional commits:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation
- `refactor:` code refactoring
- `chore:` maintenance

## CLI Parameters

Parler supports command-line parameters on all platforms for integration with scripts, window managers, and autostart configurations.

**Implementation files:**

- `src-tauri/src/cli.rs` - CLI argument definitions (clap derive)
- `src-tauri/src/main.rs` - Argument parsing before Tauri launch
- `src-tauri/src/lib.rs` - Applying CLI overrides (setup closure + single-instance callback)
- `src-tauri/src/signal_handle.rs` - `send_transcription_input()` reusable function

**Available flags:**

| Flag                     | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `--toggle-transcription` | Toggle recording on/off on a running instance (via `tauri_plugin_single_instance`) |
| `--toggle-post-process`  | Toggle recording with post-processing on/off on a running instance                 |
| `--cancel`               | Cancel the current operation on a running instance                                 |
| `--start-hidden`         | Launch without showing the main window (tray icon still visible)                   |
| `--no-tray`              | Launch without the system tray icon (closing window quits the app)                 |
| `--debug`                | Enable debug mode with verbose (Trace) logging                                     |

**Key design decisions:**

- CLI flags are runtime-only overrides — they do NOT modify persisted settings
- Remote control flags (`--toggle-transcription`, `--toggle-post-process`, `--cancel`) work by launching a second instance that sends its args to the running instance via `tauri_plugin_single_instance`, then exits
- `send_transcription_input()` in `signal_handle.rs` is shared between signal handlers and CLI to avoid code duplication
- `CliArgs` is stored in Tauri managed state (`.manage()`) so it's accessible in `on_window_event` and other handlers

## Debug Mode

Access debug features: `Cmd+Shift+D` (macOS) or `Ctrl+Shift+D` (Windows/Linux)

## Platform Notes

- **macOS**: Metal acceleration, accessibility permissions required
- **Windows**: Vulkan acceleration, code signing
- **Linux**: OpenBLAS + Vulkan, limited Wayland support, overlay disabled by default
