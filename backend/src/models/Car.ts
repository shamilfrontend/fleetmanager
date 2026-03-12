import mongoose from 'mongoose'

export interface IEquipment {
  name: string
  serial_number: string
  installed_date: Date
}

export interface ICar {
  _id: mongoose.Types.ObjectId
  brand: string
  model: string
  plate_number: string
  vin: string
  year: number
  equipment: IEquipment[]
  assigned_to: mongoose.Types.ObjectId | null
  status: 'active' | 'repair' | 'reserve'
  mileage: number
  last_service: Date | null
  photos: string[]
  documents: string[]
  created_at: Date
  updated_at: Date
}

const equipmentSchema = new mongoose.Schema<IEquipment>(
  {
    name: { type: String, required: true },
    serial_number: { type: String, required: true },
    installed_date: { type: Date, default: Date.now }
  },
  { _id: false }
)

const carSchema = new mongoose.Schema<ICar>(
  {
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    plate_number: { type: String, required: true, unique: true, trim: true, uppercase: true },
    vin: { type: String, required: true, unique: true, trim: true, uppercase: true },
    year: { type: Number, required: true, min: 1900, max: new Date().getFullYear() + 1 },
    equipment: [equipmentSchema],
    assigned_to: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    status: { type: String, enum: ['active', 'repair', 'reserve'], default: 'active' },
    mileage: { type: Number, required: true, min: 0, default: 0 },
    last_service: { type: Date, default: null },
    photos: { type: [String], default: [] },
    documents: { type: [String], default: [] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
  },
  { _id: true }
)

carSchema.index({ status: 1 })
carSchema.index({ assigned_to: 1 })
carSchema.index({ plate_number: 1 })
carSchema.index({ created_at: -1 })

carSchema.pre('save', function (next) {
  this.updated_at = new Date()
  next()
})

export default mongoose.model<ICar>('Car', carSchema)
