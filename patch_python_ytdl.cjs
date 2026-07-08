const fs = require("fs");
let code = fs.readFileSync("src/bot/plugins/ytdlPlugin.ts", "utf8");

code = code.replace(
    'const proc = spawn(ytdlpBin, args);',
    'const proc = spawn("python3", [ytdlpBin, ...args]);'
);

fs.writeFileSync("src/bot/plugins/ytdlPlugin.ts", code);
