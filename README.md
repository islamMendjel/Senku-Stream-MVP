# 🧪 SENKU STREAM // ARCH IPTV SYNTHESIZER

> Production-quality, keyboard-driven Xtream Codes / M3U IPTV Web Player & PWA designed with Hyprland tiling and Kitty terminal aesthetics.

```
       _____ ______ _   _ _  ___   _    _____ _______ _____  ______          __  __ 
      / ____|  ____| \ | | |/ / | | |  / ____|__   __|  __ \|  ____|   /\   |  \/  |
     | (___ | |__  |  \| | ' /| | | | | (___    | |  | |__) | |__     /  \  | \  / |
      \___ \|  __| | . ` |  < | | | |  \___ \   | |  |  _  /|  __|   / /\ \ | |\/| |
      ____) | |____| |\  | . \| |_| |  ____) |  | |  | | \ \| |____ / ____ \| |  | |
     |_____/|______|_| \_|_|\_\\___/  |_____/   |_|  |_|  \_\______/_/    \_\_|  |_|
```

---

## ⚡ Core Architecture

- **Single URL Synthesis**: Paste any standard Xtream Codes or M3U Plus URL (e.g. `http://host:port/get.php?username=U&password=P&type=m3u_plus&output=m3u8`).
- **Dual-Mode Gateway Ingestion**:
  1. **Xtream Codes API Handshake**: Automatically queries `player_api.php`, pulls account expiry, active/max connections, and categorizes Live TV, VOD, and Series.
  2. **Streaming M3U Web Worker Fallback**: If the provider disables or fails the Xtream API, downloads the M3U playlist via chunked transfer and parses 100MB+ playlists in a background Web Worker without dropping a single frame of UI responsiveness.
- **Node.js Express Proxy Gateway**:
  - **CORS & Mixed-Content**: Resolves HTTP/HTTPS mixed-content blocks modern browsers enforce.
  - **Header Spoofing**: Mimics VLC media player (`VLC/3.0.18 LibVLC/3.0.18`).
  - **HLS Segment Rewriting**: Parses `.m3u8` manifests on the fly and proxies all variant streams, `.ts` / `.m4s` chunks, and encryption keys through `/api/stream`.
  - **Video Range Requests**: Supports `206 Partial Content` and byte-range seeking for instantaneous movie and series scrubbing.
  - **SSRF Guard**: Resolves DNS and drops all loopback, private RFC-1918, link-local, carrier-grade NAT, and cloud metadata IP ranges (`169.254.169.254`, `127.0.0.1`, `10.0.0.0/8`, `fc00::/7`).
  - **Single-User Security**: Optional `APP_PASSWORD` env var for private deployments.
- **Client Performance**:
  - **Virtualization**: `@tanstack/react-virtual` renders 20,000+ items smoothly at 60 FPS.
  - **IndexedDB**: Persistent client-side catalog storage via `idb`.
  - **HLS.js Engine**: Automatic bitrate stepping, codec error recovery, and auto-fallback from `.m3u8` to `.ts`.
  - **Watch Progress**: Automatically saves positions and offers one-click resume.
  - **Series Autoplay**: Automatically queues and plays the next episode upon conclusion.

---

## 🎨 Design Specification (Senku / Rick Sanchez Arch Rice)

- **Color Matrix**:
  - Void: `#0a0b10`
  - Surface: `#131722`
  - Border Dim: `#1f293d`
  - Portal Neon Green: `#00ff88` → `#39ff14` (Active beacon, telemetry locks)
  - Cyan: `#57c7ff` / `#00d2ff` (Primary actions, focus rings)
  - Amber: `#ffb86c` (Ratings, warnings, favorites)
  - Danger: `#ff5555` (Dimension breaches, errors)
- **Typography**:
  - JetBrains Mono with tabular figures and ligatures.
  - Bracket badges: `[ LIVE ]`, `[ 1080p ]`, `[ 4.2 Mbps ]`, `[ S01E03 ]`.
