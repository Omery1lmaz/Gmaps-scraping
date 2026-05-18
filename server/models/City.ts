import mongoose, { Schema, Document } from 'mongoose';

export interface ICity extends Document {
  name: string;
}

const CitySchema: Schema = new Schema({
  name: { type: String, required: true, unique: true }
});

export default mongoose.model<ICity>('City', CitySchema);
