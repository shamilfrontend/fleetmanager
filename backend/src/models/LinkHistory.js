import mongoose from 'mongoose'

const linkHistorySchema = new mongoose.Schema({
    link_type: {
        type: String,
        enum: ['employee-card', 'employee-car', 'card-car'],
        required: true
    },
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null
    },
    card_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        default: null
    },
    car_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        default: null
    },
    action: {
        type: String,
        enum: ['assigned', 'unassigned', 'changed'],
        required: true
    },
    previous_value: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    new_value: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    changed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
})

// Индексы для быстрого поиска
linkHistorySchema.index({employee_id: 1, created_at: -1})
linkHistorySchema.index({card_id: 1, created_at: -1})
linkHistorySchema.index({car_id: 1, created_at: -1})
linkHistorySchema.index({link_type: 1, created_at: -1})

export default mongoose.model('LinkHistory', linkHistorySchema)
