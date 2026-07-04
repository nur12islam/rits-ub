import { NewMessageEvent } from "telegram/events/index.js";
import puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const webssPlugin = {
    name: "Web Screenshot",
    description: "Get a full-page snapshot of a website",
    command: "webss",
    usage: ".webss <url>",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const text = message.text || "";
        const commandParts = text.split(" ");
        if (commandParts.length < 2) {
            await message.edit({ text: "I need a valid link to take screenshots from." });
            return;
        }

        const urlMatch = text.slice(commandParts[0].length).match(/\bhttps?:\/\/[^\s]+/i);
        let url = commandParts[1];
        if (urlMatch) {
            url = urlMatch[0];
        } else if (!url.startsWith("http")) {
            url = "http://" + url;
        }
        
        await message.edit({ text: "⏳ Processing ..." });

        let browser;
        try {
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--ignore-certificate-errors',
                ],
            });
            
            const page = await browser.newPage();
            // Try to set a reasonable viewport first
            await page.setViewport({ width: 1280, height: 800 });
            
            await message.edit({ text: "⏳ Generating screenshot of the page..." });
            
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            
            // Get scroll height and width
            const dimensions = await page.evaluate(() => {
                return {
                    width: Math.max(
                        document.body.scrollWidth, document.body.offsetWidth,
                        document.documentElement.clientWidth, document.documentElement.scrollWidth,
                        document.documentElement.offsetWidth
                    ),
                    height: Math.max(
                        document.body.scrollHeight, document.body.offsetHeight,
                        document.documentElement.clientHeight, document.documentElement.scrollHeight,
                        document.documentElement.offsetHeight
                    )
                };
            });
            
            await page.setViewport({
                width: dimensions.width + 125,
                height: dimensions.height + 125,
            });
            
            await message.edit({ 
                text: `⏳ Generating screenshot of the page...\n\n📏 **Height:** \`${dimensions.height}px\`\n📏 **Width:** \`${dimensions.width}px\``
            });
            
            // wait for a bit to let everything render (especially lazy-loaded images)
            await new Promise(resolve => setTimeout(resolve, Math.min((dimensions.height / 1000) * 1000, 10000))); 
            
            const filePath = path.join(os.tmpdir(), `webss_${Date.now()}.png`);
            
            await page.screenshot({ path: filePath, fullPage: true });
            
            await message.edit({ text: "📤 Uploading screenshot..." }).catch(() => {});
            
            await event.client?.sendMessage(message.chatId!, {
                file: filePath,
                message: url,
                replyTo: message.replyTo?.replyToMsgId || message.id,
            });
            
            await message.delete({ revoke: true }).catch(() => {});
            await fs.promises.unlink(filePath).catch(() => {});
            
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            await message.edit({ text: `❌ Failed: ${msg}` }).catch(() => {});
        } finally {
            if (browser) {
                await browser.close().catch(() => {});
            }
        }
    }
};

export default [webssPlugin];
