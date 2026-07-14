import { NewMessageEvent } from "telegram/events/index.js";
import { downloadFolder } from "@viniciustrindade/gdownjs";
import fs from "fs";
import path from "path";
import os from "os";
import archiver from "archiver";

export const gdlPlugin = {
    name: "GDrive Folder Downloader",
    description: "Download a Google Drive folder as a zip file.",
    command: "gdl",
    usage: ".gdl <folder_url>",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const text = message.text || "";
        const args = text.split(" ");
        args.shift(); // Remove command
        
        const url = args.join(" ").trim();
        
        if (!url) {
            await message.edit({ text: "**Please provide a Google Drive folder URL.**\nUsage: `.gdl <folder_url>`" });
            return;
        }

        await message.edit({ text: "`Initializing download...`" });

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gdl-"));
        const downloadDir = path.join(tmpDir, "folder");
        const zipPath = path.join(tmpDir, "gdrive_folder.zip");
        
        try {
            await message.edit({ text: "`Downloading folder from Google Drive...`" });
            await downloadFolder(url, downloadDir, { quiet: true });
            
            await message.edit({ text: "`Zipping the folder...`" });
            
            await new Promise<void>((resolve, reject) => {
                const output = fs.createWriteStream(zipPath);
                const archive = archiver('zip', { zlib: { level: 9 } });

                output.on('close', () => resolve());
                archive.on('error', (err: any) => reject(err));

                archive.pipe(output);
                archive.directory(downloadDir, false);
                archive.finalize();
            });
            
            const stats = fs.statSync(zipPath);
            const fileSizeInMegabytes = stats.size / (1024 * 1024);
            
            if (fileSizeInMegabytes > 1900) {
                 await message.edit({ text: `**Error:** \`Zip file is too large (${fileSizeInMegabytes.toFixed(2)} MB) to be sent over Telegram.\`` });
                 return;
            }

            await message.edit({ text: "`Uploading zip file to Telegram...`" });

            await event.client?.sendFile(message.peerId!, {
                file: zipPath,
                caption: `**Google Drive Folder**\nURL: \`${url}\``,
                replyTo: message.replyToMsgId || message.id
            });
            
            await message.delete({ revoke: true }).catch(() => {});
        } catch (error: any) {
            console.error("gdl error:", error);
            await message.edit({ text: `**Failed to download or zip folder:** \`${error.message}\`` });
        } finally {
            // Cleanup
            try {
               fs.rmSync(tmpDir, { recursive: true, force: true });
            } catch (e) {
               console.error("Cleanup error", e);
            }
        }
    }
};

export default [gdlPlugin];
