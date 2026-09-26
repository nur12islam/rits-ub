import { NewMessageEvent } from "telegram/events/index.js";
import { getLoadedPlugins } from "../pluginManager.js";
import { COMMAND_PREFIX } from "../index.js";

export default {
  name: "Menu",
  description: "Show every currently loaded RITS command.",
  command: "menu",
  usage: "Use .menu to show all available commands.",
  category: "General",
  handler: async (event: NewMessageEvent) => {
    const plugins = getLoadedPlugins();
    const grouped = new Map<string, typeof plugins>();

    for (const plugin of plugins) {
      const category = plugin.category || "Other";
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category)!.push(plugin);
    }

    let text = "🤖 **RITS COMMAND MENU** 🤖\n\n";
    text += `📦 **Total commands:** ${plugins.length}\n\n`;

    for (const [category, items] of grouped) {
      text += `━━━ **${category}** ━━━\n`;
      for (const plugin of items.sort((a, b) => a.command.localeCompare(b.command))) {
        const aliases = plugin.aliases?.length ? ` | ${plugin.aliases.map(a => COMMAND_PREFIX + a).join(", ")}` : "";
        text += `• ${COMMAND_PREFIX}${plugin.command}${aliases} — ${plugin.description}\n`;
      }
      text += "\n";
    }

    // Telegram has a message limit; split safely if the command inventory is large.
    const chunks: string[] = [];
    while (text.length > 4000) {
      let cut = text.lastIndexOf("\n", 4000);
      if (cut < 1000) cut = 4000;
      chunks.push(text.slice(0, cut));
      text = text.slice(cut + 1);
    }
    if (text) chunks.push(text);

    await event.message.edit({ text: chunks[0] });
    for (let i = 1; i < chunks.length; i++) {
      await event.message.reply({ message: chunks[i] });
    }
  }
};