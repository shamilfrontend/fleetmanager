import mongoose from 'mongoose'

export interface ILinkHistory {
  _id: mongoose.Types.ObjectId
  link_type: string
  employee_id: mongoose.Types.ObjectId | null
  card_id: mongoose.Types.ObjectId | null
  car_id: mongoose.Types.ObjectId | null
  action: string
  previous_value: string | null
  new_value: string | null
  changed_by: mongoose.Types.ObjectId
  created_at?: Date
}

const linkHistorySchema = new mongoose.Schema<ILinkHistory>(
  {
    link_type: { type: String, required: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    card_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null },
    car_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', default: null },
    action: { type: String, required: true },
    previous_value: { type: String, default: null },
    new_value: { type: String, default: null },
    changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true, _id: true }
)

export default mongoose.model<ILinkHistory>('LinkHistory', linkHistorySchema)
