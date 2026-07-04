import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";
import path from "path";
import util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);

export const freemusicPlugin = {
    name: "FreeMusic",
    description: "Search and download free music previews (30s) using the iTunes Search API.",
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

        await event.message.edit({ text: `Searching for \`${query}\`...` });

        try {
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
            const response = await fetch(url);
            
            if (!response.ok) {
                await event.message.edit({ text: `Error fetching from API: HTTP ${response.status}` });
                return;
            }

            const data = await response.json();
            if (!data.results || data.results.length === 0) {
                await event.message.edit({ text: `Could not find any free music for \`${query}\`.` });
                return;
            }

            const track = data.results[0];
            const previewUrl = track.previewUrl;
            const trackName = track.trackName;
            const artistName = track.artistName;

            if (!previewUrl) {
                await event.message.edit({ text: `No download link available for \`${trackName}\` by \`${artistName}\`.` });
                return;
            }

            await event.message.edit({ text: `Found \`${trackName}\` by \`${artistName}\`. Downloading...` });

            const tempDir = path.join(process.cwd(), "downloads");
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Using curl to download the audio file
            const fileExt = previewUrl.split('.').pop() || "m4a";
            // Clean filename
            const cleanName = `${artistName} - ${trackName}`.replace(/[^a-zA-Z0-9 -]/g, "");
            const filePath = path.join(tempDir, `${cleanName}.${fileExt}`);

            await execPromise(`curl -sL "${previewUrl}" -o "${filePath}"`);

            await event.message.edit({ text: "Uploading 📤..." });

            await event.client?.sendMessage(event.message.chatId!, {
                file: filePath,
                message: `**${trackName}** by **${artistName}**\n*Preview audio (30s) downloaded using iTunes Search API*`
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
