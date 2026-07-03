import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { loadPlugins } from "./pluginManager.js";
import { Config } from "./config.js";
import fs from "fs";
import { connectDB } from "./db/mongoose.js";
import { Sudo } from "./db/models/Sudo.js";
import { Session } from "./db/models/Session.js";

export let botClient: TelegramClient | null = null;
export let assistantBot: TelegramClient | null = null;
export let logChannelId: string | number | null = null;
let isRunning = false;
let botUser: any = null;

export const COMMAND_PREFIX = Config.CMD_TRIGGER;
export const sudoUsers = new Set<string>();

export async function loadSudo() {
  try {
    const sudoDoc = await Sudo.findOne();
    if (sudoDoc) {
      sudoDoc.users.forEach((id: string) => sudoUsers.add(id));
    }
    Config.SUDO_USERS.forEach((id: number) => sudoUsers.add(id.toString()));
  } catch(e) {
    console.error("Failed to load sudo users from db", e);
  }
}

export async function saveSudo() {
  try {
    await Sudo.findOneAndUpdate({}, { users: Array.from(sudoUsers) }, { upsert: true, new: true });
  } catch(e) {
    console.error("Failed to save sudo users to db", e);
  }
}

export async function logToChannel(message: string, buttons?: any) {
  if (logChannelId) {
    try {
      const clientToUse = assistantBot || botClient;
      if (clientToUse) {
        await clientToUse.sendMessage(logChannelId, { message, buttons });
      }
    } catch (e) {
      console.error("Failed to log to channel", e);
    }
  }
}

export let lastError: string | null = null;
export let floodWaitSeconds: number | null = null;

export async function startBot(
  sessionString: string,
  apiId: number,
  apiHash: string,
  botToken?: string,
  logChannel?: string
) {
  if (isRunning) return;
  lastError = null;
  floodWaitSeconds = null;

  try {
    await connectDB();
    await loadSudo(); // Load sudo on init when DB is connected
    const stringSession = new StringSession(sessionString);
    botClient = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await botClient.connect();
    
    try {
      await botClient.getMe();
    } catch (e: any) {
      if (e.errorMessage === "AUTH_KEY_UNREGISTERED" || e.errorMessage === "SESSION_REVOKED") {
        throw new Error("Invalid or expired Session String.");
      }
      throw e;
    }
    
    isRunning = true;

    if (logChannel) {
      logChannelId = logChannel.startsWith("-100") ? logChannel : `-100${logChannel}`;
    }

    if (botToken) {
      console.log("Starting assistant bot...");
      let assistantSessionStr = "";
      try {
        const assistantSessionDoc = await Session.findOne({ name: 'assistant' });
        if (assistantSessionDoc && assistantSessionDoc.sessionString) {
          assistantSessionStr = assistantSessionDoc.sessionString;
        }
      } catch(e) {}
      
      assistantBot = new TelegramClient(new StringSession(assistantSessionStr), apiId, apiHash, {
        connectionRetries: 5,
      });
      try {
        await assistantBot.connect();
        const isAssistantAuthed = await assistantBot.checkAuthorization();
        if (!isAssistantAuthed) {
          await assistantBot.start({
            botAuthToken: botToken,
          });
        }
        
        // Verify the session actually works
        try {
            await assistantBot.getMe();
        } catch (e: any) {
            if (e.errorMessage === "SESSION_REVOKED" || e.errorMessage === "AUTH_KEY_UNREGISTERED") {
                console.log("Assistant session revoked, re-authenticating...");
                try {
                    await Session.deleteOne({ name: 'assistant' });
                } catch(err) {}
                
                try { await assistantBot.disconnect(); await assistantBot.destroy(); } catch (e) {}
                
                assistantBot = new TelegramClient(new StringSession(""), apiId, apiHash, {
                  connectionRetries: 5,
                });
                await assistantBot.connect();
                await assistantBot.start({ botAuthToken: botToken });
                await assistantBot.getMe();
            } else {
                throw e;
            }
        }
        
        console.log("Assistant bot connected.");
        
        try {
          await Session.findOneAndUpdate(
              { name: 'assistant' },
              { sessionString: assistantBot.session.save() as unknown as string },
              { upsert: true, new: true }
          );
        } catch(e) {}
        
        import("./inlineMenu.js").then(m => m.registerInlineMenus(assistantBot!)).catch(e => console.error(e));
        await logToChannel("✅ **RITS and Assistant Bot started successfully.**");
      } catch (e: any) {
        console.error("Assistant bot failed to start:", e);
        if (e.errorMessage === "FLOOD") {
          lastError = `Assistant Bot FLOOD wait for ${e.seconds} seconds`;
        } else {
          lastError = `Assistant Bot error: ${e.message}`;
        }
        
        if (assistantBot) {
          try { await assistantBot.disconnect(); await assistantBot.destroy(); } catch (err) {}
        }
        
        assistantBot = null;
        if (e.errorMessage === "SESSION_REVOKED" || e.errorMessage === "AUTH_KEY_UNREGISTERED") {
            try {
                await Session.deleteOne({ name: 'assistant' });
            } catch (err) {}
        }
        await logToChannel(`⚠️ **RITS started, but Assistant Bot failed to start:** ${lastError}`);
      }
    } else {
      await logToChannel("✅ **RITS started successfully.** (No assistant bot configured)");
    }

    // Get current user info (the userbot account)
    botUser = await botClient.getMe();
    console.log(`RITS connected as: ${botUser?.firstName || botUser?.username}`);

    // Load Plugins
    await loadPlugins(botClient);
  } catch (err: any) {
    console.error("Error starting bot:", err);
    if (err.errorMessage === "FLOOD") {
      floodWaitSeconds = err.seconds;
      lastError = `FLOOD wait for ${err.seconds} seconds`;
    } else {
      lastError = err.message || "Failed to start bot";
    }
    
    // Clean up instances on failure
    if (botClient) {
      try { await botClient.disconnect(); await botClient.destroy(); } catch (e) {}
      botClient = null;
    }
    if (assistantBot) {
      try { await assistantBot.disconnect(); await assistantBot.destroy(); } catch (e) {}
      assistantBot = null;
    }
    isRunning = false;
    
    throw err; // Re-throw so server.ts knows it failed
  }
}

export function getBotStatus() {
  return {
    isRunning,
    user: botUser ? { id: botUser.id.toString(), name: botUser.firstName } : null,
    lastError,
    floodWaitSeconds
  };
}

// Ensure the bot only responds to messages sent by the userbot account itself
export function isOutgoing(event: any) {
  return event.message.out;
}

export function isSudo(event: any) {
  if (event.message && event.message.senderId) {
    return sudoUsers.has(event.message.senderId.toString());
  }
  return false;
}
