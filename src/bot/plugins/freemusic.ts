import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";
import path from "path";
import os from "os";
import util from "util";
import { exec, spawn } from "child_process";
import yts from "yt-search";
import { botClient, assistantBot } from "../index.js";
import { Button } from "telegram/tl/custom/button.js";
import { Api } from "telegram";

const execPromise = util.promisify(exec);

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

export const songSearchCache = new Map<string, any[]>();

export async function downloadAndSendSong(chatId: string | number, videoId: string, title: string, eventToEdit?: any) {
    let statusMsg: any;
    try {
        if (eventToEdit) {
            await eventToEdit.answer({ message: "Download started..." }).catch(() => {});
        }
        const peerId = typeof chatId === "string" && /^-?\d+$/.test(chatId) ? BigInt(chatId) : chatId;
        
        statusMsg = await botClient?.sendMessage(peerId, { message: `Downloading \`${title}\`...` });

        const ytdlpBin = await getYtDlpBin();
        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "song-"));
        const outTemplate = path.join(outDir, "%(title).80s.%(ext)s");

        async function runYtDlp(urlArgs: string[]): Promise<void> {
            return new Promise((resolve, reject) => {
                const args = [
                    ...urlArgs,
                    "-o", outTemplate,
                    "--no-playlist",
                    "-x", "--audio-format", "mp3",
                    "--restrict-filenames"
                ];
                if (fs.existsSync(path.join(process.cwd(), "cookies.txt"))) {
                    args.push("--cookies", path.join(process.cwd(), "cookies.txt"));
                }
                const proc = spawn("python3", [ytdlpBin, ...args]);
                let stderr = "";
                proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
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
        }

        try {
            // First try YouTube
            await runYtDlp([`https://www.youtube.com/watch?v=${videoId}`]);
        } catch (ytError: any) {
            console.log("YouTube download failed, trying SoundCloud...", ytError.message);
            if (statusMsg) await statusMsg.edit({ text: `YouTube blocked download. Retrying via SoundCloud...` }).catch(()=>{});
            try {
                // Fallback to SoundCloud search and download first result
                await runYtDlp([`scsearch1:${title}`]);
            } catch (scError: any) {
                throw new Error(`YouTube error: ${ytError.message} | SoundCloud error: ${scError.message}`);
            }
        }

        const files = fs.readdirSync(outDir);
        if (files.length === 0) {
            if (statusMsg) await statusMsg.edit({ text: `Could not download \`${title}\`.` });
            return;
        }
        
        const filePath = path.join(outDir, files[0]);

        if (statusMsg) await statusMsg.edit({ text: "Uploading 📤..." });

        await botClient?.sendMessage(peerId, {
            file: filePath,
            message: `**${title}**\n*Downloaded via .song*`
        });
        
        if (statusMsg) await statusMsg.delete().catch(() => {});

        fs.unlinkSync(filePath);
    } catch (e: any) {
        if (statusMsg) {
            await statusMsg.edit({ text: `Error downloading ${title}: ${e.message}` }).catch(() => {});
        } else {
            const peerId = typeof chatId === "string" && /^-?\d+$/.test(chatId) ? BigInt(chatId) : chatId;
            await botClient?.sendMessage(peerId, { message: `Error downloading ${title}: ${e.message}` });
        }
    }
}

export const freemusicPlugin = {
    name: "FreeMusic",
    description: "Search and download full songs using YouTube search (returns inline buttons).",
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

        if (!assistantBot) {
            await event.message.edit({ text: "Assistant bot is not running. Please configure assistant bot to use inline buttons." });
            return;
        }

        await event.message.edit({ text: `Searching for \`${query}\`...` });

        try {
            const searchResults = await yts(query);
            const videos = searchResults.videos.slice(0, 5);

            if (videos.length === 0) {
                await event.message.edit({ text: `Could not find any music for \`${query}\`.` });
                return;
            }

            const cacheKey = Math.random().toString(36).substring(7);
            songSearchCache.set(cacheKey, videos);

            const assistantMe = await assistantBot.getMe();
            
            // Delete the "Searching..." message since we're going to send an inline message via assistant
            await event.message.delete();

            console.log("Creating inline query for chatId:", event.chatId);
            const inlineQuery = `s_song ${event.chatId} ${cacheKey}`;
            
            const results = await botClient!.invoke(new Api.messages.GetInlineBotResults({
                bot: assistantMe.username,
                peer: event.chatId,
                query: inlineQuery,
                offset: ""
            }));

            if (results && results.results && results.results.length > 0) {
                await botClient!.invoke(new Api.messages.SendInlineBotResult({
                    peer: event.chatId,
                    queryId: results.queryId,
                    id: results.results[0].id,
                    clearDraft: true
                }));
            } else {
                 await botClient!.sendMessage(event.chatId!, { message: "Failed to get inline results." });
            }

        } catch (e: any) {
            await botClient!.sendMessage(event.chatId!, { message: `Error: ${e.message}` });
        }
    }
};

export default [freemusicPlugin];
