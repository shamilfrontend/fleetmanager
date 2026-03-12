import mongoose from 'mongoose'

const equipmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    serial_number: {
        type: String,
        required: true
    },
    installed_date: {
        type: Date,
        default: Date.now
    }
})

const carSchema = new mongoose.Schema({
    brand: {
        type: String,
        required: true,
        trim: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    plate_number: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    vin: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    year: {
        type: Number,
        required: true,
        min: 1900,
        max: new Date().getFullYear() + 1
    },
    equipment: [equipmentSchema],
    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'repair', 'reserve'],
        default: 'active'
    },
    mileage: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    last_service: {
        type: Date,
        default: null
    },
    photos: {
        type: [String], // Пути к файлам фотографий
        default: []
    },
    documents: {
        type: [String], // Пути к файлам документов (PDF)
        default: []
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
})

carSchema.index({status: 1})
carSchema.index({assigned_to: 1})
carSchema.index({plate_number: 1})
carSchema.index({created_at: -1})

carSchema.pre('save', function (next) {
    this.updated_at = Date.now()
    next()
})

export default mongoose.model('Car', carSchema)
