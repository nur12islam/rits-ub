import { NewMessageEvent } from "telegram/events/index.js";
import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), "data", "alive_config.json");

function getAliveMedia() {
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
            if (config.mediaPath && fs.existsSync(config.mediaPath)) {
                return config.mediaPath;
            }
        } catch (e) {
            console.error("Failed to read alive config:", e);
        }
    }
    return "https://telegra.ph/file/4b52b217a1c0d486d38e2.jpg"; // Default image
}

function setAliveMedia(mediaPath: string) {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ mediaPath }));
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
        
        await event.client?.sendMessage(event.message.chatId!, {
            file: getAliveMedia(),
            message: aliveMsg,
        });
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
            
            const mediaDir = path.join(process.cwd(), "data");
            if (!fs.existsSync(mediaDir)) fs.mkdirSync(mediaDir, { recursive: true });
            
            const mediaPath = path.join(mediaDir, `alive_media${ext}`);
            fs.writeFileSync(mediaPath, buffer as Buffer);
            
            setAliveMedia(mediaPath);
            await event.message.edit({ text: "`✅ Alive media updated successfully!`" });
        } else {
            await event.message.edit({ text: "`❌ Failed to download media.`" });
        }
    }
};

export default [alivePlugin, setAlivePlugin];
