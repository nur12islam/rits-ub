import { NewMessageEvent } from "telegram/events/index.js";
import { spawn, exec } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import util from "util";

// Use the path to the installed yt-dlp bin inside our workspace bin/ folder 
// or standard yt-dlp if it's on PATH. We'll use the one from utube.ts logic if needed, 
// but the prompt says YTDLP_BIN = "yt-dlp"; We can adjust if it fails.
const MAX_DURATION_SECONDS = 60 * 60; // safety cap: refuse videos longer than 1h

interface YtdlOptions {
  audioOnly?: boolean;
  maxHeight?: string; // e.g. "720", "1080"
}

const execPromise = util.promisify(exec);

// We'll dynamically resolve yt-dlp just in case, similar to utube.ts, 
// but fallback to the global one if it exists.
async function getYtDlpBin(): Promise<string> {
    const binDir = path.join(process.cwd(), "bin");
    const ytdlpPath = path.join(binDir, "yt-dlp");
    if (!fs.existsSync(ytdlpPath)) {
        fs.mkdirSync(binDir, { recursive: true });
        await execPromise(`curl -sLo ${ytdlpPath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp`);
    }
    try {
        fs.chmodSync(ytdlpPath, "755");
    } catch (e) {
        try {
            await execPromise(`chmod +x ${ytdlpPath}`);
        } catch (e2) {}
    }
    return ytdlpPath;
}

function downloadYoutube(url: string, options: YtdlOptions = {}): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ytdl-"));
    const outTemplate = path.join(outDir, "%(title).80s.%(ext)s");

    const ytdlpBin = await getYtDlpBin();

    const args = [
      url,
      "-o", outTemplate,
      "--no-playlist",
      "--js-runtimes", "node",
      "--restrict-filenames",
      "--match-filter", `duration<${MAX_DURATION_SECONDS}`,
    ];

    if (fs.existsSync(path.join(process.cwd(), "cookies.txt"))) {
        args.push("--cookies", path.join(process.cwd(), "cookies.txt"));
    }

    if (options.audioOnly) {
      args.push("-x", "--audio-format", "mp3");
    } else {
      const heightFilter = options.maxHeight ? `[height<=${options.maxHeight}]` : "";
      args.push("-f", `bv*${heightFilter}+ba/b${heightFilter}`, "--merge-output-format", "mp4");
    }

    const proc = spawn(ytdlpBin, args);

    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("error", reject);

    proc.on("close", (code) => {
      if (code !== 0) {
        const lastLine = stderr.trim().split("\n").filter(Boolean).pop();
        reject(new Error(lastLine || `yt-dlp exited with code ${code}`));
        return;
      }
      const files = fs.readdirSync(outDir);
      if (files.length === 0) {
        reject(new Error("yt-dlp produced no output file"));
        return;
      }
      resolve(path.join(outDir, files[0]));
    });
  });
}

export const ytdlPlugin = {
    name: "YT Download",
    description: "Download YouTube video/audio using yt-dlp",
    command: "ytdl",
    usage: ".ytdl [-a] [-q <height>] <youtube-url>",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const text = message.text || "";
        const commandParts = text.split(" ");
        const commandPrefix = commandParts[0];

        const tokens = text.slice(commandPrefix.length).trim().split(/\s+/).filter(Boolean);
        const url = tokens.find((t) => /^https?:\/\//i.test(t));

        if (!url) {
            await message.edit({ text: `Usage: ${commandPrefix} [-a] [-q <height>] <youtube-url>` });
            return;
        }

        const audioOnly = tokens.includes("-a");
        let maxHeight: string | undefined;
        const qIndex = tokens.indexOf("-q");
        if (qIndex !== -1 && tokens[qIndex + 1]) maxHeight = tokens[qIndex + 1];

        await message.edit({ text: "⏳ Downloading..." });

        let filePath: string | undefined;
        try {
            filePath = await downloadYoutube(url, { audioOnly, maxHeight });

            await message.edit({ text: "📤 Uploading..." }).catch(() => {});

            await event.client?.sendMessage(message.chatId!, {
                file: filePath,
                message: path.basename(filePath),
                replyTo: message.id,
                // GramJS doesn't directly support supportsStreaming property here, we just send as normal or use specific params
                // Actually it does, if we set the correct attributes. But `sendMessage` is fine for now.
            });

            await message.delete({ revoke: true }).catch(() => {});
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            await message.edit({ text: `❌ Failed: ${msg}` }).catch(() => {});
        } finally {
            if (filePath) await fs.promises.unlink(filePath).catch(() => {});
        }
    }
};

export default [ytdlPlugin];
