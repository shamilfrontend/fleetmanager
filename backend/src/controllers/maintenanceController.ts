import type { Request, Response } from 'express'
import MaintenanceHistory from '../models/MaintenanceHistory.js'
import Car from '../models/Car.js'

export const getMaintenanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { carId } = req.query as { carId?: string }

    const query: Record<string, unknown> = {}
    if (carId) query.car_id = carId

    const history = await MaintenanceHistory.find(query)
      .populate('car_id', 'brand model plate_number')
      .populate('performed_by', 'email')
      .sort({ service_date: -1 })

    res.json(history)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const getMaintenanceById = async (req: Request, res: Response): Promise<void> => {
  try {
    const maintenance = await MaintenanceHistory.findById(req.params.id)
      .populate('car_id', 'brand model plate_number')
      .populate('performed_by', 'email')

    if (!maintenance) {
      res.status(404).json({ message: 'Запись ТО не найдена' })
      return
    }

    res.json(maintenance)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const createMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({ message: 'Не авторизован' })
      return
    }
    const maintenance = new MaintenanceHistory({
      ...req.body,
      performed_by: req.user._id
    })
    await maintenance.save()

    if (maintenance.car_id) {
      await Car.findByIdAndUpdate(maintenance.car_id, {
        last_service: maintenance.service_date,
        mileage: maintenance.mileage
      })
    }

    const populated = await MaintenanceHistory.findById(maintenance._id)
      .populate('car_id', 'brand model plate_number')
      .populate('performed_by', 'email')

    res.status(201).json(populated)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const updateMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const maintenance = await MaintenanceHistory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('car_id', 'brand model plate_number')
      .populate('performed_by', 'email')

    if (!maintenance) {
      res.status(404).json({ message: 'Запись ТО не найдена' })
      return
    }

    if (maintenance.car_id) {
      const latestMaintenance = await MaintenanceHistory.findOne({
        car_id: maintenance.car_id
      }).sort({ service_date: -1 })

      if (
        latestMaintenance &&
        latestMaintenance._id.toString() === maintenance._id.toString()
      ) {
        await Car.findByIdAndUpdate(maintenance.car_id, {
          last_service: maintenance.service_date,
          mileage: maintenance.mileage
        })
      }
    }

    res.json(maintenance)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка валидации'
    res.status(400).json({ message })
  }
}

export const deleteMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const maintenance = await MaintenanceHistory.findByIdAndDelete(req.params.id)
    if (!maintenance) {
      res.status(404).json({ message: 'Запись ТО не найдена' })
      return
    }

    res.json({ message: 'Запись ТО удалена' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}

export const getUpcomingMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { days = '30' } = req.query as { days?: string }
    const daysNumber = parseInt(days, 10)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + daysNumber)

    const upcomingByDate = await MaintenanceHistory.find({
      next_service_date: {
        $gte: today,
        $lte: futureDate,
        $ne: null
      }
    })
      .populate('car_id', 'brand model plate_number mileage status')
      .sort({ next_service_date: 1 })

    const allCars = await Car.find({ status: 'active' })
    const upcomingByMileage: Array<{
      car: (typeof allCars)[0]
      maintenance: Awaited<ReturnType<typeof MaintenanceHistory.findOne>>
      remainingMileage: number
      type: string
    }> = []

    for (const car of allCars) {
      const latestMaintenance = await MaintenanceHistory.findOne({ car_id: car._id }).sort({
        service_date: -1
      })

      if (latestMaintenance?.next_service_mileage != null) {
        const remainingMileage = latestMaintenance.next_service_mileage - car.mileage
        if (remainingMileage > 0 && remainingMileage <= 1000) {
          upcomingByMileage.push({
            car,
            maintenance: latestMaintenance,
            remainingMileage,
            type: 'mileage'
          })
        }
      }
    }

    const upcoming = upcomingByDate.map((m) => ({
      car: m.car_id,
      maintenance: m,
      nextServiceDate: m.next_service_date,
      type: 'date'
    }))

    res.json({
      upcoming,
      upcomingByMileage
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ошибка сервера'
    res.status(500).json({ message })
  }
}
