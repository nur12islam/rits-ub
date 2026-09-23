import { NewMessageEvent } from "telegram/events/index.js";

const TRUECALLER_BOT = "@TruecallerR0Bot";

function normalizeIndianNumber(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return `+${digits}`;
  }

  return null;
}

export default {
  name: "Caller ID",
  description: "Look up an Indian mobile number through @TruecallerR0Bot.",
  command: "ci",
  usage: "Use .ci <10-digit Indian mobile number>.",
  category: "Information",
  handler: async (event: NewMessageEvent) => {
    const raw = (event.message.text || "").replace(/^\.ci\s*/i, "").trim();
    const number = normalizeIndianNumber(raw);

    if (!number) {
      await event.message.edit({
        text: "❌ `Usage: .ci <10-digit Indian mobile number>`"
      });
      return;
    }

    const client = event.client;
    if (!client) {
      await event.message.edit({
        text: "❌ `Telegram client is not available.`"
      });
      return;
    }

    await event.message.edit({
      text: `📞 ` + `Looking up ${number}...`
    });

    try {
      // TrueCallerBot's public instructions say to send numbers in international format.
      // We send only the normalized number, not the .ci command itself.
      const request = await client.sendMessage(TRUECALLER_BOT, {
        message: number
      });

      let response: any = null;

      // Give the bot up to 20 seconds to answer.
      for (let attempt = 0; attempt < 20; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const history = await client.getMessages(TRUECALLER_BOT, { limit: 10 });

        response = history.find((msg: any) => {
          const id = Number(msg.id);
          const text = String(msg.message || "").trim();

          return (
            id > Number(request.id) &&
            text &&
            !text.startsWith("/start") &&
            text !== number &&
            !text.startsWith("⏳")
          );
        });

        if (response) break;
      }

      if (!response) {
        await event.message.edit({
          text: "⚠️ `No response from @TruecallerR0Bot within 20 seconds.`"
        });
        return;
      }

      const resultText = String(response.message || "").trim();

      if (!resultText) {
        await event.message.edit({
          text: "⚠️ `@TruecallerR0Bot returned an empty response.`"
        });
        return;
      }

      // Relay the upstream result back into the chat where .ci was used.
      await event.message.edit({ text: resultText });
    } catch (error: any) {
      console.error("Caller ID lookup failed:", error);
      await event.message.edit({
        text: `❌ ` + `Lookup failed: ${String(error?.message || error)}`
      });
    }
  }
};
