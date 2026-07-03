import mongoose, { Document, Schema } from 'mongoose';

export interface IAlive extends Document {
    mediaBuffer: Buffer;
    mediaType: string;
}

const AliveSchema: Schema = new Schema({
    mediaBuffer: { type: Buffer, required: true },
    mediaType: { type: String, required: true },
});

export const Alive = mongoose.model<IAlive>('Alive', AliveSchema);
