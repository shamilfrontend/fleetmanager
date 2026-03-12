import mongoose from 'mongoose'

const employeeSchema = new mongoose.Schema({
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    position: {
        type: String,
        required: true,
        trim: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    card_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Card',
        default: null
    },
    assigned_cars: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Car'
    }],
    hire_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    created_by: {
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

employeeSchema.index({status: 1})
employeeSchema.index({created_at: -1})

employeeSchema.pre('save', function (next) {
    this.updated_at = Date.now()
    next()
})

export default mongoose.model('Employee', employeeSchema)
