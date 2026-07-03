import mongoose, { Document, Schema } from 'mongoose';

export interface INote extends Document {
    name: string;
    content: string;
}

const NoteSchema: Schema = new Schema({
    name: { type: String, required: true, unique: true },
    content: { type: String, required: true },
});

export const Note = mongoose.model<INote>('Note', NoteSchema);
