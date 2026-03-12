import MaintenanceHistory from '../models/MaintenanceHistory.js'
import Car from '../models/Car.js'

export const getMaintenanceHistory = async (req, res) => {
    try {
        const {carId} = req.query

        const query = {}
        if (carId) {
            query.car_id = carId
        }

        const history = await MaintenanceHistory.find(query)
            .populate('car_id', 'brand model plate_number')
            .populate('performed_by', 'email')
            .sort({service_date: -1})

        res.json(history)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getMaintenanceById = async (req, res) => {
    try {
        const maintenance = await MaintenanceHistory.findById(req.params.id)
            .populate('car_id', 'brand model plate_number')
            .populate('performed_by', 'email')

        if (!maintenance) {
            return res.status(404).json({message: 'Запись ТО не найдена'})
        }

        res.json(maintenance)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const createMaintenance = async (req, res) => {
    try {
        const maintenance = new MaintenanceHistory({
            ...req.body,
            performed_by: req.user._id
        })
        await maintenance.save()

        // Обновляем last_service в модели Car
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
        res.status(400).json({message: error.message})
    }
}

export const updateMaintenance = async (req, res) => {
    try {
        const maintenance = await MaintenanceHistory.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new: true, runValidators: true}
        )
            .populate('car_id', 'brand model plate_number')
            .populate('performed_by', 'email')

        if (!maintenance) {
            return res.status(404).json({message: 'Запись ТО не найдена'})
        }

        // Обновляем last_service в модели Car, если это последняя запись
        if (maintenance.car_id) {
            const latestMaintenance = await MaintenanceHistory.findOne({car_id: maintenance.car_id})
                .sort({service_date: -1})

            if (latestMaintenance && latestMaintenance._id.toString() === maintenance._id.toString()) {
                await Car.findByIdAndUpdate(maintenance.car_id, {
                    last_service: maintenance.service_date,
                    mileage: maintenance.mileage
                })
            }
        }

        res.json(maintenance)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
}

export const deleteMaintenance = async (req, res) => {
    try {
        const maintenance = await MaintenanceHistory.findByIdAndDelete(req.params.id)
        if (!maintenance) {
            return res.status(404).json({message: 'Запись ТО не найдена'})
        }

        res.json({message: 'Запись ТО удалена'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getUpcomingMaintenance = async (req, res) => {
    try {
        const {days = 30} = req.query // По умолчанию показываем ТО на ближайшие 30 дней
        const daysNumber = parseInt(days, 10)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const futureDate = new Date(today)
        futureDate.setDate(futureDate.getDate() + daysNumber)

        // Находим все записи ТО с предстоящей датой обслуживания
        const upcomingByDate = await MaintenanceHistory.find({
            next_service_date: {
                $gte: today,
                $lte: futureDate,
                $ne: null
            }
        })
            .populate('car_id', 'brand model plate_number mileage status')
            .sort({next_service_date: 1})

        // Находим автомобили, у которых предстоящее ТО по пробегу
        const allCars = await Car.find({status: 'active'})
        const upcomingByMileage = []

        for (const car of allCars) {
            const latestMaintenance = await MaintenanceHistory.findOne({car_id: car._id})
                .sort({service_date: -1})

            if (latestMaintenance && latestMaintenance.next_service_mileage) {
                const remainingMileage = latestMaintenance.next_service_mileage - car.mileage
                // Если осталось менее 1000 км до ТО
                if (remainingMileage > 0 && remainingMileage <= 1000) {
                    upcomingByMileage.push({
                        car: car,
                        maintenance: latestMaintenance,
                        remainingMileage,
                        type: 'mileage'
                    })
                }
            }
        }

        // Объединяем результаты
        const upcoming = upcomingByDate.map(m => ({
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
        res.status(500).json({message: error.message})
    }
}
