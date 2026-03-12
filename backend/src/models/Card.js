import mongoose from 'mongoose'

const cardSchema = new mongoose.Schema({
    card_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['fuel', 'service'],
        required: true,
        default: 'fuel'
    },
    balance: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    limit: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    assigned_to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null
    },
    assigned_car: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car',
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'blocked', 'expired'],
        default: 'active'
    },
    expiry_date: {
        type: Date,
        default: null
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

cardSchema.index({status: 1})
cardSchema.index({assigned_to: 1})
cardSchema.index({card_number: 1})
cardSchema.index({created_at: -1})

cardSchema.pre('save', function (next) {
    this.updated_at = Date.now()
    next()
})

export default mongoose.model('Card', cardSchema)
