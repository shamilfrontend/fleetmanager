import path from 'path'
import fs from 'fs'
import {fileURLToPath} from 'url'
import {dirname} from 'path'

import {getPaginationParams, paginatedResponse} from '../utils/pagination.js'
import Car from '../models/Car.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const getAllCars = async (req, res) => {
    try {
        const filter = {}
        if (req.query.status) filter.status = req.query.status

        // Водитель видит только свои автомобили
        if (req.user?.role === 'driver') {
            const employeeId = req.user.employee_id
            if (!employeeId) {
                return res.json(paginatedResponse([], 0, 1, 1))
            }
            filter.assigned_to = employeeId
        }
        const {page, limit, skip} = getPaginationParams(req.query)
        const [cars, total] = await Promise.all([
            Car.find(filter)
                .populate('assigned_to', 'full_name')
                .sort({created_at: -1})
                .skip(skip)
                .limit(limit),
            Car.countDocuments(filter)
        ])
        res.json(paginatedResponse(cars, total, page, limit))
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getCarById = async (req, res) => {
    try {
        const car = await Car.findById(req.params.id).populate('assigned_to', 'full_name')
        if (!car) {
            return res.status(404).json({message: 'Автомобиль не найден'})
        }

        // Водитель не может просматривать чужие автомобили
        if (req.user?.role === 'driver' && req.user.employee_id && car.assigned_to?.toString() !== req.user.employee_id.toString()) {
            return res.status(404).json({message: 'Автомобиль не найден'})
        }
        res.json(car)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const createCar = async (req, res) => {
    try {
        const car = new Car(req.body)
        await car.save()
        res.status(201).json(car)
    } catch (error) {
        if (error.code === 11000) {
            const field = error.keyPattern?.plate_number ? 'гос. номер' : error.keyPattern?.vin ? 'VIN' : 'поле'
            return res.status(400).json({message: `Автомобиль с таким ${field} уже существует`})
        }
        res.status(400).json({message: error.message})
    }
}

export const updateCar = async (req, res) => {
    try {
        const car = await Car.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new: true, runValidators: true}
        )
        if (!car) {
            return res.status(404).json({message: 'Автомобиль не найден'})
        }
        res.json(car)
    } catch (error) {
        if (error.code === 11000) {
            const field = error.keyPattern?.plate_number ? 'гос. номер' : error.keyPattern?.vin ? 'VIN' : 'поле'
            return res.status(400).json({message: `Автомобиль с таким ${field} уже существует`})
        }
        res.status(400).json({message: error.message})
    }
}

export const deleteCar = async (req, res) => {
    try {
        const car = await Car.findByIdAndDelete(req.params.id)
        if (!car) {
            return res.status(404).json({message: 'Автомобиль не найден'})
        }

        // Удаляем связанные файлы
        const uploadsBase = path.join(__dirname, '..', 'uploads')
        if (car.photos && car.photos.length > 0) {
            car.photos.forEach(photo => {
                const photoPath = path.join(uploadsBase, 'photos', path.basename(photo))
                if (fs.existsSync(photoPath)) {
                    fs.unlinkSync(photoPath)
                }
            })
        }

        if (car.documents && car.documents.length > 0) {
            car.documents.forEach(doc => {
                const docPath = path.join(uploadsBase, 'documents', path.basename(doc))
                if (fs.existsSync(docPath)) {
                    fs.unlinkSync(docPath)
                }
            })
        }

        res.json({message: 'Автомобиль удален'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const uploadCarPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({message: 'Файл не загружен'})
        }

        const car = await Car.findById(req.params.id)
        if (!car) {
            // Удаляем загруженный файл, если автомобиль не найден
            const uploadsBase = path.join(__dirname, '..', 'uploads')
            const filePath = path.join(uploadsBase, 'photos', req.file.filename)
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
            return res.status(404).json({message: 'Автомобиль не найден'})
        }

        // Добавляем путь к фотографии
        const photoPath = `/uploads/photos/${req.file.filename}`
        car.photos.push(photoPath)
        await car.save()

        res.json({
            message: 'Фотография загружена',
            photo: photoPath,
            car
        })
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const deleteCarPhoto = async (req, res) => {
    try {
        const {photoPath} = req.body
        const car = await Car.findById(req.params.id)

        if (!car) {
            return res.status(404).json({message: 'Автомобиль не найден'})
        }

        // Удаляем путь из массива фотографий
        car.photos = car.photos.filter(p => p !== photoPath)
        await car.save()

        // Удаляем файл с диска
        const uploadsBase = path.join(__dirname, '..', 'uploads')
        const filePath = path.join(uploadsBase, 'photos', path.basename(photoPath))
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }

        res.json({message: 'Фотография удалена', car})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const uploadCarDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({message: 'Файл не загружен'})
        }

        const car = await Car.findById(req.params.id)
        if (!car) {
            // Удаляем загруженный файл, если автомобиль не найден
            const uploadsBase = path.join(__dirname, '..', 'uploads')
            const filePath = path.join(uploadsBase, 'documents', req.file.filename)
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
            return res.status(404).json({message: 'Автомобиль не найден'})
        }

        // Добавляем путь к документу
        const docPath = `/uploads/documents/${req.file.filename}`
        car.documents.push(docPath)
        await car.save()

        res.json({
            message: 'Документ загружен',
            document: docPath,
            car
        })
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const deleteCarDocument = async (req, res) => {
    try {
        const {documentPath} = req.body
        const car = await Car.findById(req.params.id)

        if (!car) {
            return res.status(404).json({message: 'Автомобиль не найден'})
        }

        // Удаляем путь из массива документов
        car.documents = car.documents.filter(d => d !== documentPath)
        await car.save()

        // Удаляем файл с диска
        const uploadsBase = path.join(__dirname, '..', 'uploads')
        const filePath = path.join(uploadsBase, 'documents', path.basename(documentPath))
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }

        res.json({message: 'Документ удален', car})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}
