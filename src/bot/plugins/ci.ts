import { NewMessageEvent } from "telegram/events/index.js";

const TRUECALLER_BOT = "@TruecallerR0Bot";
const FALLBACK_TRUECALLER_BOT = "@TrucalllerBot";

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

function isLimitResponse(text: string): boolean {
  const normalized = text.toLowerCase();

  return (
    normalized.includes("daily limit") ||
    normalized.includes("search limit") ||
    normalized.includes("limit reached") ||
    normalized.includes("quota") ||
    normalized.includes("try again tomorrow") ||
    normalized.includes("limit")
  );
}

async function waitForBotResponse(
  client: any,
  botUsername: string,
  requestId: number,
  number: string
): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const history = await client.getMessages(botUsername, { limit: 10 });

    const response = history.find((msg: any) => {
      const id = Number(msg.id);
      const text = String(msg.message || "").trim();

      return (
        id > requestId &&
        text &&
        !text.startsWith("/start") &&
        !text.startsWith("⏳") &&
        text !== number
      );
    });

    if (response) {
      const resultText = String(response.message || "").trim();
      if (resultText) return resultText;
    }
  }

  return null;
}

async function lookupWithBot(
  client: any,
  botUsername: string,
  number: string
): Promise<string | null> {
  const request = await client.sendMessage(botUsername, {
    message: number
  });

  return waitForBotResponse(client, botUsername, Number(request.id), number);
}

export default {
  name: "Caller ID",
  description: "Look up an Indian mobile number through caller-ID bots.",
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
      text: `📞 Looking up ${number}...`
    });

    try {
      // Primary lookup.
      let resultText = await lookupWithBot(
        client,
        TRUECALLER_BOT,
        number
      );

      if (!resultText) {
        await event.message.edit({
          text: "⚠️ `No response from @TruecallerR0Bot within 20 seconds.`"
        });
        return;
      }

      // Primary bot has hit its daily/search limit -> use fallback.
      if (isLimitResponse(resultText)) {
        await event.message.edit({
          text: `⏳ @TruecallerR0Bot limit reached. Trying @TrucalllerBot...`
        });

        const fallbackResult = await lookupWithBot(
          client,
          FALLBACK_TRUECALLER_BOT,
          number
        );

        if (!fallbackResult) {
          await event.message.edit({
            text: "⚠️ `Primary bot limit reached, but @TrucalllerBot did not respond within 20 seconds.`"
          });
          return;
        }

        resultText = fallbackResult;
      }

      await event.message.edit({ text: resultText });
    } catch (error: any) {
      console.error("Caller ID lookup failed:", error);
      await event.message.edit({
        text: `❌ Lookup failed: ${String(error?.message || error)}`
      });
    }
  }
};
