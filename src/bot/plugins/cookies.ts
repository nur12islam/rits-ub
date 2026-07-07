import { Api } from "telegram";
import { botClient, COMMAND_PREFIX } from "../index.js";
import { Config } from "../config.js";
import fs from "fs";
import path from "path";

export const cookiesPlugin = {
    name: "Cookies",
    description: "Upload cookies.txt for yt-dlp",
    command: "setcookies",
    handler: async (event: any) => {
        const message = event.message;
        const userId = Number(message.senderId);

        if (!Config.OWNER_ID.includes(userId) && !Config.SUDO_USERS.includes(userId)) {
            await event.client?.sendMessage(message.chatId!, { message: "You are not authorized to use this command." });
            return;
        }

        const replyMessage = await message.getReplyMessage();
        if (!replyMessage || !replyMessage.media || !replyMessage.file) {
            await event.client?.sendMessage(message.chatId!, { message: `Please reply to a cookies.txt file with ${COMMAND_PREFIX}setcookies` });
            return;
        }

        const statusMsg = await event.client?.sendMessage(message.chatId!, { message: "Downloading cookies.txt..." });
        
        try {
            const buffer = await event.client?.downloadMedia(replyMessage);
            if (buffer) {
                fs.writeFileSync(path.join(process.cwd(), "cookies.txt"), buffer as Buffer);
                await event.client?.editMessage(message.chatId!, { message: statusMsg.id, text: "✅ cookies.txt updated successfully. YouTube downloads should work now!" });
            } else {
                await event.client?.editMessage(message.chatId!, { message: statusMsg.id, text: "❌ Failed to download file." });
            }
        } catch (e: any) {
            await event.client?.editMessage(message.chatId!, { message: statusMsg.id, text: `❌ Error: ${e.message}` });
        }
    }
};
