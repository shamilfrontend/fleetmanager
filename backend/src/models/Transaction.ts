import mongoose from 'mongoose'

export interface ITransaction {
  _id: mongoose.Types.ObjectId
  card_id: mongoose.Types.ObjectId
  employee_id: mongoose.Types.ObjectId
  car_id: mongoose.Types.ObjectId
  amount: number
  fuel_type: string
  volume: number
  location: string
  odometer: number
  date: Date
  status: 'completed' | 'pending' | 'cancelled'
  created_at: Date
  updated_at: Date
}

const transactionSchema = new mongoose.Schema<ITransaction>(
  {
    card_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
    employee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    car_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    amount: { type: Number, required: true, min: 0 },
    fuel_type: { type: String, required: true, trim: true },
    volume: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true },
    odometer: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ['completed', 'pending', 'cancelled'], default: 'completed' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  },
  { _id: true }
)

transactionSchema.index({ date: -1 })
transactionSchema.index({ card_id: 1, date: -1 })
transactionSchema.index({ employee_id: 1, date: -1 })
transactionSchema.index({ car_id: 1, date: -1 })
transactionSchema.index({ status: 1 })

transactionSchema.pre('save', function (next) {
  this.updated_at = new Date()
  next()
})

export default mongoose.model<ITransaction>('Transaction', transactionSchema)
