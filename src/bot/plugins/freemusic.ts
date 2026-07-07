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
    if (fs.existsSync(ytdlpPath)) {
        return ytdlpPath;
    }
    fs.mkdirSync(binDir, { recursive: true });
    await execPromise(`curl -sLo ${ytdlpPath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x ${ytdlpPath}`);
    return ytdlpPath;
}

export const songSearchCache = new Map<string, any[]>();

export async function downloadAndSendSong(chatId: string | number, videoId: string, title: string, eventToEdit?: any) {
    try {
        if (eventToEdit) {
            await eventToEdit.edit({ text: `Downloading \`${title}\`...` });
        }
        const ytdlpBin = await getYtDlpBin();
        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "song-"));
        const outTemplate = path.join(outDir, "%(title).80s.%(ext)s");

        const args = [
            `https://www.youtube.com/watch?v=${videoId}`,
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
            if (eventToEdit) await eventToEdit.edit({ text: `Could not download \`${title}\`.` });
            return;
        }
        
        const filePath = path.join(outDir, files[0]);

        if (eventToEdit) {
            await eventToEdit.edit({ text: "Uploading 📤..." });
        }

        await botClient?.sendMessage(chatId, {
            file: filePath,
            message: `**${title}**\n*Downloaded via .song*`
        });
        
        if (eventToEdit) {
            try {
                if (eventToEdit.message) {
                    await eventToEdit.message.delete();
                } else {
                    await eventToEdit.delete();
                }
            } catch (e) {}
        }

        fs.unlinkSync(filePath);
    } catch (e: any) {
        if (eventToEdit) {
            await eventToEdit.edit({ text: `Error: ${e.message}` });
        } else {
            await botClient?.sendMessage(chatId, { message: `Error downloading ${title}: ${e.message}` });
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

            const inlineQuery = `s_song ${event.message.chatId} ${cacheKey}`;
            
            const results = await botClient!.invoke(new Api.messages.GetInlineBotResults({
                bot: assistantMe.username,
                peer: event.message.chatId,
                query: inlineQuery,
                offset: ""
            }));

            if (results && results.results && results.results.length > 0) {
                await botClient!.invoke(new Api.messages.SendInlineBotResult({
                    peer: event.message.chatId,
                    queryId: results.queryId,
                    id: results.results[0].id,
                    clearDraft: true
                }));
            } else {
                 await botClient!.sendMessage(event.message.chatId!, { message: "Failed to get inline results." });
            }

        } catch (e: any) {
            await botClient!.sendMessage(event.message.chatId!, { message: `Error: ${e.message}` });
        }
    }
};

export default [freemusicPlugin];
