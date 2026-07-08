const fs = require("fs");

for (const file of ["src/bot/plugins/freemusic.ts", "src/bot/plugins/ytdlPlugin.ts"]) {
    let code = fs.readFileSync(file, "utf8");
    code = code.replace(
        'const proc = spawn("python3", [ytdlpBin, ...args]);',
        'const proc = spawn(ytdlpBin, args);'
    );
    fs.writeFileSync(file, code);
}
