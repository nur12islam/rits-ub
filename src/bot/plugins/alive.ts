import { NewMessageEvent } from "telegram/events/index.js";
import { Alive } from "../db/models/Alive.js";
import fs from "fs";
import path from "path";

async function getAliveMedia() {
    const record = await Alive.findOne();
    if (record && record.mediaBuffer) {
        // Write to a temp file and return it
        const ext = record.mediaType || ".jpg";
        const tempPath = path.join(process.cwd(), `temp_alive_media${ext}`);
        fs.writeFileSync(tempPath, record.mediaBuffer);
        return tempPath;
    }
    return "https://telegra.ph/file/4b52b217a1c0d486d38e2.jpg"; // Default image
}

async function setAliveMedia(buffer: Buffer, ext: string) {
    await Alive.findOneAndUpdate({}, { mediaBuffer: buffer, mediaType: ext }, { upsert: true, new: true });
}

export const alivePlugin = {
    name: "Alive",
    description: "Check if bot is alive (Rewritten)",
    command: "alive",
    usage: "Use .alive to execute this command.", category: "General",
    handler: async (event: NewMessageEvent) => {
        const uptime = process.uptime();
        const hrs = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        const uptimeStr = `${hrs}h ${mins}m ${secs}s`;
        
        const aliveMsg = `🌟 **RITS is Alive!**\n\n⚡ **Uptime:** ${uptimeStr}\n🚀 **Version:** 2.0 (Rewritten)\n💻 **System:** Custom TS Engine`;
        
        const mediaPath = await getAliveMedia();
        
        await event.client?.sendMessage(event.message.chatId!, {
            file: mediaPath,
            message: aliveMsg,
        });
        
        if (mediaPath !== "https://telegra.ph/file/4b52b217a1c0d486d38e2.jpg" && fs.existsSync(mediaPath)) {
            try {
                fs.unlinkSync(mediaPath);
            } catch (e) {}
        }
        await event.message.delete();
    }
};

export const setAlivePlugin = {
    name: "Set Alive",
    description: "Set the alive media by replying to an image/video/gif",
    command: "setalive",
    usage: "Use .setalive to execute this command.", category: "General",
    handler: async (event: NewMessageEvent) => {
        if (!event.message.replyToMsgId) {
            await event.message.edit({ text: "`Reply to a media (image/gif/video) to set it as alive media.`" });
            return;
        }

        const reply = await event.message.getReplyMessage();
        if (!reply?.media) {
            await event.message.edit({ text: "`The replied message does not contain any media.`" });
            return;
        }

        await event.message.edit({ text: "`Downloading media...`" });
        const buffer = await event.client?.downloadMedia(reply.media);
        if (buffer) {
            let ext = ".jpg";
            if (reply.file?.name) {
                ext = "." + (reply.file.name.split('.').pop() || "jpg");
            } else if (reply.video) {
                ext = ".mp4";
            } else if (reply.gif) {
                ext = ".mp4";
            }
            
            await setAliveMedia(buffer as Buffer, ext);
            await event.message.edit({ text: "`✅ Alive media updated successfully in database!`" });
        } else {
            await event.message.edit({ text: "`❌ Failed to download media.`" });
        }
    }
};

export default [alivePlugin, setAlivePlugin];
