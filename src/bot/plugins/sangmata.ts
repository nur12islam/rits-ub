import { NewMessageEvent } from "telegram/events/index.js";

export const sangmataPlugin = {
    name: "Sangmata",
    description: "Get user's last updated names and usernames.",
    command: "sg",
    usage: "Reply to a user to get their name/username history. Use .sg -u for username history.",
    category: "Information",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const getUsername = text.includes("-u");

        if (!event.message.replyToMsgId) {
            await event.message.edit({ text: "`Reply to get Name and Username History...`" });
            return;
        }

        const reply = await event.message.getReplyMessage();
        if (!reply || !reply.senderId) {
            await event.message.edit({ text: "`Could not find the user...`" });
            return;
        }

        const userId = reply.senderId.toString();
        await event.message.edit({ text: "`Getting info, Wait plox ...`" });

        const chat = "@SangMataInfo_bot";
        const ERROR_MSG = "For your kind information, you blocked @SangMataInfo_bot, Unblock it";

        try {
            await event.client?.sendMessage(chat, { message: `/search_id ${userId}` });
        } catch (e: any) {
            await event.message.edit({ text: `**${ERROR_MSG}**` });
            return;
        }

        let msgs: any[] = [];
        let attempts = 0;

        // Poll for response
        while (attempts < 10) {
            await new Promise(r => setTimeout(r, 1000));
            const history = await event.client?.getMessages(chat, { limit: 3 });
            if (history) {
                // Check if we got the response for this user
                const response = history.find(m => m.message && (m.message.includes("Name History") || m.message.includes("Username History") || m.message.includes("No records found")));
                if (response) {
                    msgs = history;
                    break;
                }
            }
            attempts++;
        }

        if (msgs.length === 0) {
            await event.message.edit({ text: "`No response from @SangMataInfo_bot. Please try again later.`" });
            return;
        }

        const nameLabel = "Name History";
        const usernameLabel = "Username History";

        for (const msg of msgs) {
            if (!msg.message) continue;
            
            if (getUsername) {
                if (msg.message.startsWith("No records found")) {
                    await event.message.edit({ text: "`User never changed his Username...`" });
                    return;
                }
                if (msg.message.startsWith(usernameLabel)) {
                    await event.message.edit({ text: `\`${msg.message}\`` });
                    return;
                }
            } else {
                if (msg.message.startsWith("No records found")) {
                    await event.message.edit({ text: "`User never changed his Name...`" });
                    return;
                }
                if (msg.message.startsWith(nameLabel)) {
                    await event.message.edit({ text: `\`${msg.message}\`` });
                    return;
                }
            }
        }
        
        await event.message.edit({ text: "`Couldn't find the requested history in the bot's recent messages.`" });
    }
};

export default sangmataPlugin;
