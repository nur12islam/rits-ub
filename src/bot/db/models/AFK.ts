import mongoose, { Document, Schema } from 'mongoose';

export interface IUserCounts {
    pcount: number;
    gcount: number;
    mention: string;
}

export interface IAFK extends Document {
    isAfk: boolean;
    reason: string;
    time: number;
    users: Record<string, IUserCounts>;
}

const AFKSchema: Schema = new Schema({
    isAfk: { type: Boolean, default: false },
    reason: { type: String, default: "" },
    time: { type: Number, default: 0 },
    users: { type: Map, of: Object, default: {} }
});

export const AFK = mongoose.model<IAFK>('AFK', AFKSchema);
