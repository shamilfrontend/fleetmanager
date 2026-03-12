import type { Request, Response } from 'express'
import Employee from '../models/Employee.js'
import { getPaginationParams, paginatedResponse } from '../utils/pagination.js'

export const getAllEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {}
    if (req.query.status) filter.status = req.query.status

    if (req.user?.role === 'driver' && req.user.employee_id) {
      filter._id = req.user.employee_id
    }
    const { page, limit, skip } = getPaginationParams(req.query as { page?: string; limit?: string })
    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('card_id', 'card_number')
        .populate('assigned_cars', 'brand model plate_number')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Employee.countDocuments(filter)
    ])
    res.json(paginatedResponse(employees, total, page, limit))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const getEmployeeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('card_id', 'card_number')
      .populate('assigned_cars', 'brand model plate_number')
    if (!employee) {
      res.status(404).json({ message: 'Сотрудник не найден' })
      return
    }

    if (
      req.user?.role === 'driver' &&
      req.user.employee_id &&
      employee._id.toString() !== req.user.employee_id.toString()
    ) {
      res.status(404).json({ message: 'Сотрудник не найден' })
      return
    }
    res.json(employee)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const createEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Не авторизован' })
      return
    }
    const employee = new Employee({
      ...req.body,
      created_by: req.user._id
    })
    await employee.save()

    if (req.user?._id) {
      try {
        const { trackEmployeeLinks } = await import('../utils/linkHistory.js')
        const populatedEmployee = await Employee.findById(employee._id)
          .populate('card_id')
          .populate('assigned_cars')
          .lean()

        if (populatedEmployee) {
          const emptyEmployee = {
            card_id: null,
            assigned_cars: []
          } as { card_id: null; assigned_cars: unknown[] }
          await trackEmployeeLinks(
            emptyEmployee as import('../models/Employee.js').IEmployee,
            populatedEmployee as import('../models/Employee.js').IEmployee,
            req.user._id
          )
        }
      } catch (historyError) {
        console.error('Ошибка создания истории связей:', historyError)
      }
    }

    res.status(201).json(employee)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const oldEmployee = await Employee.findById(req.params.id)
      .populate('card_id')
      .populate('assigned_cars')
      .lean()

    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('card_id')
      .populate('assigned_cars')
      .lean()

    if (!employee) {
      res.status(404).json({ message: 'Сотрудник не найден' })
      return
    }

    if (oldEmployee && req.user?._id) {
      try {
        const { trackEmployeeLinks } = await import('../utils/linkHistory.js')
        await trackEmployeeLinks(
          oldEmployee as import('../models/Employee.js').IEmployee,
          employee as import('../models/Employee.js').IEmployee,
          req.user._id
        )
      } catch (historyError) {
        console.error('Ошибка создания истории связей:', historyError)
      }
    }

    res.json(employee)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id)
    if (!employee) {
      res.status(404).json({ message: 'Сотрудник не найден' })
      return
    }
    res.json({ message: 'Сотрудник удален' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}
