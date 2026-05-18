import mongoose, { Schema, Document } from 'mongoose';

export interface IDistrict extends Document {
  name: string;
  cityId: mongoose.Types.ObjectId;
}

const DistrictSchema: Schema = new Schema({
  name: { type: String, required: true },
  cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true }
});

export default mongoose.model<IDistrict>('District', DistrictSchema);
