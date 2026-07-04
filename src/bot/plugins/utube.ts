import { NewMessageEvent } from "telegram/events/index.js";
import { exec, spawn } from "child_process";
import util from "util";
import fs from "fs";
import path from "path";
import { humanbytes } from "./speedtest.js";

const execPromise = util.promisify(exec);

async function ensureYtDlp(): Promise<string> {
    const binDir = path.join(process.cwd(), "bin");
    const ytdlpPath = path.join(binDir, "yt-dlp");
    if (!fs.existsSync(ytdlpPath)) {
        fs.mkdirSync(binDir, { recursive: true });
        await execPromise(`curl -sLo ${ytdlpPath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x ${ytdlpPath}`);
    }
    return ytdlpPath;
}

export const ytinfoPlugin = {
    name: "YT Info",
    description: "Get information of the link without downloading",
    command: "ytinfo",
    usage: "Use .ytinfo to execute this command.", category: "Media",
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
        await event.message.edit({ text: "Hold on ⏳ .." });
        
        try {
            const ytDlp = await ensureYtDlp();
            const { stdout } = await execPromise(`${ytDlp} --js-runtimes nodejs -j --no-playlist "${link}"`);
            const info = JSON.parse(stdout);
            
            function escapeHtml(text: any) {
                if (!text) return text;
                return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
            
            let out = `<b>Title</b> >>\n<i>${escapeHtml(info.title)}</i>\n\n`;
            out += `<b>Uploader</b> >>\n<i>${escapeHtml(info.uploader)}</i>\n\n`;
            
            const formats = info.formats || [info];
            if (formats.length > 0) {
                out += `--U-ID   |   Reso.  |   Extension--\n`;
                for (let i = 0; i < Math.min(formats.length, 20); i++) {
                    const f = formats[i];
                    out += `<code>${escapeHtml(f.format_id)} | ${escapeHtml(f.format_note || 'N/A')} | ${escapeHtml(f.ext)}</code>\n`;
                }
            } else {
                out += "No formats found :(";
            }
            
            if (info.thumbnail) {
                await event.client?.sendMessage(event.message.chatId!, {
                    file: info.thumbnail,
                    message: out,
                    parseMode: "html"
                });
                await event.message.delete();
            } else {
                await event.message.edit({ text: out, parseMode: "html" });
            }
        } catch (e: any) {
            await event.message.edit({ text: `\`Error: ${e.message.slice(0, 100)}\`` });
        }
    }
};

export const ytdesPlugin = {
    name: "YT Description",
    description: "Get description of the link without downloading",
    command: "ytdes",
    usage: "Use .ytdes to execute this command.", category: "Media",
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
        
        await event.message.edit({ text: "Hold on ⏳ .." });
        
        try {
            const ytDlp = await ensureYtDlp();
            const { stdout } = await execPromise(`${ytDlp} --js-runtimes nodejs -j --no-playlist "${link}"`);
            const info = JSON.parse(stdout);
            
            function escapeHtml(text: any) {
                if (!text) return text;
                return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            }
            
            let out = info.description ? `--Description--\n\n\t${escapeHtml(info.description)}` : "No descriptions found :(";
            
            if (out.length > 4096) {
                out = out.substring(0, 4090) + "...";
            }
            await event.message.edit({ text: out });
        } catch (e: any) {
            await event.message.edit({ text: `\`Error: ${e.message.slice(0, 100)}\`` });
        }
    }
};

export default [ytinfoPlugin, ytdesPlugin];
