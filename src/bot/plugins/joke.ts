import { NewMessageEvent } from "telegram/events/index.js";

export const jokePlugin = {
    name: "Joke",
    description: "Get a random programming joke.",
    command: "joke",
    usage: ".joke",
    category: "Fun",
    handler: async (event: NewMessageEvent) => {
        await event.message.edit({ text: "Thinking of a joke..." });

        try {
            const response = await fetch("https://v2.jokeapi.dev/joke/Programming,Miscellaneous,Pun,Spooky,Christmas?blacklistFlags=nsfw,religious,political,racist,sexist,explicit");
            if (!response.ok) {
                await event.message.edit({ text: `Error fetching joke: HTTP ${response.status}` });
                return;
            }

            const data = await response.json();
            
            if (data.error) {
                await event.message.edit({ text: "Could not fetch a joke." });
                return;
            }

            let replyText = "";
            if (data.type === "single") {
                replyText = data.joke;
            } else {
                replyText = `${data.setup}\n\n||${data.delivery}||`; // Spoilers for delivery
            }

            await event.message.edit({ text: replyText });
        } catch (e: any) {
            await event.message.edit({ text: `Error: ${e.message}` });
        }
    }
};

export default [jokePlugin];
