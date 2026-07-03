import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";

export const ytdlPlugin = {
    name: "YT Download",
    description: "Download using @subroz_ytdlbot",
    command: "ytdl",
    usage: "Use .ytdl <link>", category: "Media",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const parts = text.split(" ").slice(1);
        let link = parts.join(" ").trim();
        
        if (!link && event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            link = reply?.text || "";
        }
        
        if (!link) {
            await event.message.edit({ text: "`No link provided.`" });
            return;
        }

        await event.message.edit({ text: "`Requesting @subroz_ytdlbot ...`" });
        
        try {
            const results = await event.client?.invoke(
                new Api.messages.GetInlineBotResults({
                    bot: "@subroz_ytdlbot",
                    peer: event.message.chatId,
                    query: link,
                    offset: "",
                })
            ) as Api.messages.BotResults;

            if (results && results.results && results.results.length > 0) {
                // Send the first result
                let replyToMsgId;
                if (event.message.replyToMsgId) {
                    replyToMsgId = event.message.replyToMsgId;
                }
                
                await event.client?.invoke(
                    new Api.messages.SendInlineBotResult({
                        peer: event.message.chatId,
                        queryId: results.queryId,
                        id: results.results[0].id,
                        replyTo: replyToMsgId ? new Api.InputReplyToMessage({ replyToMsgId }) : undefined,
                    })
                );
                await event.message.delete();
            } else {
                await event.message.edit({ text: "`No results found from @subroz_ytdlbot.`" });
            }
        } catch (e: any) {
            await event.message.edit({ text: `\`Error: ${e.message}\`` });
        }
    }
};

export default [ytdlPlugin];
