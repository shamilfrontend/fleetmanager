import Employee from '../models/Employee.js'
import {getPaginationParams, paginatedResponse} from '../utils/pagination.js'

export const getAllEmployees = async (req, res) => {
    try {
        const filter = {}
        if (req.query.status) filter.status = req.query.status

        // Водитель видит только свою карточку сотрудника
        if (req.user?.role === 'driver' && req.user.employee_id) {
            filter._id = req.user.employee_id
        }
        const {page, limit, skip} = getPaginationParams(req.query)
        const [employees, total] = await Promise.all([
            Employee.find(filter)
                .populate('card_id', 'card_number')
                .populate('assigned_cars', 'brand model plate_number')
                .sort({created_at: -1})
                .skip(skip)
                .limit(limit),
            Employee.countDocuments(filter)
        ])
        res.json(paginatedResponse(employees, total, page, limit))
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate('card_id', 'card_number')
            .populate('assigned_cars', 'brand model plate_number')
        if (!employee) {
            return res.status(404).json({message: 'Сотрудник не найден'})
        }

        // Водитель не может смотреть других сотрудников
        if (req.user?.role === 'driver' && req.user.employee_id && employee._id.toString() !== req.user.employee_id.toString()) {
            return res.status(404).json({message: 'Сотрудник не найден'})
        }
        res.json(employee)
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

export const createEmployee = async (req, res) => {
    try {
        const employee = new Employee({
            ...req.body,
            created_by: req.user?._id || null
        })
        await employee.save()

        // Отслеживаем начальные связи при создании
        if (req.user?._id) {
            try {
                const {trackEmployeeLinks} = await import('../utils/linkHistory.js')
                const populatedEmployee = await Employee.findById(employee._id)
                    .populate('card_id')
                    .populate('assigned_cars')

                if (populatedEmployee) {
                    const emptyEmployee = {card_id: null, assigned_cars: []}
                    await trackEmployeeLinks(emptyEmployee, populatedEmployee, req.user._id)
                }
            } catch (historyError) {
                // Игнорируем ошибки истории, чтобы не прерывать создание сотрудника
                console.error('Ошибка создания истории связей:', historyError)
            }
        }

        res.status(201).json(employee)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
}

export const updateEmployee = async (req, res) => {
    try {
        // Получаем старую версию для отслеживания изменений
        const oldEmployee = await Employee.findById(req.params.id)
            .populate('card_id')
            .populate('assigned_cars')

        const employee = await Employee.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new: true, runValidators: true}
        )
            .populate('card_id')
            .populate('assigned_cars')

        if (!employee) {
            return res.status(404).json({message: 'Сотрудник не найден'})
        }

        // Отслеживаем изменения связей
        if (oldEmployee && req.user?._id) {
            try {
                const {trackEmployeeLinks} = await import('../utils/linkHistory.js')
                await trackEmployeeLinks(oldEmployee, employee, req.user._id)
            } catch (historyError) {
                // Игнорируем ошибки истории, чтобы не прерывать обновление
                console.error('Ошибка создания истории связей:', historyError)
            }
        }

        res.json(employee)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
}

export const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByIdAndDelete(req.params.id)
        if (!employee) {
            return res.status(404).json({message: 'Сотрудник не найден'})
        }
        res.json({message: 'Сотрудник удален'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
}