- **Hyprland Tiling**:
  - 8–12px radius, 8px panel gaps.
  - Active panel gradient border `linear-gradient(135deg, #00ff88, #57c7ff)`.
  - Waybar top status capsule with real-time clock, stream telemetry, and workspace pills `[1 LIVE] [2 MOVIES] [3 SERIES]`.
  - Kitty terminal player overlay: `❯ senku@iptv ~ $ playing "..." [ 1080p · 4.2 Mbps ]`.

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Context |
| :--- | :--- | :--- |
| `Space` | Play / Pause | Player |
| `F` | Toggle Fullscreen | Player |
| `M` | Toggle Mute | Player |
| `←` / `→` | Seek -10s / +10s | VOD / Series |
| `↑` / `↓` | Volume Up / Down (or Channel Up / Down in Live List) | Global |
| `N` / `P` | Next / Previous Channel | Live Player |
| `~` / `` ` `` | Toggle Kitty Terminal Overlay | Player |
| `/` | Focus Catalog Search Bar | Global |
| `Esc` | Close Player or Modal | Global |

---

## 🚀 Quickstart & Local Development

### 1. Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`

### 2. Installation
```bash
# Clone and enter directory
cd senku-test

# Install dependencies
npm install
```

### 3. Launch Development Environment
```bash
# Starts Express Proxy Gateway on http://localhost:3001
# Starts Vite Frontend on http://localhost:5173
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🏗️ Production Build & Local Run

```bash
# Compile TypeScript and bundle Vite SPA into dist/client
npm run build

# Start the unified production server on port 3001
npm start
```

Visit `http://localhost:3001`.

---

## 🐳 Docker Deployment

### Multi-stage Docker Build
```bash
# Build the Docker image
docker build -t senku-stream .

# Run the container
docker run -d \
  --name senku-stream \
  -p 3001:3001 \
  -e APP_PASSWORD="your-secure-password" \
  --restart unless-stopped \
  senku-stream
```

### Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  senku-stream:
    image: senku-stream:latest
    build: .
    container_name: senku-stream
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - APP_PASSWORD=your-secret-key-here
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3001/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

---

## 🌐 Production VPS & Reverse Proxy (Nginx)

When deploying to a VPS (Ubuntu/Debian/Arch) with Nginx and Let's Encrypt SSL:

```nginx
server {
    server_name iptv.yourdomain.com;

    # Maximum playlist upload / stream buffer
    client_max_body_size 250M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;

        # WebSocket & connection upgrade support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # Range requests & streaming chunks
        proxy_set_header Range $http_range;
        proxy_set_header If-Range $http_if_range;
        proxy_buffering off;
        proxy_cache off;

        # Timeouts for 100MB+ playlists
        proxy_connect_timeout 60s;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

Enable SSL:
```bash
sudo certbot --nginx -d iptv.yourdomain.com
```

---

## 🛡️ Security Architecture

1. **Zero Credential Logging**: Passwords are never outputted to terminal logs or browser developer tools.
2. **Password Masking**: The settings UI renders sensitive credentials as `••••••••`.
3. **SSRF Hardening**: Resolves all DNS entries and drops any connection destined to:
   - `127.0.0.0/8`, `::1` (Loopback)
   - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7` (Private)
   - `169.254.0.0/16`, `fe80::/10` (Link-Local & Cloud Metadata)
   - Carrier-grade NAT (`100.64.0.0/10`) and Multicast ranges.
4. **App Authentication**: Single-user proxy access protected with `APP_PASSWORD`.

---

## 🔬 Scientific Microcopy Matrix

- `SYNC` → **Synthesis**
- `Loading` → **Telemetry incoming…**
- `Error / Failed` → **Dimension breach: [details]**
- `Empty State` → **Null set. No signal.**
- `Connected` → **Signal locked.**
- `Settings` → **Terminal Settings // Config**
- `Play` → **Engage Signal / Engage Playback**

---

Made with 🧪 Science and Arch Rice precision.
