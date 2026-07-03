import mongoose, { Document, Schema } from 'mongoose';

export interface IPmpermit extends Document {
  approved: string[];
  pmguard: boolean;
  customMsg: string;
  customBlockMsg: string;
  limit: number;
}

const PmpermitSchema: Schema = new Schema({
  approved: { type: [String], default: [] },
  pmguard: { type: Boolean, default: false },
  customMsg: { type: String, default: "Hello {fname} this is an automated message\nPlease wait until you get approved to direct message \nAnd please dont spam until then " },
  customBlockMsg: { type: String, default: "**You were automatically blocked**" },
  limit: { type: Number, default: 4 }
});

export const Pmpermit = mongoose.model<IPmpermit>('Pmpermit', PmpermitSchema);
