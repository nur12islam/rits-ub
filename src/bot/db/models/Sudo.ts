import mongoose, { Document, Schema } from 'mongoose';

export interface ISudo extends Document {
  users: string[];
}

const SudoSchema: Schema = new Schema({
  users: { type: [String], default: [] }
});

export const Sudo = mongoose.model<ISudo>('Sudo', SudoSchema);
