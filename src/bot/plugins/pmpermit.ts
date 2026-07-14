import { NewMessageEvent } from "telegram/events/index.js";
import { isOutgoing, logToChannel, botClient, botUser } from "../index.js";
import { Api } from "telegram";
import { Button } from "telegram/tl/custom/button.js";
import { Pmpermit } from "../db/models/Pmpermit.js";

let pmCounter: Record<string, number> = {};

let cachedPmPermit: any = null;

async function loadPmPermit() {
    if (!cachedPmPermit) {
        cachedPmPermit = await Pmpermit.findOne() || await Pmpermit.create({
            approved: [],
            pmguard: false,
            customMsg: "Hello {fname} this is an automated message\nPlease wait until you get approved to direct message \nAnd please dont spam until then ",
            customBlockMsg: "**You were automatically blocked**",
            limit: 4
        });
    }
    return cachedPmPermit;
}

async function savePmPermit() {
    if (cachedPmPermit) {
        await cachedPmPermit.save();
    }
}

async function getId(event: NewMessageEvent): Promise<string | null> {
  if (event.message.replyToMsgId) {
    const reply = await event.message.getReplyMessage();
    if (reply?.senderId) return reply.senderId.toString();
  }
  
  const text = event.message.text || "";
  const parts = text.split(" ");
  if (parts.length > 1) {
      const user = parts[1].replace("@", "");
      try {
          const entity = await event.client?.getEntity(user);
          if (entity && 'id' in entity) {
              return entity.id.toString();
          }
      } catch (e) {
          // Ignore
      }
  }
  
  if (event.message.isPrivate && event.chatId) {
      return event.chatId.toString();
  }
  return null;
}

function formatMsg(msg: string, user: any): string {
    const fname = user.firstName || "";
    const lname = user.lastName || "";
    const flname = `${fname} ${lname}`.trim();
    const uname = user.username || "";
    const mention = `[${fname}](tg://user?id=${user.id})`;
    const chat = fname;

    return msg
        .replace(/{fname}/g, fname)
        .replace(/{first}/g, fname)
        .replace(/{lname}/g, lname)
        .replace(/{flname}/g, flname)
        .replace(/{fullname}/g, flname)
        .replace(/{uname}/g, uname)
        .replace(/{chat}/g, chat)
        .replace(/{mention}/g, mention);
}

export default [
  {
    name: "Allow PM",
    description: "Allows someone to contact.",
    command: "allow",
    usage: "Use .allow to execute this command.", aliases: ["a", "approve"],
    category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const userId = await getId(event);
      if (userId) {
        if (pmCounter[userId]) delete pmCounter[userId];
        const pmPermitData = await loadPmPermit();
        if (!pmPermitData.approved.includes(userId)) {
            pmPermitData.approved.push(userId);
            await savePmPermit();
            try {
                await event.client?.invoke(new Api.contacts.Unblock({ id: userId }));
            } catch(e) {}
            await event.message.edit({ text: "`Approved to direct message`" });
        } else {
            await event.message.edit({ text: "`Already approved to direct message`" });
        }
      } else {
          await event.message.edit({ text: "`I need to reply to a user or provide the username/id or be in a private chat`" });
      }
    }
  },
  {
    name: "Disallow PM",
    description: "Activates guarding on inbox for user.",
    command: "nopm",
    usage: "Use .nopm to execute this command.", aliases: ["da", "disapprove", "deny"],
    category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text || "";
      const pmPermitData = await loadPmPermit();
      if (text.includes("-all")) {
          pmPermitData.approved = [];
          await savePmPermit();
          await event.message.edit({ text: "`Deleted all allowed Pms.`" });
          return;
      }
      const userId = await getId(event);
      if (userId) {
          if (pmPermitData.approved.includes(userId)) {
              pmPermitData.approved = pmPermitData.approved.filter((id: string) => id !== userId);
              await savePmPermit();
              await event.message.edit({ text: "`Prohibitted to direct message`" });
          } else {
              await event.message.edit({ text: "`Nothing was changed`" });
          }
      } else {
          await event.message.edit({ text: "`I need to reply to a user or provide the username/id or be in a private chat`" });
      }
    }
  },
  {
    name: "List Allowed PMs",
    description: "List all Allowed PM's.",
    command: "listpm",
    usage: "Use .listpm to execute this command.", category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const pmPermitData = await loadPmPermit();
      if (pmPermitData.approved.length === 0) {
          await event.message.edit({ text: "`Allowed list is empty`" });
          return;
      }
      let out = "**Allowed Chats are:**\n";
      for (const id of pmPermitData.approved) {
          out += `\n\`${id}\``;
      }
      await event.message.edit({ text: out });
    }
  },
  {
    name: "PM Guard",
    description: "Switchs the pm permiting module on/off.",
    command: "pmguard",
    usage: "Use .pmguard to execute this command.", category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const pmPermitData = await loadPmPermit();
      pmPermitData.pmguard = !pmPermitData.pmguard;
      await savePmPermit();
      if (pmPermitData.pmguard) {
          await event.message.edit({ text: "`PM_guard activated`" });
      } else {
          await event.message.edit({ text: "`PM_guard deactivated`" });
          pmCounter = {};
      }
    }
  },
  {
    name: "Set PM Message",
    description: "Sets the reply message for un-invited PMs.",
    command: "setpmmsg",
    usage: "Use .setpmmsg to execute this command.", category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text || "";
      const pmPermitData = await loadPmPermit();
      if (text.includes("-r")) {
          pmPermitData.customMsg = "Hello {fname} this is an automated message\nPlease wait until you get approved to direct message \nAnd please dont spam until then ";
          await savePmPermit();
          await event.message.edit({ text: "`Custom NOpm message reset`" });
      } else {
          const msg = text.replace(/^\.setpmmsg\s*/, "").trim();
          if (msg) {
              pmPermitData.customMsg = msg;
              await savePmPermit();
              await event.message.edit({ text: "`Custom NOpm message saved`" });
          } else {
              await event.message.edit({ text: "`invalid input!`" });
          }
      }
    }
  },
  {
    name: "Set Block Message",
    description: "Sets the block message for spamming PMs.",
    command: "setbpmmsg",
    usage: "Use .setbpmmsg to execute this command.", category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text || "";
      const pmPermitData = await loadPmPermit();
      if (text.includes("-r")) {
          pmPermitData.customBlockMsg = "**You were automatically blocked**";
          await savePmPermit();
          await event.message.edit({ text: "`Custom BLOCKpm message reset`" });
      } else {
          const msg = text.replace(/^\.setbpmmsg\s*/, "").trim();
          if (msg) {
              pmPermitData.customBlockMsg = msg;
              await savePmPermit();
              await event.message.edit({ text: "`Custom BLOCKpm message saved`" });
          } else {
              await event.message.edit({ text: "`invalid input!`" });
          }
      }
    }
  },
  {
    name: "Set PM Limit",
    description: "Sets the maximum number of warnings before blocking.",
    command: "setpmlimit",
    usage: "Use .setpmlimit to execute this command.", category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const text = event.message.text || "";
      const limitStr = text.replace(/^\.setpmlimit\s*/, "").trim();
      const limit = parseInt(limitStr, 10);
      if (!isNaN(limit) && limit > 0) {
          const pmPermitData = await loadPmPermit();
          pmPermitData.limit = limit;
          await savePmPermit();
          await event.message.edit({ text: `\`PM guard limit set to ${limit}\`` });
      } else {
          await event.message.edit({ text: "`Please provide a valid number > 0!`" });
      }
    }
  },
  {
    name: "View PM Message",
    description: "Displays the reply message for uninvited PMs.",
    command: "vpmmsg",
    usage: "Use .vpmmsg to execute this command.", category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const pmPermitData = await loadPmPermit();
      await event.message.edit({ text: `--current PM message--\n\n${pmPermitData.customMsg}` });
    }
  },
  {
    name: "View Block Message",
    description: "Displays the reply message for blocked PMs.",
    command: "vbpmmsg",
    usage: "Use .vbpmmsg to execute this command.", category: "PMPermit",
    ownerOnly: true,
    handler: async (event: NewMessageEvent) => {
      const pmPermitData = await loadPmPermit();
      await event.message.edit({ text: `--current blockPM message--\n\n${pmPermitData.customBlockMsg}` });
    }
  }
];

