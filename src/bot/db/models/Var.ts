import mongoose, { Document, Schema } from 'mongoose';

export interface IVar extends Document {
    key: string;
    value: string;
}

const VarSchema: Schema = new Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});

export const Var = mongoose.model<IVar>('Var', VarSchema);
