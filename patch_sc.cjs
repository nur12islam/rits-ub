const fs = require("fs");
let code = fs.readFileSync("src/bot/plugins/freemusic.ts", "utf8");

const newFunc = `export async function downloadAndSendSong(chatId: string | number, videoId: string, title: string, eventToEdit?: any) {
    let statusMsg: any;
    try {
        if (eventToEdit) {
            await eventToEdit.answer({ message: "Download started..." }).catch(() => {});
        }
        const peerId = typeof chatId === "string" && /^-?\\d+$/.test(chatId) ? BigInt(chatId) : chatId;
        
        statusMsg = await botClient?.sendMessage(peerId, { message: \`Downloading \\\`\${title}\\\`...\` });

        const ytdlpBin = await getYtDlpBin();
        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "song-"));
        const outTemplate = path.join(outDir, "%(title).80s.%(ext)s");

        async function runYtDlp(urlArgs: string[]): Promise<void> {
            return new Promise((resolve, reject) => {
                const args = [
                    ...urlArgs,
                    "-o", outTemplate,
                    "--no-playlist",
                    "-x", "--audio-format", "mp3",
                    "--restrict-filenames"
                ];
                if (fs.existsSync(path.join(process.cwd(), "cookies.txt"))) {
                    args.push("--cookies", path.join(process.cwd(), "cookies.txt"));
                }
                const proc = spawn(ytdlpBin, args);
                let stderr = "";
                proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
                proc.on("error", reject);
                proc.on("close", (code) => {
                    if (code !== 0) {
                        const lastLine = stderr.trim().split("\\n").filter(Boolean).pop();
                        reject(new Error(lastLine || \`yt-dlp exited with code \${code}\`));
                    } else {
                        resolve();
                    }
                });
            });
        }

        try {
            // First try YouTube
            await runYtDlp([\`https://www.youtube.com/watch?v=\${videoId}\`]);
        } catch (ytError: any) {
            console.log("YouTube download failed, trying SoundCloud...", ytError.message);
            if (statusMsg) await statusMsg.edit({ text: \`YouTube blocked download. Retrying via SoundCloud...\` }).catch(()=>{});
            try {
                // Fallback to SoundCloud search and download first result
                await runYtDlp([\`scsearch1:\${title}\`]);
            } catch (scError: any) {
                throw new Error(\`YouTube error: \${ytError.message} | SoundCloud error: \${scError.message}\`);
            }
        }

        const files = fs.readdirSync(outDir);
        if (files.length === 0) {
            if (statusMsg) await statusMsg.edit({ text: \`Could not download \\\`\${title}\\\`.\` });
            return;
        }
        
        const filePath = path.join(outDir, files[0]);

        if (statusMsg) await statusMsg.edit({ text: "Uploading 📤..." });

        await botClient?.sendMessage(peerId, {
            file: filePath,
            message: \`**\${title}**\\n*Downloaded via .song*\`
        });
        
        if (statusMsg) await statusMsg.delete().catch(() => {});

        fs.unlinkSync(filePath);
    } catch (e: any) {
        if (statusMsg) {
            await statusMsg.edit({ text: \`Error downloading \${title}: \${e.message}\` }).catch(() => {});
        } else {
            const peerId = typeof chatId === "string" && /^-?\\d+$/.test(chatId) ? BigInt(chatId) : chatId;
            await botClient?.sendMessage(peerId, { message: \`Error downloading \${title}: \${e.message}\` });
        }
    }
}`;

const startIdx = code.indexOf("export async function downloadAndSendSong(");
const endIdx = code.indexOf("export const freemusicPlugin = {");
code = code.slice(0, startIdx) + newFunc + "\n\n" + code.slice(endIdx);
fs.writeFileSync("src/bot/plugins/freemusic.ts", code);
