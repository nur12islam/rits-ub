import { NewMessageEvent } from "telegram/events/index.js";

export const dictionaryPlugin = {
    name: "Dictionary",
    description: "Get the definition of an English word.",
    command: "define",
    usage: ".define [word]",
    category: "Utility",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const word = text.split(" ").slice(1).join(" ").trim();

        if (!word) {
            await event.message.edit({ text: "Please provide a word to define. Usage: `.define [word]`" });
            return;
        }

        await event.message.edit({ text: `Looking up definition for \`${word}\`...` });

        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!response.ok) {
                if (response.status === 404) {
                    await event.message.edit({ text: `Could not find a definition for \`${word}\`.` });
                } else {
                    await event.message.edit({ text: `Error fetching definition: HTTP ${response.status}` });
                }
                return;
            }

            const data = await response.json();
            const entry = data[0];
            
            let replyText = `**Word:** ${entry.word}\n`;
            if (entry.phonetic) {
                replyText += `**Phonetic:** ${entry.phonetic}\n\n`;
            } else {
                replyText += `\n`;
            }

            const meanings = entry.meanings.slice(0, 3); // limit to 3 meanings
            for (const meaning of meanings) {
                replyText += `*Part of Speech:* **${meaning.partOfSpeech}**\n`;
                const definitions = meaning.definitions.slice(0, 2); // limit to 2 definitions per PoS
                for (let i = 0; i < definitions.length; i++) {
                    replyText += `  ${i + 1}. ${definitions[i].definition}\n`;
                    if (definitions[i].example) {
                        replyText += `     _Example: "${definitions[i].example}"_\n`;
                    }
                }
                replyText += `\n`;
            }

            await event.message.edit({ text: replyText });
        } catch (e: any) {
            await event.message.edit({ text: `Error: ${e.message}` });
        }
    }
};

export default [dictionaryPlugin];
