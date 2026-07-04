import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";
import { createCanvas } from "canvas";
import sharp from "sharp";
import { CustomFile } from "telegram/client/uploads.js";

function wrapTextToWidth10(text: string): string {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";
    
    for (const word of words) {
        if (word.length > 10) {
            if (currentLine) lines.push(currentLine);
            currentLine = "";
            let remaining = word;
            while (remaining.length > 10) {
                lines.push(remaining.substring(0, 10));
                remaining = remaining.substring(10);
            }
            if (remaining) {
                currentLine = remaining;
            }
        } else if (currentLine.length + word.length + (currentLine ? 1 : 0) <= 10) {
            currentLine += (currentLine ? " " : "") + word;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
}

export const pletPlugin = {
    name: "Stickerify",
    description: "Get a Random RGB Sticker",
    command: "plet",
    usage: ".plet [text | reply]",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const text = message.text || "";
        const commandParts = text.split(" ");
        let sticktext = commandParts.slice(1).join(" ");
        
        const replied = await message.getReplyMessage();
        if (!sticktext && replied && replied.message) {
            sticktext = replied.message;
        }

        if (!sticktext) {
            await message.edit({ text: "**Bruh** ~`I need some text to make sticklet`" });
            return;
        }

        await message.edit({ text: "⏳ Processing..." });

        const wrappedText = wrapTextToWidth10(sticktext);
        const lines = wrappedText.split('\n');

        const canvas = createCanvas(512, 512);
        const ctx = canvas.getContext('2d');

        let fontSize = 230;
        
        // Find suitable font size
        while (true) {
            ctx.font = `bold ${fontSize}px sans-serif`;
            let totalHeight = lines.length * (fontSize * 1.2);
            let maxWidth = 0;
            for (const line of lines) {
                const w = ctx.measureText(line).width;
                if (w > maxWidth) maxWidth = w;
            }
            
            if (maxWidth <= 500 && totalHeight <= 500) {
                break;
            }
            fontSize -= 3;
            if (fontSize <= 10) break;
        }

        const R = Math.floor(Math.random() * 256);
        const G = Math.floor(Math.random() * 256);
        const B = Math.floor(Math.random() * 256);

        ctx.fillStyle = `rgb(${R}, ${G}, ${B})`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = (512 - totalHeight) / 2 + lineHeight / 2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], 256, startY + i * lineHeight);
        }

        const pngBuffer = canvas.toBuffer('image/png');
        
        try {
            const webpBuffer = await sharp(pngBuffer)
                .webp({ quality: 100 })
                .toBuffer();
            
            await event.client?.sendMessage(message.chatId!, {
                file: new CustomFile("sticker.webp", webpBuffer.length, "", webpBuffer),
                replyTo: replied ? replied.id : message.id,
            });

            await message.delete({ revoke: true }).catch(() => {});
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            await message.edit({ text: `❌ Failed: ${msg}` }).catch(() => {});
        }
    }
};

export default [pletPlugin];
