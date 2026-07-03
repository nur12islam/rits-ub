import mongoose, { Document, Schema } from 'mongoose';

export interface IFilter extends Document {
    chatId: string;
    filters: Record<string, string>;
}

const FilterSchema: Schema = new Schema({
    chatId: { type: String, required: true, unique: true },
    filters: { type: Map, of: String, default: {} }
});

export const Filter = mongoose.model<IFilter>('Filter', FilterSchema);
