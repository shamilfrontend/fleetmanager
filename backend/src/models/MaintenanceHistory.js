import mongoose from 'mongoose'

const maintenanceHistorySchema = new mongoose.Schema({
    car_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        required: true
    },
    service_type: {
        type: String,
        required: true,
        enum: ['regular', 'repair', 'inspection', 'tire_change', 'oil_change', 'other']
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    cost: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    mileage: {
        type: Number,
        required: true,
        min: 0
    },
    service_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    next_service_date: {
        type: Date,
        default: null
    },
    next_service_mileage: {
        type: Number,
        default: null
    },
    service_provider: {
        type: String,
        trim: true,
        default: ''
    },
    documents: [{
        type: String, // Пути к файлам документов
        default: []
    }],
    performed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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

maintenanceHistorySchema.pre('save', function (next) {
    this.updated_at = Date.now()
    next()
})

// Индексы для быстрого поиска
maintenanceHistorySchema.index({car_id: 1, service_date: -1})
maintenanceHistorySchema.index({service_date: -1})

export default mongoose.model('MaintenanceHistory', maintenanceHistorySchema)
