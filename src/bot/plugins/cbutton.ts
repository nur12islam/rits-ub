import { NewMessageEvent } from "telegram/events/index.js";
import { Button } from "telegram/tl/custom/button.js";
import { assistantBot } from "../index.js";
import { Config } from "../config.js";
import { Api } from "telegram";

export const cbuttonPlugin = {
    name: "Create Button",
    description: "Create buttons Using bot",
    command: "cbutton",
    usage: "Use .cbutton [reply to button msg] or type the syntax directly. Syntax: [name][buttonurl:link] or [name][buttonurl:link:same]",
    category: "Misc",
    handler: async (event: NewMessageEvent) => {
        if (!Config.BOT_TOKEN) {
            await event.message.edit({ text: "`First Create a Bot via @Botfather and Add bot token To Config Vars...`" });
            return;
        }

        if (!assistantBot) {
            await event.message.edit({ text: "`Assistant bot is not configured or not running.`" });
            return;
        }

        let inputString = event.message.text || "";
        // Remove the command prefix and .cbutton part
        inputString = inputString.replace(/^\.[a-zA-Z0-9_]+(\s+)?/, "").trim();

        let file: any = undefined;
        let replyMessageId: number | undefined = undefined;

        if (event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            if (reply) {
                replyMessageId = reply.id;
                // If user didn't type any string, take text from reply
                if (!inputString) {
                    inputString = reply.text || "";
                }
                
                // if reply has media, capture it
                if (reply.media) {
                    file = reply.media;
                }
            }
        }

        if (!inputString && !file) {
            await event.message.edit({ text: "`Need an input!`" });
            return;
        }

        // Parse buttons using regex
        const regex = /\[([^\]]+)\]\[buttonurl:([^\]]+?)(?::(same))?\]/gi;
        let cleanText = inputString.replace(regex, "").trim();

        const buttons: any[] = [];
        const matches = [...inputString.matchAll(regex)];

        if (matches.length === 0) {
            await event.message.edit({ text: "`Check Syntax of Your Message for making buttons!`" });
            return;
        }

        matches.forEach(match => {
            const name = match[1];
            const url = match[2];
            const same = match[3] ? match[3].toLowerCase() === "same" : false;

            if (same && buttons.length > 0) {
                buttons[buttons.length - 1].push(Button.url(name, url));
            } else {
                buttons.push([Button.url(name, url)]);
            }
        });

        if (!cleanText && !file) {
            await event.message.edit({ text: "`Need text too!`" });
            return;
        }
        
        if (!cleanText) {
             cleanText = "\u200B";
        }

        await event.message.edit({ text: "`Processing...`" });

        try {
            // Need to specify the correct entity, which might be tricky if it's a channel or group
            // We'll pass the chat ID.
            const entity = await assistantBot.getEntity(event.message.chatId!);
            
            await assistantBot.sendMessage(entity, {
                message: cleanText,
                file: file,
                replyTo: replyMessageId,
                buttons: buttons.length > 0 ? buttons : undefined
            });
            await event.message.delete();
        } catch (error: any) {
            console.error("cbutton Error:", error);
            const errStr = String(error.message || error);
            if (errStr.includes("CHAT_WRITE_FORBIDDEN") || errStr.includes("PEER_ID_INVALID") || errStr.includes("BOT_MISSING") || errStr.includes("CHANNEL_PRIVATE") || errStr.includes("Could not find the input entity")) {
                await event.message.edit({ text: "`Are you sure that your bot is here?\nIf not, then add it here`" });
            } else {
                await event.message.edit({ text: `\`Something went Wrong! 😁\`\n\n**ERROR:** \`${errStr}\`` });
            }
        }
    }
};

export default [cbuttonPlugin];
