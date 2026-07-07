const fs = require("fs");
let code = fs.readFileSync("src/bot/inlineMenu.ts", "utf8");
code = code.replace(/const videoId = parts\[3\];\s*await event\.answer\(\);/, "const videoId = parts[3];\n            // await event.answer();");
fs.writeFileSync("src/bot/inlineMenu.ts", code);
