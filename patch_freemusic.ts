import fs from "fs";
let code = fs.readFileSync("src/bot/plugins/freemusic.ts", "utf8");
code = code.replace("const peerId = typeof chatId === \"string\" && !isNaN(Number(chatId)) ? BigInt(chatId) : chatId;", "const peerId = typeof chatId === \"string\" && /^-?\\d+$/.test(chatId) ? BigInt(chatId) : chatId; console.log('Downloading for peerId:', peerId);");
fs.writeFileSync("src/bot/plugins/freemusic.ts", code);
