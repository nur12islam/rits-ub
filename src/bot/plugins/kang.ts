import { NewMessageEvent } from "telegram/events/index.js";
import { Api } from "telegram";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import sharp from "sharp";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const KANGING_STR = [
    "Using Witchery to kang this sticker...",
    "Plagiarising hehe...",
    "Inviting this sticker over to my pack...",
    "Kanging this sticker...",
    "Hey that's a nice sticker!\nMind if I kang?!..",
    "hehe me stel ur stikér\nhehe.",
    "Ay look over there (☉｡☉)!→\nWhile I kang this...",
    "Roses are red violets are blue, kanging this sticker so my pacc looks cool",
    "Imprisoning this sticker...",
    "Mr.Steal Your Sticker is stealing this sticker... "
];

async function getResponse(client: Api.Client, chatId: string, lastMsgId: number): Promise<Api.Message | undefined> {
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const history = await client.getMessages(chatId, { limit: 1 });
        if (history && history.length > 0 && history[0].id > lastMsgId) {
            return history[0] as Api.Message;
        }
    }
    return undefined;
}

export const kangPlugin = {
    name: "Kang",
    description: "Kangs stickers or creates new ones",
    command: "kang",
    usage: ".kang [emoji] [pack number]",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const replied = await message.getReplyMessage();
        
        if (!replied || !replied.media) {
            await message.edit({ text: "`I can't kang that...`" });
            return;
        }

        const args = (message.text || "").split(" ").slice(1);
        let pack = 1;
        let customEmoji = "🤔";

        if (args.length === 2) {
            customEmoji = args[0];
            pack = parseInt(args[1]) || 1;
        } else if (args.length === 1) {
            if (/^\d+$/.test(args[0])) {
                pack = parseInt(args[0]);
            } else {
                customEmoji = args[0];
            }
        }

        let isAnim = false;
        let isVideo = false;
        let resize = false;

        let emoji = customEmoji;
        
        if (replied.photo) {
            resize = true;
        } else if (replied.document) {
            const mime = replied.document.mimeType || "";
            if (mime.includes("image") && !mime.includes("webp")) {
                resize = true;
            } else if (mime.includes("tgsticker")) {
                isAnim = true;
            } else if (mime.includes("video") && replied.document.size.lessThan(10485760)) {
                resize = true;
                isVideo = true;
            } else {
                const isSticker = replied.document.attributes.some(a => a.className === "DocumentAttributeSticker");
                if (isSticker) {
                    const stickerAttr = replied.document.attributes.find(a => a.className === "DocumentAttributeSticker") as Api.DocumentAttributeSticker;
                    if (stickerAttr.alt && customEmoji === "🤔") {
                        emoji = stickerAttr.alt;
                    }
                    
                    const fileNameAttr = replied.document.attributes.find(a => a.className === "DocumentAttributeFilename") as Api.DocumentAttributeFilename;
                    const fileName = fileNameAttr ? fileNameAttr.fileName : "";
                    
                    if (mime === "application/x-tgsticker" || fileName.endsWith(".tgs")) {
                        isAnim = true;
                    } else if (mime === "video/webm" || fileName.endsWith(".webm")) {
                        isVideo = true;
                    } else {
                        resize = true;
                    }
                } else {
                    await message.edit({ text: "`Unsupported File!`" });
                    return;
                }
            }
        } else {
            await message.edit({ text: "`Unsupported File!`" });
            return;
        }

        await message.edit({ text: `\`${KANGING_STR[Math.floor(Math.random() * KANGING_STR.length)]}\`` });

        const client = event.client!;
        
        const mediaBuffer = await client.downloadMedia(replied, {});
        if (!mediaBuffer) {
            await message.edit({ text: "`No Media!`" });
            return;
        }

        const tmpDir = os.tmpdir();
        let mediaPath = path.join(tmpDir, `kang_${Date.now()}`);
        await fs.promises.writeFile(mediaPath, mediaBuffer);

        try {
            if (resize) {
                if (isVideo) {
                    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${mediaPath}"`;
                    const { stdout } = await execPromise(probeCmd);
                    const [w, h] = stdout.trim().split('x').map(Number);
                    let targetW = 512, targetH = 512;
                    if (h > w) { targetW = -1; targetH = 512; }
                    else if (w > h) { targetW = 512; targetH = -1; }
                    
                    const resizedVideo = `${mediaPath}_resized.webm`;
                    const cmd = `ffmpeg -i "${mediaPath}" -ss 00:00:00 -to 00:00:03 -map 0:v -b:v 256k -fs 262144 -c:v libvpx-vp9 -vf "scale=${targetW}:${targetH},fps=30" "${resizedVideo}" -y`;
                    await execPromise(cmd);
                    await fs.promises.unlink(mediaPath).catch(() => {});
                    mediaPath = resizedVideo;
                } else {
                    const resizedPhoto = `${mediaPath}_resized.png`;
                    const metadata = await sharp(mediaPath).metadata();
                    const width = metadata.width || 512;
                    const height = metadata.height || 512;
                    const scale = 512 / Math.max(width, height);
                    const newWidth = Math.round(width * scale);
                    const newHeight = Math.round(height * scale);
                    
                    await sharp(mediaPath)
                        .resize(newWidth, newHeight)
                        .png()
                        .toFile(resizedPhoto);
                        
                    await fs.promises.unlink(mediaPath).catch(() => {});
                    mediaPath = resizedPhoto;
                }
            } else if (isAnim) {
                const newPath = `${mediaPath}.tgs`;
                await fs.promises.rename(mediaPath, newPath);
                mediaPath = newPath;
            } else if (isVideo) {
                const newPath = `${mediaPath}.webm`;
                await fs.promises.rename(mediaPath, newPath);
                mediaPath = newPath;
            } else {
                const newPath = `${mediaPath}.png`;
                await fs.promises.rename(mediaPath, newPath);
                mediaPath = newPath;
            }

            const me = await client.getMe();
            const myId = me.id.toString();
            let packName = `a${myId}_by_userbot_${pack}`;
            let packTitle = `${me.username || me.firstName || "Userbot"}'s Kang Pack Vol.${pack}`;
            
            if (isAnim) {
                packName += "_anim";
                packTitle += " (Animated)";
            }
            if (isVideo) {
                packName += "_video";
                packTitle += " (Video)";
            }

            let exist = false;
            try {
                await client.invoke(new Api.messages.GetStickerSet({
                    stickerset: new Api.InputStickerSetShortName({ shortName: packName }),
                    hash: 0
                }));
                exist = true;
            } catch (err: any) {
                exist = false;
            }
            
            await client.invoke(new Api.contacts.Unblock({ id: "Stickers" })).catch(() => {});

            if (!exist) {
                let cmd = "/newpack";
                if (isAnim) cmd = "/newanimated";
                else if (isVideo) cmd = "/newvideo";
                
                let sent = await client.sendMessage("Stickers", { message: cmd });
                await getResponse(client, "Stickers", sent.id);
                
                sent = await client.sendMessage("Stickers", { message: packTitle });
                await getResponse(client, "Stickers", sent.id);
                
                sent = await client.sendMessage("Stickers", { file: mediaPath, forceDocument: true });
                const rsp = await getResponse(client, "Stickers", sent.id);
                if (rsp && rsp.message.includes("Sorry, the file type is invalid")) {
                    await message.edit({ text: "`Failed to add sticker, use` @Stickers `bot to add the sticker manually.`" });
                    return;
                }
                
                sent = await client.sendMessage("Stickers", { message: emoji });
                await getResponse(client, "Stickers", sent.id);
                
                sent = await client.sendMessage("Stickers", { message: "/publish" });
                await getResponse(client, "Stickers", sent.id);
                
                if (isAnim) {
                    sent = await client.sendMessage("Stickers", { message: `<${packName}>` });
                    await getResponse(client, "Stickers", sent.id);
                }
                
                sent = await client.sendMessage("Stickers", { message: "/skip" });
                await getResponse(client, "Stickers", sent.id);
                
                sent = await client.sendMessage("Stickers", { message: packName });
                await getResponse(client, "Stickers", sent.id);
                
            } else {
                let sent = await client.sendMessage("Stickers", { message: "/addsticker" });
                await getResponse(client, "Stickers", sent.id);
                
                sent = await client.sendMessage("Stickers", { message: packName });
                await getResponse(client, "Stickers", sent.id);
                
                sent = await client.sendMessage("Stickers", { file: mediaPath, forceDocument: true });
                const rsp = await getResponse(client, "Stickers", sent.id);
                if (rsp && rsp.message.includes("Sorry, the file type is invalid")) {
                    await message.edit({ text: "`Failed to add sticker, use` @Stickers `bot to add the sticker manually.`" });
                    return;
                }
                
                sent = await client.sendMessage("Stickers", { message: emoji });
                await getResponse(client, "Stickers", sent.id);
                
                sent = await client.sendMessage("Stickers", { message: "/done" });
                await getResponse(client, "Stickers", sent.id);
            }

            await message.edit({ text: `**Sticker** [kanged](t.me/addstickers/${packName})**!**` });
            
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            await message.edit({ text: `❌ Failed: ${msg}` }).catch(() => {});
        } finally {
            await fs.promises.unlink(mediaPath).catch(() => {});
        }
    }
};

