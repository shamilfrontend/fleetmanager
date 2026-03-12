import type { Request, Response } from 'express'
import type { FilterQuery } from 'mongoose'
import Transaction from '../models/Transaction.js'
import { getPaginationParams, paginatedResponse } from '../utils/pagination.js'

export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, employeeId, carId, cardId, status } = req.query as {
      dateFrom?: string
      dateTo?: string
      employeeId?: string
      carId?: string
      cardId?: string
      status?: string
    }
    const filter: FilterQuery<import('../models/Transaction.js').ITransaction> = {}

    if (dateFrom || dateTo) {
      filter.date = {}
      if (dateFrom) (filter.date as Record<string, Date>).$gte = new Date(dateFrom)
      if (dateTo) (filter.date as Record<string, Date>).$lte = new Date(dateTo)
    }

    if (employeeId) filter.employee_id = employeeId
    if (carId) filter.car_id = carId
    if (cardId) filter.card_id = cardId
    if (status) filter.status = status

    if (req.user?.role === 'driver' && req.user.employee_id) {
      filter.employee_id = req.user.employee_id.toString()
    }

    const { page, limit, skip } = getPaginationParams(req.query as { page?: string; limit?: string })
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('card_id', 'card_number')
        .populate('employee_id', 'full_name')
        .populate('car_id', 'brand model plate_number')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter)
    ])

    res.json(paginatedResponse(transactions, total, page, limit))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('card_id', 'card_number')
      .populate('employee_id', 'full_name')
      .populate('car_id', 'brand model plate_number')
    if (!transaction) {
      res.status(404).json({ message: 'Транзакция не найдена' })
      return
    }

    const empId =
      (transaction.employee_id as { _id?: { toString(): string }; toString?(): string })?._id
        ?.toString?.() ??
      (transaction.employee_id as { toString(): string })?.toString?.()
    if (
      req.user?.role === 'driver' &&
      req.user.employee_id &&
      empId !== req.user.employee_id.toString()
    ) {
      res.status(404).json({ message: 'Транзакция не найдена' })
      return
    }
    res.json(transaction)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = new Transaction(req.body)
    await transaction.save()
    await transaction.populate([
      { path: 'card_id', select: 'card_number' },
      { path: 'employee_id', select: 'full_name' },
      { path: 'car_id', select: 'brand model plate_number' }
    ])
    res.status(201).json(transaction)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    if (!transaction) {
      res.status(404).json({ message: 'Транзакция не найдена' })
      return
    }
    await transaction.populate([
      { path: 'card_id', select: 'card_number' },
      { path: 'employee_id', select: 'full_name' },
      { path: 'car_id', select: 'brand model plate_number' }
    ])
    res.json(transaction)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id)
    if (!transaction) {
      res.status(404).json({ message: 'Транзакция не найдена' })
      return
    }
    res.json({ message: 'Транзакция удалена' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}
