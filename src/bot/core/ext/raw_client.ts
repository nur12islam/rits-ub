import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Api } from "telegram";

class ChatReq {
    private _logs: number[] = [];

    get has(): boolean {
        return this._logs.length !== 0;
    }

    get first(): number {
        return this._logs[0];
    }

    get last(): number | undefined {
        return this._logs[this._logs.length - 1];
    }

    get count(): number {
        return this._logs.length;
    }

    add(log: number): void {
        this._logs.push(log);
    }

    update(t: number): void {
        this._logs = this._logs.filter(i => i > t);
    }
}

export class RawClient extends TelegramClient {
    public static DUAL_MODE = false;
    public static USER_ID = 0;
    public static BOT_ID = 0;
    public static LAST_OUTGOING_TIME = Date.now();
    public static REQ_LOGS: Record<number, ChatReq> = {};

    public _bot?: any;

    constructor(session: string | StringSession, apiId: number, apiHash: string, opts: any, bot?: any) {
        super(session, apiId, apiHash, opts);
        this._bot = bot;
    }

    async invoke<R extends Api.AnyRequest>(request: R): Promise<R["__response"]> {
        // Flood control logic can be added here
        return super.invoke(request);
    }
}
