import { NewMessageEvent } from "telegram/events/index.js";
import { Var } from "../db/models/Var.js";

const PREFIX = "RITS_PLUGIN_REPO:";

function normalizeUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid repository URL.");
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Repository URL must use HTTP(S).");
  }

  return url.toString().replace(/\/$/, "");
}

async function getRepos(): Promise<string[]> {
  const docs = await Var.find({ key: { $regex: `^${PREFIX}` } }).sort({ key: 1 });
  return docs.map((doc) => doc.value);
}

export default {
  name: "Plugin Repositories",
  description: "Manage trusted external plugin repository URLs.",
  command: "repo",
  usage: ".repo l | .repo a <url> | .repo d <url>",
  aliases: ["repos", "rrepo"],
  category: "Developer",
  ownerOnly: true,
  handler: async (event: NewMessageEvent) => {
    const text = event.message.text || "";
    const args = text.trim().split(/\s+/).slice(1);
    const action = (args.shift() || "l").toLowerCase();

    try {
      if (action === "l" || action === "list") {
        const repos = await getRepos();
        if (!repos.length) {
          await event.message.edit({ text: "📦 **PLUGIN REPOSITORIES**\n\nNo repositories configured." });
          return;
        }

        const lines = repos.map((url, index) => `${index + 1}. ${url}`);
        await event.message.edit({
          text: `📦 **PLUGIN REPOSITORIES**\n\n${lines.join("\n")}`
        });
        return;
      }

      if (action === "a" || action === "add") {
        const raw = args[0];
        if (!raw) {
          await event.message.edit({ text: "Usage: .repo a <url>" });
          return;
        }

        const url = normalizeUrl(raw);
        const existing = await Var.findOne({ key: { $regex: `^${PREFIX}` }, value: url });

        if (existing) {
          await event.message.edit({ text: "ℹ️ Repository already exists." });
          return;
        }

        const count = await Var.countDocuments({ key: { $regex: `^${PREFIX}` } });
        await Var.create({ key: `${PREFIX}${count + 1}`, value: url });

        await event.message.edit({ text: `✅ Repository added.\n\n${url}` });
        return;
      }

      if (action === "d" || action === "remove" || action === "delete") {
        const raw = args[0];
        if (!raw) {
          await event.message.edit({ text: "Usage: .repo d <url>" });
          return;
        }

        const url = normalizeUrl(raw);
        const deleted = await Var.deleteMany({ key: { $regex: `^${PREFIX}` }, value: url });

        await event.message.edit({
          text: deleted.deletedCount ? "🗑️ Repository removed." : "❌ Repository not found."
        });
        return;
      }

      await event.message.edit({ text: "Usage: .repo [l|a|d] [url]" });
    } catch (error: any) {
      await event.message.edit({ text: `❌ ${error?.message || "Repository operation failed."}` });
    }
  }
};
