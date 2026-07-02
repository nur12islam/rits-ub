import { TelegramClient } from "telegram";
import { logToChannel } from "../../index.js";

export class Utils {
    static restart(hard: boolean = false) {
        console.log(`Restarting RITS [${hard ? 'HARD' : 'SOFT'}]`);
        // In a containerized or managed environment, exiting will restart the process.
        process.exit(1); 
    }

    static getLogger(name: string) {
        return {
            info: (msg: string) => console.log(`[INFO] [${name}] ${msg}`),
            error: (msg: string | Error) => console.error(`[ERROR] [${name}] ${msg}`),
            debug: (msg: string) => console.debug(`[DEBUG] [${name}] ${msg}`),
            warn: (msg: string) => console.warn(`[WARN] [${name}] ${msg}`)
        };
    }

    static getCLogger(name: string) {
        return {
            log: async (msg: string, level: string = "INFO") => {
                await logToChannel(`**[${level}]** \`${name}\`\n${msg}`);
            }
        };
    }

    static async terminate(client: TelegramClient) {
        console.log("Terminating RITS...");
        await client.disconnect();
    }
}
