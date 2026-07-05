# RITS - Advanced Modular Telegram Userbot

RITS is a highly modular, feature-rich Telegram Userbot built on top of the MTProto protocol using [GramJS](https://gram.js.org/) and TypeScript. It acts as an extension of your own Telegram account, automating tasks, providing utility commands, and integrating with advanced APIs right inside your chats.

## 🚀 Core Features

- **Extensive Plugin Ecosystem:** Over 50+ built-in modules dynamically loaded at runtime, keeping the core lightweight and responsive.
- **Group Administration:** Advanced moderation tools including `.ban`, `.mute`, `.kick`, `.purge`, `.pin`, and promotion commands to effortlessly maintain order in your chats.
- **Fun & Entertainment:** Spice up your conversations with engaging commands like `.meme`, `.joke`, `.slap`, `.vapor`, `.shrug`, and `.mock`.
- **Utilities & Tools:** A wide range of handy tools right at your fingertips, including `.weather`, `.tr` (translate), `.calc` (calculator), `.speedtest`, `.ping`, and `.sysinfo`.
- **Web Automation:** Take full-page headless screenshots using Puppeteer (`.webss`) with custom `.puppeteerrc` caching.
- **Media Manipulation:** Image background removal (remove.bg), text recognition (OCR.space), and YouTube downloading capabilities out of the box.
- **Data Persistence:** MongoDB integration for robust state management and tracking.
- **Inline Assistant Bot:** Optionally run a companion bot side-by-side for inline queries and interactive button menus.

## 🤓 Nerd Specs

- **Architecture:** Node.js backend utilizing ES Modules (`"type": "module"`) with `tsx` for on-the-fly TypeScript execution.
- **Dynamic Module Loading:** The plugin manager resolves and mounts commands dynamically, allowing hot-swappable plugins without modifying core routing logic.
- **Protocol:** Operates on Telegram's raw MTProto via GramJS, ensuring authentic user-level API interactions (no `/` prefix required).
- **Runtime Environment:** Container-ready setup using `esbuild` to bundle the backend into a single `server.cjs` file, bypassing ESM relative path constraints for production deployments.
- **Web & API Proxying:** An Express server runs concurrently, capable of serving a React/Vite frontend on port 3000 while handling MTProto background polling.
- **Arbitrary Execution:** Features `.eval` and `.exec` commands for runtime JavaScript execution and shell commands (restricted to sudo users).

## 🛠️ Environment Setup

Rename `.env.example` to `.env` and fill in the required variables:

```env
TELEGRAM_API_ID="YOUR_API_ID"
TELEGRAM_API_HASH="YOUR_API_HASH"
TELEGRAM_SESSION_STRING="YOUR_SESSION_STRING"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
MONGO_URL="YOUR_MONGO_URL"
```

## 📦 Installation & Deployment

1. **Install Dependencies:**
   ```bash
   npm install
   ```
   *(Note: The `postinstall` script automatically installs the necessary Chromium binaries for Puppeteer.)*

2. **Development Mode:**
   ```bash
   npm run dev
   ```

3. **Production Build:**
   ```bash
   npm run build
   npm start
   ```

## 📖 Command Reference

You can access the full list of commands directly inside Telegram using the `.help` command. RITS organizes commands into logical categories (Tools, Media, Admin, General, etc.) for easy navigation.

---
*Developed for power users who want absolute control over their Telegram experience.*
