import { NewMessageEvent } from "telegram/events/index.js";
export default [{
    name: "Alive",
    description: "Check if bot is alive (Rewritten)",
    command: "alive",
    category: "General",
    handler: async (event: NewMessageEvent) => {
        const uptime = process.uptime();
        const hrs = Math.floor(uptime / 3600);
        const mins = Math.floor((uptime % 3600) / 60);
        const secs = Math.floor(uptime % 60);
        const uptimeStr = `${hrs}h ${mins}m ${secs}s`;
        
        const aliveMsg = `🌟 **RITS is Alive!**\n\n⚡ **Uptime:** ${uptimeStr}\n🚀 **Version:** 2.0 (Rewritten)\n💻 **System:** Custom TS Engine`;
        
        await event.client?.sendMessage(event.message.chatId!, {
            file: "https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=1000&auto=format&fit=crop",
            message: aliveMsg,
        });
        await event.message.delete();
    }
}];
