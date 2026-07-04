import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";
import path from "path";

export const uploadPlugin = {
    name: "Upload",
    description: "Uploads a local file to Telegram",
    command: "upload",
    usage: ".upload [file path]",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const filePath = text.split(" ").slice(1).join(" ");
        if (!filePath) {
            await event.message.edit({ text: "Please provide a file path to upload." });
            return;
        }

        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            await event.message.edit({ text: `File not found: ${absolutePath}` });
            return;
        }

        await event.message.edit({ text: "Uploading file..." });

        try {
            await event.client?.sendMessage(event.message.chatId!, {
                file: absolutePath,
                message: `Uploaded: ${path.basename(absolutePath)}`,
                forceDocument: true as any
            });
            await event.message.delete();
        } catch (e: any) {
            await event.message.edit({ text: `Error uploading file: ${e.message}` });
        }
    }
};

export default [uploadPlugin];
