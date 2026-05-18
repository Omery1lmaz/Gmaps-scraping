import mongoose, { Schema, Document } from 'mongoose';

export interface INeighborhood extends Document {
  name: string;
  districtId: mongoose.Types.ObjectId;
}

const NeighborhoodSchema: Schema = new Schema({
  name: { type: String, required: true },
  districtId: { type: Schema.Types.ObjectId, ref: 'District', required: true }
});

export default mongoose.model<INeighborhood>('Neighborhood', NeighborhoodSchema);
