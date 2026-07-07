const fs = require("fs");
let code = fs.readFileSync("src/bot/plugins/freemusic.ts", "utf8");
code = code.replace(/event\.message\.chatId/g, "event.chatId");
fs.writeFileSync("src/bot/plugins/freemusic.ts", code);
