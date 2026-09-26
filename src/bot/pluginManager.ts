import { TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events/index.js";
import { COMMAND_PREFIX, isOutgoing, isSudo, logPluginError } from "./index.js";
import { Config } from "./config.js";
import path from "path";
import { pluginModules } from "./pluginRegistry.generated.js";

type CommandHandler = (event: NewMessageEvent) => Promise<void>;
type PluginLifecycle = {
  onLoad?: () => Promise<void> | void;
  onUnload?: () => Promise<void> | void;
};

export interface Plugin extends PluginLifecycle {
  name: string;
  description: string;
  command: string;
  usage?: string;
  aliases?: string[];
  category?: string;
  ownerOnly?: boolean;
  permissions?: Array<"PUBLIC" | "SUDO" | "OWNER" | "SELF" | "GROUP_ADMIN">;
  version?: string;
  dependencies?: string[];
  handler: CommandHandler;
}

const plugins: Plugin[] = [];
const disabledPlugins = new Set<string>();

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
  for (const plugin of plugins) {
    try {
      await plugin.onUnload?.();
    } catch (err) {
      console.error(`Failed to unload plugin ${plugin.name} during reload:`, err);
    }
  }
  plugins.length = 0;
  disabledPlugins.clear();

  // Plugin modules are generated from every flat .ts plugin file.
  const modules = await Promise.all(pluginModules.map((load) => load()));

  for (const mod of modules) {
    // 1. Handle default export (single plugin or array of plugins)
    if (mod.default) {
      if (Array.isArray(mod.default)) {
        for (const p of mod.default) await registerPlugin(p, client);
      } else if (typeof mod.default === "object" && "command" in mod.default) {
        await registerPlugin(mod.default as Plugin, client);
      }
    }

    // 2. Handle named exports
    for (const key in mod) {
      if (key === "default" || key === "rawListener") continue;
      const exp = (mod as any)[key];
      if (exp && typeof exp === "object" && "command" in exp) {
        await registerPlugin(exp as Plugin, client);
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

async function registerPlugin(plugin: Plugin, client: TelegramClient) {
  if (!plugin?.command || typeof plugin.handler !== "function") {
    throw new Error("Invalid plugin: command and handler are required.");
  }

  const existingIndex = plugins.findIndex(p => p.command === plugin.command);
  if (existingIndex >= 0) {
    const existing = plugins[existingIndex];
    try {
      await existing.onUnload?.();
    } catch (err) {
      console.error(`Failed to unload plugin ${existing.name} during replacement:`, err);
    }
    plugins[existingIndex] = plugin;
  } else {
    plugins.push(plugin);
  }

  disabledPlugins.delete(plugin.command);

  try {
    await plugin.onLoad?.();
  } catch (err) {
    // Loading a plugin should not crash the entire userbot.
    console.error(`Plugin ${plugin.name} onLoad failed:`, err);
    await logPluginError(plugin.name, err);
  }
}

async function hasPluginPermission(plugin: Plugin, event: NewMessageEvent, isOut: boolean, sudo: boolean): Promise<boolean> {
  if (plugin.ownerOnly) {
    const senderId = event.message.senderId?.toString();
    return !!senderId && Config.OWNER_ID.map(String).includes(senderId) && isOut;
  }

  if (!plugin.permissions || plugin.permissions.length === 0) {
    // Legacy plugins keep their existing behavior.
    return isOut || sudo;
  }

  const senderId = event.message.senderId?.toString();
  const owner = !!senderId && Config.OWNER_ID.map(String).includes(senderId);

  if (plugin.permissions.includes("PUBLIC")) return true;
  if (plugin.permissions.includes("OWNER") && owner) return true;
  if (plugin.permissions.includes("SUDO") && (sudo || owner)) return true;
  if (plugin.permissions.includes("SELF") && isOut) return true;

  return false;
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
    if (disabledPlugins.has(plugin.command)) continue;
    if (!(await hasPluginPermission(plugin, event, isOut, sudo))) continue;

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
        await logPluginError(plugin.name, err, event);
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
    if (disabledPlugins.has(plugin.command)) continue;
    if (!(await hasPluginPermission(plugin, event, false, sudo))) continue;

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
          await logPluginError(plugin.name, err, event);
          await event.message.reply({
          message: `**Error in ${plugin.name}:** \`${String(err)}\``
        });
      }
      return; // Stop after executing one command
    }
  }
}

export async function loadDynamicPlugin(filePath: string): Promise<Plugin[]> {
  const { botClient } = await import("./index.js");
  if (!botClient) throw new Error("Bot client not ready");
  
  // Use file URL to ensure absolute path works across OS
  const fileUrl = "file://" + path.resolve(filePath).replace(/\\/g, "/");
  const mod = await import(fileUrl + "?t=" + Date.now());

  if (mod.default) {
    if (Array.isArray(mod.default)) {
      for (const p of mod.default) await registerPlugin(p, botClient!);
    } else if (typeof mod.default === "object" && "command" in mod.default) {
      await registerPlugin(mod.default as Plugin, botClient!);
    }
  }

  // Also check named exports
  for (const key in mod) {
    if (key === "default" || key === "rawListener") continue;
    const exp = (mod as any)[key];
    if (exp && typeof exp === "object" && "command" in exp) {
      await registerPlugin(exp as Plugin, botClient!);
    }
  }

  if (mod.rawListener && typeof mod.rawListener === "function") {
    botClient.addEventHandler(mod.rawListener, new NewMessage({}));
  }

  console.log(`Loaded dynamic plugin from ${filePath}`);
  return getLoadedPlugins();
}

export function getLoadedPlugins() {
  return plugins.filter((plugin) => !disabledPlugins.has(plugin.command));
}

export function getAllPlugins() {
  return [...plugins];
}

export function getPlugin(commandOrAlias: string) {
  const needle = commandOrAlias.replace(/^[.!/]/, "").toLowerCase();
  return plugins.find(
    (plugin) =>
      plugin.command.toLowerCase() === needle ||
      plugin.aliases?.some((alias) => alias.toLowerCase() === needle)
  );
}

export function isPluginEnabled(command: string) {
  return !disabledPlugins.has(command);
}

export async function enablePlugin(commandOrAlias: string) {
  const plugin = getPlugin(commandOrAlias);
  if (!plugin) throw new Error(`Plugin not found: ${commandOrAlias}`);
  disabledPlugins.delete(plugin.command);
  return plugin;
}

export async function disablePlugin(commandOrAlias: string) {
  const plugin = getPlugin(commandOrAlias);
  if (!plugin) throw new Error(`Plugin not found: ${commandOrAlias}`);
  if (plugin.ownerOnly && plugin.command === "plugin") {
    throw new Error("The plugin manager cannot be disabled.");
  }
  disabledPlugins.add(plugin.command);
  return plugin;
}

export async function unloadPlugin(commandOrAlias: string) {
  const plugin = getPlugin(commandOrAlias);
  if (!plugin) throw new Error(`Plugin not found: ${commandOrAlias}`);
  await plugin.onUnload?.();
  const index = plugins.findIndex((item) => item.command === plugin.command);
  if (index >= 0) plugins.splice(index, 1);
  disabledPlugins.delete(plugin.command);
  return plugin;
}

export async function reloadPlugin(filePath: string) {
  // Dynamic plugins are re-imported with a cache-busting query. Existing
  // command registrations are replaced atomically by registerPlugin().
  await loadDynamicPlugin(filePath);
  return getLoadedPlugins();
}
