import mongoose, { Document, Schema } from 'mongoose';

export interface ISession extends Document {
  name: string;
  sessionString: string;
}

const SessionSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  sessionString: { type: String, default: "" }
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);
