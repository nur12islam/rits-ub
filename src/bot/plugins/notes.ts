import { NewMessageEvent } from "telegram/events/index.js";
import { Note } from "../db/models/Note.js";

export default [
  {
    name: "Save Note",
    description: "Save a note with a name.",
    command: "save",
    usage: "Use .save to execute this command.", category: "General",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text?.replace(/^\.save\s*/, "") || "";
      const args = text.split(" ");
      const name = args[0]?.toLowerCase();
      
      const replyMsg = await event.message.getReplyMessage();
      let noteContent = "";
      
      if (replyMsg && replyMsg.text) {
          noteContent = replyMsg.text;
      } else {
          noteContent = args.slice(1).join(" ");
      }
      
      if (!name || !noteContent) {
        await event.message.edit({ text: "`Usage: .save <name> <content> OR reply to a message with .save <name>`" });
        return;
      }
      
      try {
          await Note.findOneAndUpdate({ name }, { content: noteContent }, { upsert: true, new: true });
          await event.message.edit({ text: `\`Note saved as '${name}'.\`` });
      } catch (err) {
          await event.message.edit({ text: `\`Error saving note '${name}'.\`` });
      }
    }
  },
  {
    name: "Get Note",
    description: "Get a saved note.",
    command: "get",
    usage: "Use .get to execute this command.", category: "General",
    handler: async (event: NewMessageEvent) => {
      const name = event.message.text?.replace(/^\.get\s*/, "")?.toLowerCase() || "";
      if (!name) {
        await event.message.edit({ text: "`Usage: .get <name>`" });
        return;
      }
      
      const note = await Note.findOne({ name });
      if (note) {
        await event.message.edit({ text: note.content });
      } else {
        await event.message.edit({ text: `\`Note '${name}' not found.\`` });
      }
    }
  },
  {
    name: "Delete Note",
    description: "Delete a saved note.",
    command: "clear",
    usage: "Use .clear to execute this command.", category: "General",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const name = event.message.text?.replace(/^\.clear\s*/, "")?.toLowerCase() || "";
      if (!name) {
        await event.message.edit({ text: "`Usage: .clear <name>`" });
        return;
      }
      
      const res = await Note.deleteOne({ name });
      if (res.deletedCount && res.deletedCount > 0) {
        await event.message.edit({ text: `\`Note '${name}' deleted.\`` });
      } else {
        await event.message.edit({ text: `\`Note '${name}' not found.\`` });
      }
    }
  },
  {
    name: "List Notes",
    description: "List all saved notes.",
    command: "notes",
    usage: "Use .notes to execute this command.", category: "General",
    handler: async (event: NewMessageEvent) => {
      const notes = await Note.find({}, 'name');
      if (notes.length === 0) {
        await event.message.edit({ text: "`No saved notes found.`" });
        return;
      }
      
      let msg = "**Saved Notes:**\n\n";
      notes.forEach(n => msg += `• \`${n.name}\`\n`);
      await event.message.edit({ text: msg });
    }
  }
];
