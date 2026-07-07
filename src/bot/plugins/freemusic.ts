import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";
import { exec, spawn } from "child_process";

const execPromise = util.promisify(exec);

async function getYtDlpBin(): Promise<string> {
    const binDir = path.join(process.cwd(), "bin");
    const ytdlpPath = path.join(binDir, "yt-dlp");
    if (fs.existsSync(ytdlpPath)) {
        return ytdlpPath;
    }
    fs.mkdirSync(binDir, { recursive: true });
    await execPromise(`curl -sLo ${ytdlpPath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x ${ytdlpPath}`);
    return ytdlpPath;
}

export const freemusicPlugin = {
    name: "FreeMusic",
    description: "Search and download full songs using YouTube search.",
    command: "song",
    usage: ".song [song name]",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const query = text.split(" ").slice(1).join(" ").trim();

        if (!query) {
            await event.message.edit({ text: "Please provide a song to search. Usage: `.song [song name]`" });
            return;
        }

        await event.message.edit({ text: `Searching and downloading \`${query}\`...` });

        try {
            const ytdlpBin = await getYtDlpBin();
            const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "song-"));
            const outTemplate = path.join(outDir, "%(title).80s.%(ext)s");

            const args = [
                `ytsearch1:${query} audio`,
                "-o", outTemplate,
                "--no-playlist",
                "-x", "--audio-format", "mp3",
                "--restrict-filenames"
            ];
            
            if (fs.existsSync(path.join(process.cwd(), "cookies.txt"))) {
                args.push("--cookies", path.join(process.cwd(), "cookies.txt"));
            }

            const proc = spawn(ytdlpBin, args);

            let stderr = "";
            proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));

            await new Promise<void>((resolve, reject) => {
                proc.on("error", reject);
                proc.on("close", (code) => {
                    if (code !== 0) {
                        const lastLine = stderr.trim().split("\n").filter(Boolean).pop();
                        reject(new Error(lastLine || `yt-dlp exited with code ${code}`));
                    } else {
                        resolve();
                    }
                });
            });

            const files = fs.readdirSync(outDir);
            if (files.length === 0) {
                await event.message.edit({ text: `Could not find any music for \`${query}\`.` });
                return;
            }
            
            const filePath = path.join(outDir, files[0]);

            await event.message.edit({ text: "Uploading 📤..." });

            await event.client?.sendMessage(event.message.chatId!, {
                file: filePath,
                message: `**${query}**\n*Downloaded via .song*`
            });
            
            await event.message.delete();

            // Clean up
            fs.unlinkSync(filePath);

        } catch (e: any) {
            await event.message.edit({ text: `Error: ${e.message}` });
        }
    }
};

export default [freemusicPlugin];
