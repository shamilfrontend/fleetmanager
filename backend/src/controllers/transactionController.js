import Transaction from '../models/Transaction.js'
import {getPaginationParams, paginatedResponse} from '../utils/pagination.js'

export const getAllTransactions = async (req, res) => {
    try {
        const {dateFrom, dateTo, employeeId, carId, cardId, status} = req.query
        const filter = {}

        if (dateFrom || dateTo) {
            filter.date = {}
            if (dateFrom) filter.date.$gte = new Date(dateFrom)
            if (dateTo) filter.date.$lte = new Date(dateTo)
        }

        if (employeeId) filter.employee_id = employeeId
        if (carId) filter.car_id = carId
        if (cardId) filter.card_id = cardId
        if (status) filter.status = status

        // Водитель видит только свои транзакции
        if (req.user?.role === 'driver' && req.user.employee_id) {
            filter.employee_id = req.user.employee_id.toString()
        }

        const {page, limit, skip} = getPaginationParams(req.query)
        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .populate('card_id', 'card_number')
                .populate('employee_id', 'full_name')
                .populate('car_id', 'brand model plate_number')
                .sort({date: -1})
                .skip(skip)
                .limit(limit),
            Transaction.countDocuments(filter)
        ])

        res.json(paginatedResponse(transactions, total, page, limit))
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getTransactionById = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('card_id', 'card_number')
            .populate('employee_id', 'full_name')
            .populate('car_id', 'brand model plate_number')
        if (!transaction) {
            return res.status(404).json({message: 'Транзакция не найдена'})
        }

        // Водитель не может просматривать чужие транзакции
        if (req.user?.role === 'driver' && req.user.employee_id && transaction.employee_id?.toString() !== req.user.employee_id.toString()) {
            return res.status(404).json({message: 'Транзакция не найдена'})
        }
        res.json(transaction)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const createTransaction = async (req, res) => {
    try {
        const transaction = new Transaction(req.body)
        await transaction.save()
        await transaction.populate([
            {path: 'card_id', select: 'card_number'},
            {path: 'employee_id', select: 'full_name'},
            {path: 'car_id', select: 'brand model plate_number'}
        ])
        res.status(201).json(transaction)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
}

export const updateTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new: true, runValidators: true}
        )
        if (!transaction) {
            return res.status(404).json({message: 'Транзакция не найдена'})
        }
        await transaction.populate([
            {path: 'card_id', select: 'card_number'},
            {path: 'employee_id', select: 'full_name'},
            {path: 'car_id', select: 'brand model plate_number'}
        ])
        res.json(transaction)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
}

export const deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findByIdAndDelete(req.params.id)
        if (!transaction) {
            return res.status(404).json({message: 'Транзакция не найдена'})
        }
        res.json({message: 'Транзакция удалена'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}
