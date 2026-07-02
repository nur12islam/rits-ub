import { TelegramClient, Api } from "telegram";
import { SendMessageParams } from "telegram/client/messages.js";
import { logToChannel } from "../index.js";

export async function sendMessage(
  client: TelegramClient,
  chatId: string | number | Api.TypeEntityLike,
  text: string,
  options?: SendMessageParams & { delIn?: number; log?: boolean | string }
) {
  const msg = await client.sendMessage(chatId, { message: text, ...options });
  
  if (options?.log) {
      await logToChannel(`**[LOG]**\n${text}`);
  }
  
  if (options?.delIn && options.delIn > 0) {
      setTimeout(async () => {
          try {
              await client.deleteMessages(chatId, [msg.id], { revoke: true });
          } catch (e) {}
      }, options.delIn * 1000);
  }
  
  return msg;
}

export async function editMessageText(
  client: TelegramClient,
  chatId: string | number | Api.TypeEntityLike,
  messageId: number,
  text: string,
  options?: { delIn?: number; log?: boolean | string }
) {
  const msg = await client.editMessage(chatId, { message: messageId, text });
  
  if (options?.log) {
      await logToChannel(`**[LOG Edit]**\n${text}`);
  }
  
  if (options?.delIn && options.delIn > 0) {
      setTimeout(async () => {
          try {
              await client.deleteMessages(chatId, [messageId], { revoke: true });
          } catch (e) {}
      }, options.delIn * 1000);
  }
  
  return msg;
}

export async function sendAsFile(
  client: TelegramClient,
  chatId: string | number | Api.TypeEntityLike,
  text: string,
  options?: { filename?: string; caption?: string; log?: boolean | string; replyTo?: number }
) {
  const filename = options?.filename || "output.txt";
  const buffer = Buffer.from(text, "utf-8");
  (buffer as any).name = filename; // Hack for gramjs to recognize filename
  
  const msg = await client.sendMessage(chatId, {
      file: buffer,
      message: options?.caption?.slice(0, 1024),
      replyTo: options?.replyTo,
  });
  
  if (options?.log) {
      await logToChannel(`**[LOG File]** ${filename}`);
  }
  
  return msg;
}
