const fs = require("fs");
let code = fs.readFileSync("src/bot/plugins/ytdlPlugin.ts", "utf8");

const oldFunc = `async function getYtDlpBin(): Promise<string> {
    const binDir = path.join(process.cwd(), "bin");
    const ytdlpPath = path.join(binDir, "yt-dlp");
    if (fs.existsSync(ytdlpPath)) {
        return ytdlpPath;
    }
    fs.mkdirSync(binDir, { recursive: true });
    await execPromise(\`curl -sLo \${ytdlpPath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp && chmod +x \${ytdlpPath}\`);
    return ytdlpPath;
}`;

const newFunc = `async function getYtDlpBin(): Promise<string> {
    const binDir = path.join(process.cwd(), "bin");
    const ytdlpPath = path.join(binDir, "yt-dlp");
    if (!fs.existsSync(ytdlpPath)) {
        fs.mkdirSync(binDir, { recursive: true });
        await execPromise(\`curl -sLo \${ytdlpPath} https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp\`);
    }
    try {
        fs.chmodSync(ytdlpPath, "755");
    } catch (e) {
        try {
            await execPromise(\`chmod +x \${ytdlpPath}\`);
        } catch (e2) {}
    }
    return ytdlpPath;
}`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync("src/bot/plugins/ytdlPlugin.ts", code);
