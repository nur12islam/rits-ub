import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";

export const quotePlugin = {
    name: "Quote",
    description: "Quote a message using QuotLyBot",
    command: "q",
    usage: ".q [text or reply to msg]",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const text = message.text || "";
        const commandParts = text.split(" ");
        const args = commandParts.slice(1).join(" ");
        const replied = await message.getReplyMessage();
        const client = event.client;
        if (!client) return;

        if (!replied && !args) {
            await message.edit({ text: "Input not found! Provide text or reply to a message." });
            return;
        }

        await message.edit({ text: "⏳ Processing..." });

        try {
            let sentMessageId: number;
            
            // Try to unblock bot just in case
            await client.invoke(new Api.contacts.Unblock({ id: "QuotLyBot" })).catch(() => {});

            if (replied && !args) {
                const forwarded = await client.forwardMessages("QuotLyBot", {
                    messages: [replied.id],
                    fromPeer: message.chatId,
                });
                sentMessageId = Array.isArray(forwarded) && forwarded.length > 0 ? forwarded[0].id : (forwarded as any).id;
            } else {
                const sent = await client.sendMessage("QuotLyBot", { message: args });
                sentMessageId = sent.id;
            }

            let response;
            for (let i = 0; i < 15; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const history = await client.getMessages("QuotLyBot", { limit: 1 });
                if (history && history.length > 0 && history[0].id > sentMessageId) {
                    response = history[0];
                    break;
                }
            }

            if (!response || !response.media) {
                 await message.edit({ text: "Something went wrong! Check @QuotLyBot" });
                 return;
            }

            await client.markAsRead("QuotLyBot").catch(() => {});

            await client.sendMessage(message.chatId!, {
                file: response.media,
                replyTo: replied ? replied.id : message.id
            });

            await message.delete({ revoke: true }).catch(() => {});
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            await message.edit({ text: `❌ Failed: ${msg}` }).catch(() => {});
        }
    }
};

export default [quotePlugin];
