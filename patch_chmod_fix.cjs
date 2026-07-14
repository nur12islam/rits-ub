const fs = require("fs");
for (const file of ["src/bot/plugins/freemusic.ts", "src/bot/plugins/ytdlPlugin.ts"]) {
    let code = fs.readFileSync(file, "utf8");
    code = code.replace(
        /fs\.chmodSync\(ytdlpPath,\s*"755"\);/g,
        'fs.chmodSync(ytdlpPath, 0o755);'
    );
    fs.writeFileSync(file, code);
}
