import type { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

import { getPaginationParams, paginatedResponse } from '../utils/pagination.js'
import Car from '../models/Car.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function isMongoDuplicateError(
  error: unknown
): error is { code: number; keyPattern?: { plate_number?: number; vin?: number } } {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000
}

export const getAllCars = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {}
    if (req.query.status) filter.status = req.query.status

    if (req.user?.role === 'driver') {
      const employeeId = req.user.employee_id
      if (!employeeId) {
        res.json(paginatedResponse([], 0, 1, 1))
        return
      }
      filter.assigned_to = employeeId
    }
    const { page, limit, skip } = getPaginationParams(req.query as { page?: string; limit?: string })
    const [cars, total] = await Promise.all([
      Car.find(filter)
        .populate('assigned_to', 'full_name')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit),
      Car.countDocuments(filter)
    ])
    res.json(paginatedResponse(cars, total, page, limit))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const getCarById = async (req: Request, res: Response): Promise<void> => {
  try {
    const car = await Car.findById(req.params.id).populate('assigned_to', 'full_name')
    if (!car) {
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }

    if (
      req.user?.role === 'driver' &&
      req.user.employee_id &&
      car.assigned_to?.toString() !== req.user.employee_id.toString()
    ) {
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }
    res.json(car)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const createCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const car = new Car(req.body)
    await car.save()
    res.status(201).json(car)
  } catch (error) {
    if (isMongoDuplicateError(error)) {
      const keyPattern = error.keyPattern
      const field = keyPattern?.plate_number
        ? 'гос. номер'
        : keyPattern?.vin
          ? 'VIN'
          : 'поле'
      res.status(400).json({
        message: `Автомобиль с таким ${field} уже существует`
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const updateCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const car = await Car.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    if (!car) {
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }
    res.json(car)
  } catch (error) {
    if (isMongoDuplicateError(error)) {
      const keyPattern = error.keyPattern
      const field = keyPattern?.plate_number
        ? 'гос. номер'
        : keyPattern?.vin
          ? 'VIN'
          : 'поле'
      res.status(400).json({
        message: `Автомобиль с таким ${field} уже существует`
      })
      return
    }
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const deleteCar = async (req: Request, res: Response): Promise<void> => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id)
    if (!car) {
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }

    const uploadsBase = path.join(__dirname, '..', 'uploads')
    if (car.photos?.length) {
      for (const photo of car.photos) {
        const photoPath = path.join(uploadsBase, 'photos', path.basename(photo))
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath)
      }
    }
    if (car.documents?.length) {
      for (const doc of car.documents) {
        const docPath = path.join(uploadsBase, 'documents', path.basename(doc))
        if (fs.existsSync(docPath)) fs.unlinkSync(docPath)
      }
    }

    res.json({ message: 'Автомобиль удален' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const uploadCarPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Файл не загружен' })
      return
    }

    const car = await Car.findById(req.params.id)
    if (!car) {
      const uploadsBase = path.join(__dirname, '..', 'uploads')
      const filePath = path.join(uploadsBase, 'photos', req.file.filename)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }

    const photoPath = `/uploads/photos/${req.file.filename}`
    car.photos.push(photoPath)
    await car.save()

    res.json({
      message: 'Фотография загружена',
      photo: photoPath,
      car
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const deleteCarPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { photoPath } = req.body as { photoPath?: string }
    const car = await Car.findById(req.params.id)

    if (!car) {
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }

    car.photos = car.photos.filter((p) => p !== photoPath)
    await car.save()

    if (photoPath) {
      const uploadsBase = path.join(__dirname, '..', 'uploads')
      const filePath = path.join(uploadsBase, 'photos', path.basename(photoPath))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    res.json({ message: 'Фотография удалена', car })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const uploadCarDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Файл не загружен' })
      return
    }

    const car = await Car.findById(req.params.id)
    if (!car) {
      const uploadsBase = path.join(__dirname, '..', 'uploads')
      const filePath = path.join(uploadsBase, 'documents', req.file.filename)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }

    const docPath = `/uploads/documents/${req.file.filename}`
    car.documents.push(docPath)
    await car.save()

    res.json({
      message: 'Документ загружен',
      document: docPath,
      car
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const deleteCarDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentPath } = req.body as { documentPath?: string }
    const car = await Car.findById(req.params.id)

    if (!car) {
      res.status(404).json({ message: 'Автомобиль не найден' })
      return
    }

    car.documents = car.documents.filter((d) => d !== documentPath)
    await car.save()

    if (documentPath) {
      const uploadsBase = path.join(__dirname, '..', 'uploads')
      const filePath = path.join(uploadsBase, 'documents', path.basename(documentPath))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    res.json({ message: 'Документ удален', car })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}
