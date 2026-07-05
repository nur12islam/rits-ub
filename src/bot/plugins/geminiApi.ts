import { GoogleGenAI } from "@google/genai";

export class GeminiAPI {
    private _ai: GoogleGenAI | null = null;
    private sessions: Map<string, any>;

    constructor() {
        this.sessions = new Map();
    }

    private get ai(): GoogleGenAI {
        if (!this._ai) {
            this._ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
        }
        return this._ai;
    }

    public async checkSetup(): Promise<boolean> {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is not set. Please configure it in your environment variables.");
        }
        return true;
    }

    public async getOrCreateSession(sessionId: string, name: string = "Telegram Session"): Promise<string> {
        if (!this.sessions.has(sessionId)) {
            const chatSession = this.ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: `You are Gemini, a helpful AI assistant integrated into a Telegram userbot. Current session: ${name}.`
                }
            });
            this.sessions.set(sessionId, chatSession);
        }
        return sessionId;
    }

    public async chat(sessionId: string, message: string, useWeb = false, useResearch = false): Promise<string> {
        const chatSession = this.sessions.get(sessionId);
        
        const config: any = {};
        if (useWeb || useResearch) {
            config.tools = [{ googleSearch: {} }];
        }

        if (chatSession) {
            const response = await chatSession.sendMessage({ message, config });
            return response.text || "No response received.";
        } else {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: message,
                config: config
            });
            return response.text || "No response received.";
        }
    }
}
