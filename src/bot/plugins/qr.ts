import { NewMessageEvent } from "telegram/events/index.js";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import os from "os";

export const qrPlugin = {
    name: "QR Generator",
    description: "Generates a QR code from given text",
    command: "qr",
    usage: ".qr <text>",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const text = message.text || "";
        const commandParts = text.split(" ");
        commandParts.shift(); // Remove command
        
        const payload = commandParts.join(" ").trim();
        
        if (!payload) {
            await message.edit({ text: "**Please provide some text to generate a QR code.**\nUsage: `.qr <text>`" });
            return;
        }

        await message.edit({ text: "`Generating QR code...`" });

        try {
            const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "qr-"));
            const outFile = path.join(outDir, "qrcode.png");
            
            await QRCode.toFile(outFile, payload, {
                errorCorrectionLevel: 'H',
                margin: 4,
                width: 512,
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                }
            });

            await message.client?.sendFile(message.peerId!, {
                file: outFile,
                caption: `**QR Code for:** \`${payload}\``,
                replyTo: message.replyToMsgId || message.id
            });
            
            await message.delete({ revoke: true }).catch(() => {});
            
            fs.unlinkSync(outFile);
            fs.rmdirSync(outDir);
        } catch (error: any) {
            await message.edit({ text: `**Failed to generate QR code:** \`${error.message}\`` });
        }
    }
};
