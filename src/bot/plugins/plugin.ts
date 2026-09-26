import { NewMessageEvent } from "telegram/events/index.js";
import {
  disablePlugin,
  enablePlugin,
  getAllPlugins,
  getPlugin
} from "../pluginManager.js";
import { Config } from "../config.js";

function formatPlugin(plugin: any) {
  const aliases = plugin.aliases?.length ? `\\nAliases: ${plugin.aliases.join(", ")}` : "";
  const permissions = plugin.permissions?.length ? `\\nPermissions: ${plugin.permissions.join(", ")}` : "";
  return `🔌 **${plugin.name}**\\nCommand: \\.${plugin.command}\\nCategory: ${plugin.category || "Other"}\\nVersion: ${plugin.version || "legacy"}${aliases}${permissions}\\n\\n${plugin.description}`;
}

export default {
  name: "Plugin Manager",
  description: "Inspect, enable, or disable RITS plugins.",
  command: "plugin",
  usage: ".plugin [list|info <command>|enable <command>|disable <command>]",
  aliases: ["plugins"],
  category: "System",
  ownerOnly: true,
  handler: async (event: NewMessageEvent) => {
    const text = event.message.text || "";
    const args = text.trim().split(/\\s+/).slice(1);
    const action = (args.shift() || "list").toLowerCase();

    if (action === "list") {
      const all = getAllPlugins();
      const lines = all.map((p) => `• .${p.command} — ${p.description}`);
      const header = `🔌 **RITS PLUGINS**\\n\\nTotal: ${all.length}\\n\\n`;
      await event.message.edit({ text: header + lines.join("\\n") });
      return;
    }

    const target = args[0];
    if (!target) {
      await event.message.edit({ text: "Usage: .plugin [list|info|enable|disable] <command>" });
      return;
    }

    const plugin = getPlugin(target);
    if (!plugin) {
      await event.message.edit({ text: `❌ Plugin not found: ${target}` });
      return;
    }

    if (action === "info") {
      await event.message.edit({ text: formatPlugin(plugin) });
      return;
    }

    if (action === "enable") {
      await enablePlugin(plugin.command);
      await event.message.edit({ text: `✅ Enabled: .${plugin.command}` });
      return;
    }

    if (action === "disable") {
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