export const stkrinfoPlugin = {
    name: "Sticker Info",
    description: "Get sticker pack info",
    command: "stkrinfo",
    usage: "reply .stkrinfo to any sticker",
    category: "Media",
    handler: async (event: NewMessageEvent) => {
        const message = event.message;
        const replied = await message.getReplyMessage();
        
        if (!replied || !replied.media || !replied.document) {
            await message.edit({ text: "`Reply to a sticker to get the pack details`" });
            return;
        }
        
        const isSticker = replied.document.attributes.some(a => a.className === "DocumentAttributeSticker");
        if (!isSticker) {
            await message.edit({ text: "`Reply to a sticker to get the pack details`" });
            return;
        }
        
        const stickerAttr = replied.document.attributes.find(a => a.className === "DocumentAttributeSticker") as Api.DocumentAttributeSticker;
        if (!stickerAttr.stickerset) {
            await message.edit({ text: "`Sticker doesn't belong to a valid pack.`" });
            return;
        }
        
        await message.edit({ text: "`Fetching details of the sticker pack, please wait..`" });
        
        try {
            const client = event.client!;
            const getStickerSet = await client.invoke(new Api.messages.GetStickerSet({
                stickerset: stickerAttr.stickerset as any,
                hash: 0
            }));
            
            const emojis = new Set<string>();
            for (const pack of getStickerSet.packs) {
                emojis.add(pack.emoticon);
            }
            
            const set = getStickerSet.set;
            
            const outStr = `**Sticker Title:** \`${set.title}\`\n` +
                `**Sticker Short Name:** \`${set.shortName}\`\n` +
                `**Archived:** \`${set.archived}\`\n` +
                `**Official:** \`${set.official}\`\n` +
                `**Masks:** \`${set.masks}\`\n` +
                `**Videos:** \`${set.videos}\`\n` +
                `**Animated:** \`${set.animated}\`\n` +
                `**Stickers In Pack:** \`${set.count}\`\n` +
                `**Emojis In Pack:**\n${Array.from(emojis).join(' ')}`;
                
            await message.edit({ text: outStr });
            
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : String(err);
            await message.edit({ text: `❌ Failed: ${msg}` }).catch(() => {});
        }
    }
};

export default [kangPlugin, stkrinfoPlugin];
