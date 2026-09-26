import { NewMessageEvent } from "telegram/events/index.js";
import {
  disablePlugin,
  enablePlugin,
  getAllPlugins,
  getPlugin
} from "../pluginManager.js";
import { Config } from "../config.js";

function splitMessage(text: string, maxLength = 3900): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    let cut = remaining.lastIndexOf("\\n", maxLength);
    if (cut < 500) cut = remaining.lastIndexOf(" ", maxLength);
    if (cut < 1) cut = maxLength;

    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\\n+/, "").trimStart();
  }

  if (remaining.length) chunks.push(remaining);
  return chunks;
}

function formatPlugin(plugin: any) {
  const aliases = plugin.aliases?.length ? `\\nAliases: ${plugin.aliases.join(", ")}` : "";
  const permissions = plugin.permissions?.length ? `\\nPermissions: ${plugin.permissions.join(", ")}` : "";
  return `🔌 **${plugin.name}**\\nCommand: \\.${plugin.command}\\nCategory: ${plugin.category || "Other"}\\nVersion: ${plugin.version || "legacy"}${aliases}${permissions}\\n\\n${plugin.description}`;
}

export default {
  name: "Plugin Manager",
  description: "Inspect, enable, or disable RITS plugins.",
  command: "plugin",
  usage: ".plugin [l|i|e|d] [command]",
  aliases: ["plugins"],
  category: "System",
  ownerOnly: true,
  handler: async (event: NewMessageEvent) => {
    const text = event.message.text || "";
    const args = text.trim().split(/\\s+/).slice(1);
    const action = (args.shift() || "l").toLowerCase();

    if (action === "l" || action === "list") {
      const all = getAllPlugins();
      const lines = all.map((p) => `• .${p.command} — ${p.description}`);
      const header = `🔌 **RITS PLUGINS**\\n\\nTotal: ${all.length}\\n\\n`;
      const chunks = splitMessage(header + lines.join("\\n"));
      await event.message.edit({ text: chunks[0] });

      for (const chunk of chunks.slice(1)) {
        await event.message.reply({ message: chunk });
      }
      return;
    }

    const target = args[0];
    if (!target) {
      await event.message.edit({ text: "Usage: .plugin [l|i|e|d] <command>" });
      return;
    }

    const plugin = getPlugin(target);
    if (!plugin) {
      await event.message.edit({ text: `❌ Plugin not found: ${target}` });
      return;
    }

    if (action === "i" || action === "info") {
      await event.message.edit({ text: formatPlugin(plugin) });
      return;
    }

    if (action === "e" || action === "enable") {
      await enablePlugin(plugin.command);
      await event.message.edit({ text: `✅ Enabled: .${plugin.command}` });
      return;
    }

    if (action === "d" || action === "disable") {
      if (plugin.command === "plugin") {
        await event.message.edit({ text: "❌ The plugin manager cannot be disabled." });
        return;
      }
      await disablePlugin(plugin.command);
      await event.message.edit({ text: `⏸️ Disabled: .${plugin.command}` });
      return;
    }

    await event.message.edit({ text: "Usage: .plugin [list|info|enable|disable] <command>" });
  }
};
