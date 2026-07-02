import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { config } from "dotenv";

config();

export const rmbgPlugin = {
    name: "Remove Background",
    description: "Removes background from an image.",
    command: "rmbg",
    usage: "Reply to an image with .rmbg to remove its background.",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const apiKey = process.env.REMOVE_BG_API_KEY;
        if (!apiKey) {
            await event.message.edit({ text: "`REMOVE_BG_API_KEY is not set in environment variables. Get one from https://www.remove.bg/`" });
            return;
        }

        if (!event.message.replyToMsgId) {
            await event.message.edit({ text: "`Reply to a photo to remove its background!`" });
            return;
        }

        const reply = await event.message.getReplyMessage();
        if (!reply || !reply.media) {
            await event.message.edit({ text: "`Reply to a photo to remove its background!`" });
            return;
        }

        let isImage = false;
        if (reply.photo) isImage = true;
        if (reply.document && reply.document.mimeType?.startsWith("image/")) isImage = true;

        if (!isImage) {
            await event.message.edit({ text: "`Replied message is not an image!`" });
            return;
        }

        await event.message.edit({ text: "⏳ `Analysing and downloading...`" });

        const buffer = await event.client?.downloadMedia(reply.media);
        if (!buffer) {
            await event.message.edit({ text: "`❌ Failed to download media.`" });
            return;
        }

        await event.message.edit({ text: "⏳ `Removing background...`" });

        try {
            const formData = new FormData();
            formData.append('image_file', Buffer.from(buffer as any), { filename: 'image.jpg', contentType: 'image/jpeg' });
            formData.append('size', 'auto');

            const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-Api-Key': apiKey,
                },
                responseType: 'arraybuffer',
            });

            const outPath = path.join(process.cwd(), `rmbg_${Date.now()}.png`);
            fs.writeFileSync(outPath, response.data);

            await event.message.edit({ text: "📤 `Uploading...`" });

            await event.client?.sendMessage(event.message.chatId!, {
                file: outPath,
                message: "`Background removed by RITS`",
                replyTo: reply.id
            });

            fs.unlinkSync(outPath);
            await event.message.delete();

        } catch (error: any) {
            console.error("RMBG Error:", error.response?.data?.toString('utf8') || error.message);
            const errorMsg = error.response?.status === 403 
                ? "Invalid API Key or Quota Exceeded" 
                : "Something went wrong! Check your API key and usage quota.";
            await event.message.edit({ text: `❌ **Error:** \`${errorMsg}\`` });
        }
    }
};

export default [rmbgPlugin];
