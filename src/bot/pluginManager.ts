import { TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import { COMMAND_PREFIX, isOutgoing, isSudo } from "./index.js";
import { Config } from "./config.js";
import path from "path";

type CommandHandler = (event: NewMessageEvent) => Promise<void>;

export interface Plugin {
  name: string;
  description: string;
  command: string;
  usage?: string;
  aliases?: string[];
  category?: string;
  ownerOnly?: boolean;
  handler: CommandHandler;
}

const plugins: Plugin[] = [];

let isListenerAttached = false;

// Chat -> whether the assistant bot is present.
// Presence is cached briefly because Telegram membership checks are relatively expensive.
const assistantPresenceCache = new Map<string, { present: boolean; expiresAt: number }>();
const ASSISTANT_PRESENCE_CACHE_MS = 30_000;

function getMessageChatKey(message: any): string | null {
  if (message?.chatId !== undefined && message?.chatId !== null) {
    return message.chatId.toString();
  }
  if (message?.peerId) {
    try {
      return JSON.stringify(message.peerId);
    } catch {}
  }
  return null;
}

async function isAssistantPresentInChat(message: any): Promise<boolean> {
  const { assistantBot } = await import("./index.js");

  if (!assistantBot || !message) return false;

  const chatKey = getMessageChatKey(message);
  if (!chatKey) return false;

  const cached = assistantPresenceCache.get(chatKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.present;
  }

  let present = false;

  try {
    const assistantMe: any = await assistantBot.getMe();
    const assistantId = assistantMe?.id?.toString();

    // A private chat directly with the assistant bot.
    if (assistantId && message.chatId?.toString() === assistantId) {
      present = true;
    } else if (message.peerId) {
      const entity = await assistantBot.getInputEntity(message.peerId);

      // Search the chat's participants when possible.
      // This is the strongest check for groups/supergroups/channels.
      if (assistantMe?.username) {
        try {
          for await (const user of assistantBot.iterParticipants(entity, {
            search: assistantMe.username
          })) {
            if (user?.id?.toString() === assistantId) {
              present = true;
              break;
            }
          }
        } catch {}
      }

      // Fallback: if participant lookup is unavailable, the assistant's
      // dialog list still provides a reliable indication for chats it is in.
      if (!present) {
        try {
          const dialogs = await assistantBot.getDialogs({ limit: 1000 });
          present = dialogs.some(
            (dialog: any) => dialog?.id?.toString() === chatKey
          );
        } catch {}
      }
    }
  } catch {}

  assistantPresenceCache.set(chatKey, {
    present,
    expiresAt: Date.now() + ASSISTANT_PRESENCE_CACHE_MS
  });

  return present;
}

export async function loadPlugins(client: TelegramClient) {
  console.log("Loading plugins...");
  plugins.length = 0; // Reset on reload

  // Define the plugin modules to load
  const modules = [
    await import("./plugins/ping.js"),
    await import("./plugins/cookies.js"),
    await import("./plugins/help.js"),
    await import("./plugins/eval.js"),
    await import("./plugins/alive.js"),
    await import("./plugins/ci.js"),
    await import("./plugins/id.js"),
    await import("./plugins/purge.js"),
    await import("./plugins/speedtest.js"),
    await import("./plugins/utube.js"),
    await import("./plugins/gadmin.js"),
    await import("./plugins/sysinfo.js"),
    await import("./plugins/afk.js"),
    await import("./plugins/sudo.js"),
    await import("./plugins/channel.js"),
    await import("./plugins/pmpermit.js"),
    await import("./plugins/tools.js"),
    await import("./plugins/user.js"),
    await import("./plugins/notes.js"),
    await import("./plugins/install.js"),
    await import("./plugins/filter.js"),
    await import("./plugins/gcast.js"),
    await import("./plugins/system.js"),
    await import("./plugins/exec.js"),
    await import("./plugins/loggerCmds.js"),
    await import("./plugins/fun.js"),
    await import("./plugins/search.js"),
    await import("./plugins/utilities2.js"),
    await import("./plugins/spam2.js"),
    await import("./plugins/profile.js"),
    await import("./plugins/misc_plugins.js"),
    await import("./plugins/ocr.js"),
    await import("./plugins/error_logger.js"),
    await import("./plugins/paste.js"),
    await import("./plugins/sangmata.js"),
    await import("./plugins/rmbg.js"),
    await import("./plugins/cbutton.js"),
    await import("./plugins/translate.js"),
    await import("./plugins/upload.js"),
    await import("./plugins/download.js"),
    await import("./plugins/dictionary.js"),
    await import("./plugins/weather.js"),
    await import("./plugins/freemusic.js"),
    await import("./plugins/joke.js"),
    await import("./plugins/telegraph.js"),
    await import("./plugins/ytdlPlugin.js"),
    await import("./plugins/webss.js"),
    await import("./plugins/quote.js"),
    await import("./plugins/stickerify.js"),
    await import("./plugins/kang.js"),
    await import("./plugins/gemini.js"),
    await import("./plugins/geminir.js"),
    await import("./plugins/geminidoc.js"),
    await import("./plugins/qr.js"),
    await import("./plugins/gdl.js"),
  ];

  for (const mod of modules) {
    // 1. Handle default export (single plugin or array of plugins)
    if (mod.default) {
      if (Array.isArray(mod.default)) {
        mod.default.forEach((p) => registerPlugin(p, client));
      } else if (typeof mod.default === "object" && "command" in mod.default) {
        registerPlugin(mod.default as Plugin, client);
      }
    }

    // 2. Handle named exports
    for (const key in mod) {
      if (key === "default" || key === "rawListener") continue;
      const exp = (mod as any)[key];
      if (exp && typeof exp === "object" && "command" in exp) {
        registerPlugin(exp as Plugin, client);
      }
    }

    // 3. Handle raw listeners (for plugins like AFK that need to read incoming messages)
    if ((mod as any).rawListener && typeof (mod as any).rawListener === "function") {
      client.addEventHandler((mod as any).rawListener, new NewMessage({}));
    }
  }

  if (!isListenerAttached) {
    client.addEventHandler(handleIncomingCommand, new NewMessage({}));
    
    import("./index.js").then(({ assistantBot }) => {
      if (assistantBot) {
        assistantBot.addEventHandler(handleAssistantCommand, new NewMessage({ incoming: true }));
      }
    }).catch(() => {});
    
    isListenerAttached = true;
  }

  console.log(`Successfully loaded ${plugins.length} commands.`);
}

function registerPlugin(plugin: Plugin, client: TelegramClient) {
  if (plugins.find(p => p.command === plugin.command)) {
    const idx = plugins.findIndex(p => p.command === plugin.command);
    plugins[idx] = plugin; // Update existing plugin
    return;
  }
  plugins.push(plugin);
}

async function handleIncomingCommand(event: NewMessageEvent) {
  const message = event.message;
  const isOut = isOutgoing(event);
  const sudo = isSudo(event);
  const text = message.text || "";

  // Normal/main-account commands use CMD_TRIGGER (normally ".").
  // Sudo commands use SUDO_TRIGGER (normally "!").
  const isSudoCommand = text.startsWith(Config.SUDO_TRIGGER);

  if (isSudoCommand) {
    // Incoming "!" commands are reserved for sudo users.
    // Outgoing commands from the main account remain allowed.
    if (!isOut && !sudo) return;

    // If the assistant bot is in this chat, it has priority for "!" commands.
    // The main userbot becomes the fallback when the assistant is not present.
    if (!isOut && await isAssistantPresentInChat(message)) {
      return;
    }
  } else {
    if (!isOut && !sudo) return;
    if (!text.startsWith(COMMAND_PREFIX)) return;
  }

  const prefix = isSudoCommand ? Config.SUDO_TRIGGER : COMMAND_PREFIX;

  for (const plugin of plugins) {
    if (plugin.ownerOnly && !isOut) continue;

    const commandStr = prefix + plugin.command;
    let isMatch =
      text === commandStr ||
      text.startsWith(commandStr + " ") ||
      text.startsWith(commandStr + "\n");
    
    if (!isMatch && plugin.aliases) {
      for (const alias of plugin.aliases) {
        const aliasStr = prefix + alias;
        if (
          text === aliasStr ||
          text.startsWith(aliasStr + " ") ||
          text.startsWith(aliasStr + "\n")
        ) {
          isMatch = true;
          break;
        }
      }
    }
    
    if (isMatch) {
      if (!isOut) {
        message.edit = async (args: any) => {
          return await message.reply({ message: args.text, ...args });
        };
      }
      try {
        await plugin.handler(event);
      } catch (err) {
        console.error(`Plugin ${plugin.name} error:`, err);
        await event.message.edit({
          text: `**Error in ${plugin.name}:** \`${String(err)}\``
        });
      }
      return; // Stop after executing one command
    }
  }
}

async function handleAssistantCommand(event: NewMessageEvent) {
  const { Config } = await import("./config.js");
  const { isSudo } = await import("./index.js");
  
  const message = event.message;
  const sudo = isSudo(event);
  const isOwner = event.message.senderId
    ? Config.OWNER_ID.includes(Number(event.message.senderId))
    : false;
  
  if (!sudo && !isOwner) return;

  // Assistant/sudo handler is explicitly "!".
  const ASSISTANT_PREFIX = Config.SUDO_TRIGGER;
  const text = message.text || "";
  if (!text.startsWith(ASSISTANT_PREFIX)) return;

  for (const plugin of plugins) {
    if (plugin.ownerOnly && !isOwner) continue;

    const commandStr = ASSISTANT_PREFIX + plugin.command;
    let isMatch =
      text === commandStr ||
      text.startsWith(commandStr + " ") ||
      text.startsWith(commandStr + "\n");
    
    if (!isMatch && plugin.aliases) {
      for (const alias of plugin.aliases) {
        const aliasStr = ASSISTANT_PREFIX + alias;
        if (
          text === aliasStr ||
          text.startsWith(aliasStr + " ") ||
          text.startsWith(aliasStr + "\n")
        ) {
          isMatch = true;
          break;
        }
      }
    }
    
    if (isMatch) {
      message.edit = async (args: any) => {
        return await message.reply({ message: args.text, ...args });
      };
      (event as any).isAssistantBot = true;
      try {
        await plugin.handler(event);
      } catch (err) {
        console.error(`Plugin ${plugin.name} error:`, err);
        await event.message.reply({
          message: `**Error in ${plugin.name}:** \`${String(err)}\``
        });
      }
      return; // Stop after executing one command
    }
  }
}

export async function loadDynamicPlugin(filePath: string) {
  const { botClient } = await import("./index.js");
  if (!botClient) throw new Error("Bot client not ready");
  
  // Use file URL to ensure absolute path works across OS
  const fileUrl = "file://" + path.resolve(filePath).replace(/\\/g, "/");
  const mod = await import(fileUrl + "?t=" + Date.now());

  if (mod.default) {
    if (Array.isArray(mod.default)) {
      mod.default.forEach((p) => registerPlugin(p, botClient!));
    } else if (typeof mod.default === "object" && "command" in mod.default) {
      registerPlugin(mod.default as Plugin, botClient!);
    }
  }

  // Also check named exports
  for (const key in mod) {
    if (key === "default" || key === "rawListener") continue;
    const exp = (mod as any)[key];
    if (exp && typeof exp === "object" && "command" in exp) {
      registerPlugin(exp as Plugin, botClient!);
    }
  }

  if (mod.rawListener && typeof mod.rawListener === "function") {
    botClient.addEventHandler(mod.rawListener, new NewMessage({}));
  }
  
  console.log(`Loaded dynamic plugin from ${filePath}`);
}

export function getLoadedPlugins() {
  return plugins;
}
