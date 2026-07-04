import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";
import fs from "fs";
import path from "path";

export const trPlugin = {
    name: "Translate",
    description: "Translate text to a specified language using Google Translate.",
    command: "tr",
    usage: "Use .tr <lang> <text> or reply to a message with .tr <lang>.",
    category: "Study",
    handler: async (event: NewMessageEvent) => {
        let input = event.message.text?.replace(/^\.tr(\s+)?/, "").trim() || "";
        let possibleLang = "";
        let text = "";

        const parts = input.split(" ");
        if (parts.length > 0 && /^[a-z]{2,3}(-[a-zA-Z]{2})?$/.test(parts[0])) {
            possibleLang = parts[0];
            text = parts.slice(1).join(" ");
        } else {
            text = input;
        }

        if (!text && event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            if (reply?.text) {
                text = reply.text;
            }
        }

        if (!text && possibleLang && !event.message.replyToMsgId) {
            text = possibleLang;
            possibleLang = "";
        }

        if (!text) {
            await event.message.edit({ text: "`Provide text or reply to a message to translate!`" });
            return;
        }

        await event.message.edit({ text: "⏳ `Translating...`" });

        const tryTranslate = async (targetLang: string, targetText: string) => {
            const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(targetText)}`);
            return res.data;
        };

        try {
            let data;
            let usedLang = possibleLang || "en";
            try {
                if (possibleLang) {
                    data = await tryTranslate(possibleLang, text);
                } else {
                    data = await tryTranslate("en", text);
                }
            } catch (err: any) {
                if (err.response?.status === 400 && possibleLang) {
                    usedLang = "en";
                    data = await tryTranslate("en", input);
                } else {
                    throw err;
                }
            }

            const translated = data[0].map((s: any) => s[0]).join("");
            const sourceLang = data[2];

            const out = `**Translated (${sourceLang} ➔ ${usedLang}):**\n\`${translated}\``;
            await event.message.edit({ text: out });
        } catch (error) {
            console.error("Translate Error:", error);
            await event.message.edit({ text: "❌ `Translation failed!`" });
        }
    }
};

export const ttsPlugin = {
    name: "Text to Speech",
    description: "Convert text to voice message using Google TTS.",
    command: "tts",
    usage: "Use .tts <lang> <text> or reply to a message with .tts <lang>.",
    category: "Study",
    handler: async (event: NewMessageEvent) => {
        let input = event.message.text?.replace(/^\.tts(\s+)?/, "").trim() || "";
        let possibleLang = "";
        let text = "";

        const parts = input.split(" ");
        if (parts.length > 0 && /^[a-z]{2,3}(-[a-zA-Z]{2})?$/.test(parts[0])) {
            possibleLang = parts[0];
            text = parts.slice(1).join(" ");
        } else {
            text = input;
        }

        if (!text && event.message.replyToMsgId) {
            const reply = await event.message.getReplyMessage();
            if (reply?.text) {
                text = reply.text;
            }
        }

        if (!text && possibleLang && !event.message.replyToMsgId) {
            text = possibleLang;
            possibleLang = "";
        }

        if (!text) {
            await event.message.edit({ text: "`Provide text or reply to a message for TTS!`" });
            return;
        }

        await event.message.edit({ text: "⏳ `Generating voice...`" });

        const tryTTS = async (targetLang: string, targetText: string) => {
            const sliced = targetText.length > 200 ? targetText.slice(0, 200) : targetText;
            const res = await axios.get(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(sliced)}&tl=${targetLang}&client=tw-ob`, {
                responseType: "arraybuffer"
            });
            return res.data;
        };

        try {
            let data;
            let usedLang = possibleLang || "en";
            try {
                if (possibleLang) {
                    data = await tryTTS(possibleLang, text);
                } else {
                    data = await tryTTS("en", text);
                }
            } catch (err: any) {
                if (err.response?.status === 400 && possibleLang) {
                    usedLang = "en";
                    data = await tryTTS("en", input);
                } else {
                    throw err;
                }
            }

            const outPath = path.join(process.cwd(), `tts_${Date.now()}.mp3`);
            fs.writeFileSync(outPath, Buffer.from(data));

            await event.message.edit({ text: "📤 `Uploading voice...`" });

            await event.client?.sendMessage(event.message.chatId!, {
                file: outPath,
                replyTo: event.message.replyToMsgId || event.message.id
            });

            fs.unlinkSync(outPath);
            await event.message.delete();
        } catch (error) {
            console.error("TTS Error:", error);
            await event.message.edit({ text: "❌ `TTS failed! (Maybe unsupported language or text too long)`" });
        }
    }
};

export default [trPlugin, ttsPlugin];
