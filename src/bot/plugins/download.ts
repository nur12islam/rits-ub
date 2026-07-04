import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";
import path from "path";

export const downloadPlugin = {
    name: "Download",
    description: "Downloads media from a replied Telegram message to the server",
    command: "download",
    usage: ".download (reply to media)",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const replyMessage = await event.message.getReplyMessage();
        if (!replyMessage || !replyMessage.media) {
            await event.message.edit({ text: "Please reply to a message with media to download." });
            return;
        }

        await event.message.edit({ text: "Downloading media..." });

        try {
            const buffer = await event.client?.downloadMedia(replyMessage, {
                workers: 1,
            });

            if (!buffer) {
                await event.message.edit({ text: "Failed to download media." });
                return;
            }

            const downloadDir = path.join(process.cwd(), "downloads");
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true });
            }

            // Generate a filename based on document attributes if available
            let filename = `download_${Date.now()}`;
            if (replyMessage.document) {
                const doc = replyMessage.document;
                const attrFilename = doc.attributes?.find((a: any) => a.className === "DocumentAttributeFilename");
                if (attrFilename) {
                    filename = (attrFilename as any).fileName;
                }
            } else if (replyMessage.photo) {
                filename += ".jpg";
            }

            const filePath = path.join(downloadDir, filename);
            fs.writeFileSync(filePath, buffer as Buffer);

            await event.message.edit({ text: `Successfully downloaded to: \`${filePath}\`` });
        } catch (e: any) {
            await event.message.edit({ text: `Error downloading media: ${e.message}` });
        }
    }
};

export default [downloadPlugin];
