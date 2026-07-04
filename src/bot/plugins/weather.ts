import { NewMessageEvent } from "telegram/events/index.js";

export const weatherPlugin = {
    name: "Weather",
    description: "Get current weather for a location.",
    command: "weather",
    usage: ".weather [location]",
    category: "Utility",
    handler: async (event: NewMessageEvent) => {
        const text = event.message.text || "";
        const location = text.split(" ").slice(1).join(" ").trim();

        if (!location) {
            await event.message.edit({ text: "Please provide a location. Usage: `.weather [location]`" });
            return;
        }

        await event.message.edit({ text: `Fetching weather for \`${location}\`...` });

        try {
            // Using wttr.in format 3 which is a short summary format
            const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=3`);
            if (!response.ok) {
                await event.message.edit({ text: `Error fetching weather: HTTP ${response.status}` });
                return;
            }

            const data = await response.text();
            
            if (data.includes("Unknown location")) {
                await event.message.edit({ text: `Location \`${location}\` not found.` });
                return;
            }

            await event.message.edit({ text: `**Weather:**\n\`${data.trim()}\`` });
        } catch (e: any) {
            await event.message.edit({ text: `Error: ${e.message}` });
        }
    }
};

export default [weatherPlugin];
