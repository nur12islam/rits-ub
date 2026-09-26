import { NewMessageEvent } from "telegram/events/index.js";
import { loadDynamicPlugin } from "../pluginManager.js";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export default {
  name: "Install Plugin",
  description: "Install a plugin from a replied JavaScript or TypeScript file.",
  command: "install",
  usage: ".install — reply to a .js, .mjs, or .ts plugin file.",
  category: "Developer",
  ownerOnly: true,
  handler: async (event: NewMessageEvent) => {
    const reply = await event.message.getReplyMessage();

    if (!reply || !reply.document) {
      await event.message.edit({ text: "`Reply to a .ts, .js, or .mjs file to install it.`" });
      return;
    }

    const doc = reply.document as any;
    let fileName = "plugin.js";

    if (doc.attributes) {
      for (const attr of doc.attributes) {
        if (attr.className === "DocumentAttributeFilename") {
          fileName = attr.fileName;
        }
      }
    }

    if (!/\.(ts|js|mjs)$/i.test(fileName)) {
      await event.message.edit({ text: "`Only .ts, .js, or .mjs files can be installed.`" });
      return;
    }

    await event.message.edit({ text: "`Downloading and installing plugin...`" });

    try {
      const buffer = await event.client?.downloadMedia(reply.media);
      if (!buffer) {
        await event.message.edit({ text: "`Failed to download the file.`" });
        return;
      }

      const pluginsDir = path.join(process.cwd(), "dynamic_plugins");
      if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
      }

      const safeBase = fileName.replace(/[^a-zA-Z0-9._-]/g, "");
      const isTypeScript = /\.ts$/i.test(safeBase);
      const safeName = isTypeScript ? safeBase.replace(/\.ts$/i, ".mjs") : safeBase;
      const filePath = path.join(pluginsDir, safeName);

      if (isTypeScript) {
        const sourcePath = path.join(pluginsDir, `.${safeBase}.source.ts`);
        fs.writeFileSync(sourcePath, buffer);

        try {
          await execFileAsync("npx", [
            "esbuild",
            sourcePath,
            "--platform=node",
            "--format=esm",
            "--outfile=" + filePath
          ]);
        } finally {
          try { fs.unlinkSync(sourcePath); } catch {}
        }
      } else {
        fs.writeFileSync(filePath, buffer);
      }

      await loadDynamicPlugin(filePath);

      await event.message.edit({
        text: `\`Successfully installed plugin: ${safeName}\``
      });
    } catch (e: any) {
      console.error("Install Error:", e);
      await event.message.edit({
        text: `\`Failed to install plugin: ${e.message || "unknown error"}\``
      });
    }
  }
};
