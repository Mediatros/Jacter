# Jacter

> **Personal fork of [Melvynx/Parler](https://github.com/Melvynx/Parler)** (itself a fork of [cjpais/Handy](https://github.com/cjpais/Handy)).
> Jacter extends Parler with Ollama as a dedicated local post-processing provider and air-gap-friendly update management.

---

## What Jacter Adds

### Ollama Local Provider

- **Dedicated Ollama entry** in the post-processing provider list — no longer hidden under the generic "Custom" provider
- **No API key required** — Ollama runs locally, so authentication is skipped
- **Configurable port** — the base URL is editable directly in settings (`http://localhost:11434/v1` by default)
- **OpenAI-compatible endpoint** — uses Ollama's `/v1/chat/completions` API transparently
- **Structured output disabled** — Ollama supports JSON mode but not strict schema, handled correctly

### Air-Gap Friendly Update Management

- **No automatic update checks** — the app makes zero network requests on startup regarding updates
- **Manual check button** in Settings → About — click to check, see results, download if needed
- **Verbose error reporting** — if a proxy blocks the request, the full error message is shown along with a hint about GitHub HTTPS connectivity
- **Update states**: Checking → Up to date / Version X.Y.Z available → Downloading (with progress) → Installing

### Rebranding

- **Jacter** product name, `com.mediatros.jacter` app identifier
- Separate development build identifier for running dev and production side-by-side

---

## What Parler Added (Inherited)

### Multi-Provider Post-Processing

- **Unified provider system** — post-process transcriptions with AI: OpenAI, Groq, Cerebras, Anthropic, OpenRouter, Gemini, Apple Intelligence (macOS ARM64), Ollama (Jacter addition)
- **Saved processing models** — save provider + model combinations for quick reuse
- **Numbered actions (1–9)** — up to 9 custom post-processing actions with their own prompt and model, triggered via keyboard shortcuts during recording
- **Post-processing promoted to stable** — its own settings tab, no longer behind experimental
- **System prompt enforcement** — action processing outputs only the final processed text

### History Improvements

- **Post-processing tracking** — stores which action was used, shows original and post-processed text side by side
- **Model name tracking** — history entries record which transcription model was used
- **History reprocessing** — re-transcribe previously recorded audio with a different model directly from history

### Recording Overlay Redesign

- **Minimal overlay UI** — border-based style
- **Pause/Resume** — pause and resume recording with a dedicated shortcut (F6) and overlay button
- **Double-press cancel confirmation** — cancel requires two presses within 1.5 s to prevent accidental cancellations
- **Multi-monitor support** — intelligent fallback across monitors, handles mixed-DPI setups on macOS

### Audio & System Integration

- **Mute-aware audio feedback** — skips feedback sounds when system volume is muted (macOS + Windows)
- **Recommended model badges** — Parakeet V3 and Whisper Turbo marked as "Recommended" in the model selector

### CLI Parameters

See [CLI Parameters](#cli-parameters) below.

---

## How It Works

1. **Press** a configurable keyboard shortcut to start/stop recording (or use push-to-talk mode)
2. **Speak** your words while the shortcut is active
3. **Release** and Jacter processes your speech using Whisper or Parakeet
4. **Get** your transcribed text pasted directly into whatever app you're using

The process is entirely local:

- Silence is filtered using VAD (Voice Activity Detection) with Silero
- Transcription uses your choice of models:
  - **Whisper models** (Small/Medium/Turbo/Large) with GPU acceleration when available
  - **Parakeet V3** — CPU-optimized, excellent performance, automatic language detection
- Optionally post-processed by a local or cloud LLM

---

## Quick Start

### Installation

1. Download the latest release from the [releases page](https://github.com/Mediatros/Jacter/releases)
2. Install the application
3. Launch Jacter and grant necessary system permissions (microphone, accessibility)
4. Configure your preferred keyboard shortcuts in Settings
5. Start transcribing!

### Build locally (recommended for corporate Macs)

If your machine does not accept unsigned applications, build Jacter directly on your Mac. An app compiled locally is never flagged by Gatekeeper because it was never downloaded from the internet.

#### Step 1 — Check prerequisites

Run each command and check the expected output. If a command is not found, follow the install link.

**Xcode Command Line Tools** (compiler, git, cmake — all in one)

```bash
xcode-select -p
# Expected: /Library/Developer/CommandLineTools  (or /Applications/Xcode.app/...)
# Not found? Run: xcode-select --install
```

**Homebrew** (package manager — optional but makes the rest easier)

```bash
brew --version
# Expected: Homebrew 4.x.x
# Not found? /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Rust** (the compiler for the backend)

```bash
rustc --version
# Expected: rustc 1.8x.x (...)
# Not found? curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
#            then: source "$HOME/.cargo/env"
```

```bash
cargo --version
# Expected: cargo 1.8x.x (...)
# Not found? Same install as Rust above — cargo comes with rustup
```

**Bun** (JavaScript runtime and package manager for the frontend)

```bash
bun --version
# Expected: 1.x.x
# Not found? curl -fsSL https://bun.sh/install | bash
```

**CMake** (required by some native dependencies)

```bash
cmake --version
# Expected: cmake version 3.x.x
# Not found? brew install cmake
```

**Git** (to clone the repo)

```bash
git --version
# Expected: git version 2.x.x
# Not found? xcode-select --install  (includes git)
```

Once all six commands return a version number, you are ready.

---

#### Step 2 — Clone the repo

```bash
git clone https://github.com/Mediatros/Jacter.git
cd Jacter
```

#### Step 3 — Install dependencies

```bash
bun install
```

Expected: packages installed with no errors. Warnings are fine.

#### Step 4 — Download the VAD model

This file is required at runtime for voice activity detection. Without it the app will fail to start.

```bash
mkdir -p src-tauri/resources/models
curl -o src-tauri/resources/models/silero_vad_v4.onnx \
     https://blob.handy.computer/silero_vad_v4.onnx
```

Verify:

```bash
ls -lh src-tauri/resources/models/silero_vad_v4.onnx
# Expected: a file around 2.3 MB
```

#### Step 5 — Build

```bash
bun run tauri build
```

The first build downloads and compiles all Rust dependencies — this takes **10 to 30 minutes** depending on your machine. Subsequent builds are much faster.

If you get a CMake error:

```bash
CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri build
```

#### Step 6 — Install

The compiled app is at:

```
src-tauri/target/release/bundle/macos/Jacter.app
```

Copy it to your Applications folder:

```bash
cp -R src-tauri/target/release/bundle/macos/Jacter.app /Applications/
```

Then launch it from Spotlight or `/Applications`. No certificate warning, no Gatekeeper block.

---

#### Updating to a new version

```bash
cd Jacter
git pull origin main
bun install          # in case frontend deps changed
bun run tauri build
cp -R src-tauri/target/release/bundle/macos/Jacter.app /Applications/
```

---

## Architecture

Jacter is built as a Tauri 2.x application combining:

- **Frontend**: React + TypeScript with Tailwind CSS for the settings UI
- **Backend**: Rust for system integration, audio processing, and ML inference
- **Core Libraries**:
  - `whisper-rs`: Local speech recognition with Whisper models
  - `transcription-rs`: CPU-optimized speech recognition with Parakeet models
  - `cpal`: Cross-platform audio I/O
  - `vad-rs`: Voice Activity Detection
  - `rdev`: Global keyboard shortcuts and system events
  - `rubato`: Audio resampling

### Debug Mode

Access debug features by pressing:

- **macOS**: `Cmd+Shift+D`
- **Windows/Linux**: `Ctrl+Shift+D`

### CLI Parameters

Jacter supports command-line flags for controlling a running instance and customizing startup behavior on all platforms.

**Remote control flags** (sent to an already-running instance via the single-instance plugin):

```bash
jacter --toggle-transcription    # Toggle recording on/off
jacter --toggle-post-process     # Toggle recording with post-processing on/off
jacter --cancel                  # Cancel the current operation
```

**Startup flags:**

```bash
jacter --start-hidden            # Start without showing the main window
jacter --no-tray                 # Start without the system tray icon
jacter --debug                   # Enable debug mode with verbose logging
jacter --help                    # Show all available flags
```

Flags can be combined:

```bash
jacter --start-hidden --no-tray
```

> **macOS tip:** When Jacter is installed as an app bundle, invoke the binary directly:
>
> ```bash
> /Applications/Jacter.app/Contents/MacOS/Jacter --toggle-transcription
> ```

---

## Known Issues & Current Limitations

### Major Issues (Help Wanted)

**Whisper Model Crashes:**

- Whisper models crash on certain system configurations (Windows and Linux)
- Does not affect all systems — if you experience crashes and are a developer, please help and provide debug logs

**Wayland Support (Linux):**

- Limited support for Wayland display server
- Requires [`wtype`](https://github.com/atx/wtype) or [`dotool`](https://sr.ht/~geb/dotool/) for text input (see [Linux Notes](#linux-notes) below)

### Linux Notes

**Text Input Tools:**

| Display Server | Recommended Tool | Install Command                                    |
| -------------- | ---------------- | -------------------------------------------------- |
| X11            | `xdotool`        | `sudo apt install xdotool`                         |
| Wayland        | `wtype`          | `sudo apt install wtype`                           |
| Both           | `dotool`         | `sudo apt install dotool` (requires `input` group) |

- **dotool setup**: `sudo usermod -aG input $USER` then log out and back in
- Without these tools, Jacter falls back to enigo which may have limited Wayland compatibility

**Other Notes:**

- **`libgtk-layer-shell.so.0`**: If startup fails with a missing library error, install:

  | Distro        | Package               | Command                                |
  | ------------- | --------------------- | -------------------------------------- |
  | Ubuntu/Debian | `libgtk-layer-shell0` | `sudo apt install libgtk-layer-shell0` |
  | Fedora/RHEL   | `gtk-layer-shell`     | `sudo dnf install gtk-layer-shell`     |
  | Arch Linux    | `gtk-layer-shell`     | `sudo pacman -S gtk-layer-shell`       |

- The recording overlay is **disabled by default on Linux** (`Overlay Position: None`) because certain compositors treat it as the active window and steal focus, which prevents pasting back into the right application
- If you have rendering issues, try `WEBKIT_DISABLE_DMABUF_RENDERER=1`

**Global keyboard shortcuts on Wayland:**

On Wayland, system-level shortcuts must be configured through your desktop environment. Use the [CLI flags](#cli-parameters) as the command.

*GNOME:*

1. Settings → Keyboard → Custom Shortcuts → **+**
2. Name: `Toggle Jacter`, Command: `jacter --toggle-transcription`, set your shortcut

*KDE Plasma:*

1. System Settings → Shortcuts → Custom Shortcuts → Edit → New → Global Shortcut → Command/URL
2. Trigger: your key combination, Action: `jacter --toggle-transcription`

*Sway / i3:*

```ini
bindsym $mod+o exec jacter --toggle-transcription
```

*Hyprland:*

```ini
bind = $mainMod, O, exec, jacter --toggle-transcription
```

**Unix signals (alternative to CLI flags):**

| Signal    | Action                                    | Example                  |
| --------- | ----------------------------------------- | ------------------------ |
| `SIGUSR2` | Toggle transcription                      | `pkill -USR2 -n jacter`  |
| `SIGUSR1` | Toggle transcription with post-processing | `pkill -USR1 -n jacter`  |

Example Sway config:

```ini
bindsym $mod+o exec pkill -USR2 -n jacter
bindsym $mod+p exec pkill -USR1 -n jacter
```

`pkill` here delivers the signal — it does not terminate the process.

### Platform Support

- **macOS** (Intel and Apple Silicon)
- **x64 Windows**
- **x64 Linux**

### System Requirements

**Whisper Models:**

- **macOS**: M series Mac, Intel Mac
- **Windows**: Intel, AMD, or NVIDIA GPU
- **Linux**: Intel, AMD, or NVIDIA GPU (Ubuntu 22.04 / 24.04)

**Parakeet V3 Model:**

- **CPU-only** — runs on a wide variety of hardware
- **Minimum**: Intel Skylake (6th gen) or equivalent AMD
- **Performance**: ~5× real-time speed on mid-range hardware
- **Automatic language detection** — no manual language selection required

---

## Troubleshooting

### Manual Model Installation (For Proxy / Restricted Networks)

If Jacter cannot download models automatically, you can place them manually.

#### Step 1: Find Your App Data Directory

Open Settings → About → "App Data Directory". Typical paths:

- **macOS**: `~/Library/Application Support/com.mediatros.jacter/`
- **Windows**: `C:\Users\{username}\AppData\Roaming\com.mediatros.jacter\`
- **Linux**: `~/.config/com.mediatros.jacter/`

#### Step 2: Create the Models Directory

```bash
# macOS/Linux
mkdir -p "~/Library/Application Support/com.mediatros.jacter/models"

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "$env:APPDATA\com.mediatros.jacter\models"
```

#### Step 3: Download Model Files

**Whisper Models (single `.bin` files):**

- Small (487 MB): `https://blob.handy.computer/ggml-small.bin`
- Medium (492 MB): `https://blob.handy.computer/whisper-medium-q4_1.bin`
- Turbo (1600 MB): `https://blob.handy.computer/ggml-large-v3-turbo.bin`
- Large (1100 MB): `https://blob.handy.computer/ggml-large-v3-q5_0.bin`

**Parakeet Models (compressed archives):**

- V2 (473 MB): `https://blob.handy.computer/parakeet-v2-int8.tar.gz`
- V3 (478 MB): `https://blob.handy.computer/parakeet-v3-int8.tar.gz`

#### Step 4: Install

**Whisper:** place the `.bin` directly in the `models` directory.

**Parakeet:** extract the `.tar.gz` and place the extracted directory in `models`. Directory names must be exact:

```
{app_data_dir}/models/
├── ggml-small.bin
├── parakeet-tdt-0.6b-v2-int8/
└── parakeet-tdt-0.6b-v3-int8/
```

After placing the files, restart Jacter. The models will appear as "Downloaded" in Settings → Models.

### Custom Whisper Models

Jacter auto-discovers custom Whisper GGML models (`.bin`) placed in the `models` directory. They appear in the "Custom Models" section of Settings → Models.

### Checking for Updates Behind a Proxy

Jacter never checks for updates automatically. To check manually: Settings → About → **Check for updates**.

If the check fails, the full error is displayed. Common cause: the proxy blocks outbound HTTPS to `github.com` or `objects.githubusercontent.com`. Configure your proxy to allow these domains, or download the update manually from the [releases page](https://github.com/Mediatros/Jacter/releases).

---

## License

MIT License — see [LICENSE](LICENSE) for details.

## Acknowledgments

- **[Melvynx/Parler](https://github.com/Melvynx/Parler)** — the direct upstream fork this project is based on
- **[cjpais/Handy](https://github.com/cjpais/Handy)** — the original project
- **Whisper** by OpenAI for the speech recognition model
- **whisper.cpp and ggml** by Georgi Gerganov for cross-platform inference
- **Silero** for lightweight VAD
- **Tauri** for the Rust-based app framework
- **Ollama** for making local LLM inference accessible
