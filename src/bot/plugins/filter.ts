import { NewMessageEvent } from "telegram/events/index.js";
import { Filter } from "../db/models/Filter.js";

async function getChatFilters(chatId: string) {
    const filterDoc = await Filter.findOne({ chatId });
    return filterDoc ? (filterDoc.get('filters') || filterDoc.filters) : null;
}

export default [
  {
    name: "Add Filter",
    description: "Add an automated reply filter to the current chat.",
    command: "filter",
    usage: "Use .filter to execute this command.", category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const chatId = event.chatId?.toString();
      if (!chatId) return;
      
      const text = event.message.text || "";
      const args = text.split(" ");
      
      if (args.length < 3) {
        await event.message.edit({ text: "`Usage: .filter <trigger> <reply message>`" });
        return;
      }
      
      const trigger = args[1].toLowerCase();
      const reply = args.slice(2).join(" ");
      
      let filterDoc = await Filter.findOne({ chatId });
      if (!filterDoc) {
          filterDoc = new Filter({ chatId, filters: new Map() });
      }
      
      const filtersMap = filterDoc.get('filters') || filterDoc.filters;
      if (filtersMap.set) {
          filtersMap.set(trigger, reply);
      } else {
          filtersMap[trigger] = reply;
      }
      
      await filterDoc.save();
      
      await event.message.edit({ text: `\`Added filter for '\`${trigger}\`' in this chat.\`` });
    }
  },
  {
    name: "Stop Filter",
    description: "Remove a filter from the current chat.",
    command: "stop",
    usage: "Use .stop to execute this command.", category: "Admin",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const chatId = event.chatId?.toString();
      if (!chatId) return;
      
      const text = event.message.text || "";
      const args = text.split(" ");
      
      if (args.length < 2) {
        await event.message.edit({ text: "`Usage: .stop <trigger>`" });
        return;
      }
      
      const trigger = args[1].toLowerCase();
      const filterDoc = await Filter.findOne({ chatId });
      
      if (filterDoc) {
          const filtersMap = filterDoc.get('filters') || filterDoc.filters;
          let deleted = false;
          if (filtersMap.delete && filtersMap.has(trigger)) {
              filtersMap.delete(trigger);
              deleted = true;
          } else if (filtersMap[trigger]) {
              delete filtersMap[trigger];
              deleted = true;
          }
          
          if (deleted) {
              await filterDoc.save();
              await event.message.edit({ text: `\`Filter for '\`${trigger}\`' removed.\`` });
              return;
          }
      }
      
      await event.message.edit({ text: `\`No filter found for '\`${trigger}\`'.\`` });
    }
  },
  {
    name: "List Filters",
    description: "List all active filters in the current chat.",
    command: "filters",
    usage: "Use .filters to execute this command.", category: "Admin",
    handler: async (event: NewMessageEvent) => {
      const chatId = event.chatId?.toString();
      if (!chatId) return;
      
      const filtersMap = await getChatFilters(chatId);
      
      if (!filtersMap) {
        await event.message.edit({ text: "`No active filters in this chat.`" });
        return;
      }
      
      const entries = filtersMap.entries ? Array.from(filtersMap.entries()) : Object.entries(filtersMap);
      
      if (entries.length === 0) {
        await event.message.edit({ text: "`No active filters in this chat.`" });
        return;
      }
      
      let msg = "**Active Filters here:**\n\n";
      for (const [trigger] of entries) {
        msg += `• \`${trigger}\`\n`;
      }
      
      await event.message.edit({ text: msg });
    }
  }
];

export const rawListener = async (event: NewMessageEvent) => {
  const chatId = event.chatId?.toString();
  if (!chatId) return;
  
  // Ignore our own messages for filters so we don't loop
  if (event.message.out) return;
  
  const text = event.message.text?.toLowerCase() || "";
  
  const filtersMap = await getChatFilters(chatId);
  if (!filtersMap) return;
  
  const entries = filtersMap.entries ? Array.from(filtersMap.entries()) : Object.entries(filtersMap);
  
  for (const [trigger, reply] of entries as [string, string][]) {
    // Exact match or separate word match
    const regex = new RegExp(`(^|\\s)${trigger}(\\s|$)`, "i");
    if (regex.test(text)) {
      await event.message.reply({ message: reply });
      break;
    }
  }
};
