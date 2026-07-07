const fs = require("fs");
let code = fs.readFileSync("src/bot/plugins/freemusic.ts", "utf8");
code = code.replace(/await botClient\?\.sendMessage\(peerId, \{/g, "console.log('Sending message to peerId:', peerId); await botClient?.sendMessage(peerId, {");
fs.writeFileSync("src/bot/plugins/freemusic.ts", code);
