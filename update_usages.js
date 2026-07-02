import fs from 'fs';
import path from 'path';

const pluginsDir = path.join(process.cwd(), 'src/bot/plugins');
const files = fs.readdirSync(pluginsDir);

for (const file of files) {
  if (!file.endsWith('.ts')) continue;
  
  const filePath = path.join(pluginsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove messy usage lines
  content = content.replace(/\s*usage:\s*"Just use \." \+ "[^"]+",,/g, '');
  content = content.replace(/\s*usage:\s*"Use \.[^"]+ to execute this command\.",/g, '');
  content = content.replace(/\s*usage:\s*[^,\n]+,,?/g, '');
  
  // Re-add them cleanly
  content = content.replace(/(command:\s*(["'])([^"']+)\2\s*,)/g, (match, p1, p2, cmdName) => {
    return p1 + `\n    usage: "Use .${cmdName} to execute this command.",`;
  });
  
  // Fix sangmata.ts which had its own usage defined manually.
  // Actually, we'll just let it be overridden or duplicated and then I'll fix sangmata manually if needed.
  // Let's remove double usages.
  content = content.replace(/(usage:\s*"[^"]+",\s*)(usage:\s*"[^"]+",\s*)+/g, '$1');
  
  fs.writeFileSync(filePath, content);
}
console.log('Cleanup Done!');
