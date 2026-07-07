const fs = require("fs");
let code = fs.readFileSync("src/bot/plugins/freemusic.ts", "utf8");

code = code.replace(/if \(eventToEdit\) \{\s*await eventToEdit\.edit\(\{ text: `Downloading \\`\$\{title\}\\`\.\.\.` \}\);\s*\}/, 
  "if (eventToEdit) { await eventToEdit.answer({ message: `Downloading ${title}...` }); }");

code = code.replace(/if \(eventToEdit\) await eventToEdit\.edit\(\{ text: `Could not download \\`\$\{title\}\\`\.` \}\);/, 
  "if (eventToEdit) await eventToEdit.answer({ message: `Could not download ${title}.` });");

code = code.replace(/if \(eventToEdit\) \{\s*await eventToEdit\.edit\(\{ text: "Uploading 📤\.\.\." \}\);\s*\}/, 
  "");

code = code.replace(/if \(eventToEdit\) \{\s*try \{\s*if \(eventToEdit\.message\) \{\s*await eventToEdit\.message\.delete\(\);\s*\} else \{\s*await eventToEdit\.delete\(\);\s*\}\s*\} catch \(e\) \{\}\s*\}/, 
  "// No delete, inline messages can't be easily deleted without inlineMessageId API directly");

code = code.replace(/if \(eventToEdit\) \{\s*await eventToEdit\.edit\(\{ text: `Error: \$\{e\.message\}` \}\);\s*\} else \{/g, 
  "if (eventToEdit) { await eventToEdit.answer({ message: `Error: ${e.message}` }); } else {");

fs.writeFileSync("src/bot/plugins/freemusic.ts", code);
