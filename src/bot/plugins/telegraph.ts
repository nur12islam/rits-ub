import { NewMessageEvent } from "telegram/events/index.js";
import FormData from "form-data";
import axios from "axios";
import { assistantBot, botClient } from "../index.js";

const T_LIMIT = 5242880; // 5MB

export const telegraphPlugin = {
    name: "Telegraph",
    description: "Uploads media or text to Graph.org",
    command: "telegraph",
    usage: ".telegraph (reply to media or text: | separated for title and content)",
    aliases: ["tg", "graph"],
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const replyMessage = await event.message.getReplyMessage();
        if (!replyMessage) {
            await event.message.edit({ text: "Reply to media or text to upload to Graph.org." });
            return;
        }

        const isMedia = replyMessage.photo || replyMessage.video || replyMessage.document || replyMessage.sticker || replyMessage.animation;
        const isText = replyMessage.text && !isMedia;

        let isTextFile = false;
        let mimeType = "";
        
        if (replyMessage.document) {
            mimeType = replyMessage.document.mimeType || "";
            if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/javascript") {
                isTextFile = true;
            }
        }

        if (replyMessage.text && !isMedia) {
             await handleText(event, replyMessage.text, event.message.text || "");
             return;
        } else if (isTextFile) {
            await event.message.edit({ text: "`Downloading text file...`" });
            const buffer = await event.client?.downloadMedia(replyMessage, { workers: 1 });
            if (!buffer) {
                await event.message.edit({ text: "Failed to download text file." });
                return;
            }
            const content = buffer.toString('utf-8');
            await handleText(event, content, event.message.text || "");
            return;
        }

        // Media upload
        if (!replyMessage.photo && !replyMessage.animation && !(replyMessage.video && mimeType === "video/mp4") && !replyMessage.sticker && !replyMessage.document) {
            await event.message.edit({ text: "Unsupported media type for Graph.org (limit 5MB, supported: jpg, png, mp4, gif)." });
            return;
        }

        if (replyMessage.file && replyMessage.file.size && replyMessage.file.size > T_LIMIT) {
             await event.message.edit({ text: "File size exceeds 5MB limit for Graph.org." });
             return;
        }

        await event.message.edit({ text: "`Downloading media...`" });

        try {
            const buffer = await event.client?.downloadMedia(replyMessage, {
                workers: 1,
            });

            if (!buffer) {
                await event.message.edit({ text: "Failed to download media." });
                return;
            }

            await event.message.edit({ text: "`Uploading to Graph.org...`" });

            let ext = "jpg";
            if (replyMessage.video || replyMessage.animation) ext = "mp4";
            else if (replyMessage.sticker) ext = "webp";

            if (replyMessage.file && replyMessage.file.ext) {
                 ext = replyMessage.file.ext.replace(".", "");
            }

            const formData = new FormData();
            formData.append("file", buffer, { filename: `media.${ext}` });

            const response = await axios.post("https://graph.org/upload", formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });

            const data = response.data;
            
            if (data.error) {
                 throw new Error(data.error);
            }

            if (data && data[0] && data[0].src) {
                const url = `https://graph.org${data[0].src}`;
                await sendInlineGraphLink(event, url);
            } else {
                 throw new Error("Invalid response from Graph.org");
            }

        } catch (e: any) {
            await event.message.edit({ text: `Error uploading media: ${e.message}` });
        }
    }
};

async function handleText(event: NewMessageEvent, textContent: string, commandText: string) {
    await event.message.edit({ text: "`Creating Graph.org page...`" });
    try {
        let title = "Pasted content by Assistant";
        let content = textContent;

        const splitCommand = commandText.split(" ");
        if (splitCommand.length > 1) {
             const customTitle = splitCommand.slice(1).join(" ");
             if (customTitle.trim().length > 0) {
                 title = customTitle.trim();
             }
        } else if (content.includes("|") && !content.startsWith("<")) {
            const parts = content.split("|");
            title = parts[0].trim();
            content = parts.slice(1).join("|").trim();
        }

        const accountRes = await axios.get("https://api.graph.org/createAccount?short_name=Assistant&author_name=Assistant");
        const accountData = accountRes.data;
        
        if (!accountData.ok) {
             throw new Error("Failed to create Graph.org account.");
        }
        
        const accessToken = accountData.result.access_token;
        
        const contentNodes = content.split(/\r?\n/).map(line => {
             return { tag: "p", children: [line.trim() === "" ? "\u00A0" : line] };
        });

        const pageRes = await axios.post("https://api.graph.org/createPage", {
             access_token: accessToken,
             title: title,
             author_name: "Assistant",
             content: contentNodes
        });

        const pageData = pageRes.data;
        
        if (pageData.ok) {
            await sendInlineGraphLink(event, pageData.result.url);
        } else {
             throw new Error(pageData.error || "Failed to create page");
        }
    } catch (e: any) {
        await event.message.edit({ text: `Error: ${e.message}` });
    }
}

async function sendInlineGraphLink(event: NewMessageEvent, url: string) {
    if (assistantBot) {
        try {
            const me = await assistantBot.getMe() as any;
            const results = await botClient!.inlineQuery(me.username, `graph_btn ${url}`);
            if (results && results.length > 0) {
                await results[0].click(event.chatId);
                await event.message.delete({ revoke: true }).catch(() => {});
                return;
            }
        } catch (e: any) {
            console.error("Inline query failed:", e);
        }
    }
    await event.message.edit({ text: `**[Here is your Graph.org Link!](${url})**`, linkPreview: false });
}

export default [telegraphPlugin];