export const rawListener = async (event: NewMessageEvent) => {
  if (botUser && event.chatId?.toString() === botUser.id.toString()) return; // Ignore Saved Messages

  const pmPermitData = await loadPmPermit();
  if (isOutgoing(event)) {
      if (event.message.isPrivate) {
          const chatId = event.chatId?.toString();
          if (chatId && pmPermitData.pmguard && !pmPermitData.approved.includes(chatId)) {
               if (pmCounter[chatId]) delete pmCounter[chatId];
               pmPermitData.approved.push(chatId);
               await savePmPermit();
               
               const user = await event.message.getSender() as any;
               let buttons = undefined;
               let mentionText = chatId;
               if (user) {
                   mentionText = user.firstName || user.username || "User";
                   buttons = [[Button.url(mentionText, `tg://openmessage?user_id=${user.id}`)]];
               }
               
               await logToChannel(`**#AUTO_APPROVED**\n${mentionText}`, buttons);
          }
      }
      return;
  }

  // Handle incoming PMs
  if (event.message.isPrivate) {
    if (!pmPermitData.pmguard) return;
    
    const chatId = event.chatId?.toString();
    if (!chatId) return;

    // Check if it's from a bot, or telegram itself
    const sender = await event.message.getSender() as any;
    if (!sender || sender.bot || sender.verified || sender.isSupport || sender.id.toString() === "777000") return;

    if (!pmPermitData.approved.includes(chatId)) {
      if (pmCounter[chatId]) {
          if (pmCounter[chatId] >= pmPermitData.limit) {
              delete pmCounter[chatId];
              
              const blockMsg = formatMsg(pmPermitData.customBlockMsg, sender);
              await event.message.reply({ message: blockMsg });
              
              try {
                  await event.client?.invoke(new Api.contacts.Block({ id: sender.id }));
              } catch(e) {}
              
              await new Promise(r => setTimeout(r, 1000));
              const nameText = sender.firstName || sender.username || "User";
              const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${sender.id}`)]];
              await logToChannel(`#BLOCKED\n${nameText} has been blocked due to spamming in pm !! `, buttons);
          } else {
              pmCounter[chatId] += 1;
              await event.message.reply({
                  message: `You have ${pmCounter[chatId]} out of ${pmPermitData.limit} **Warnings**\nPlease wait until you get approved to pm !`
              });
          }
      } else {
          pmCounter[chatId] = 1;
          const noPmMsg = formatMsg(pmPermitData.customMsg, sender) + '\n`- Protected by RITS`';
          await event.message.reply({ message: noPmMsg });
          
          await new Promise(r => setTimeout(r, 1000));
          const nameText = sender.firstName || sender.username || "User";
          const buttons = [[Button.url(nameText, `tg://openmessage?user_id=${sender.id}`)]];
          await logToChannel(`#NEW_MESSAGE\n${nameText} has messaged you`, buttons);
      }
    }
  }
};

