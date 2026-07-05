import { GoogleGenAI } from "@google/genai";
async function run() {
    try {
        const ai = new GoogleGenAI({ apiKey: " " });
        const chat = ai.chats.create({ model: "gemini-2.5-flash" });
        const response = await chat.sendMessage({ message: "hello", config: {} });
        console.log("Success:", response.text);
    } catch (e: any) {
        console.error("Error:", JSON.stringify(e));
        console.error("Error message:", e.message);
    }
}
run();
