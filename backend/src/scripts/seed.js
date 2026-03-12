import dotenv from 'dotenv'

dotenv.config()

import mongoose from 'mongoose'
import User from '../models/User.js'
import Employee from '../models/Employee.js'
import Car from '../models/Car.js'
import Card from '../models/Card.js'
import Transaction from '../models/Transaction.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fleetmanager'

// Данные для генерации
const brands = ['Toyota', 'Volkswagen', 'Ford', 'Mercedes-Benz', 'BMW', 'Audi', 'Hyundai', 'Nissan', 'Kia', 'Renault']
const models = {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Land Cruiser', 'Highlander'],
    'Volkswagen': ['Passat', 'Golf', 'Tiguan', 'Polo', 'Jetta'],
    'Ford': ['Focus', 'Fiesta', 'Mondeo', 'Explorer', 'Edge'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE'],
    'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'X1'],
    'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3'],
    'Hyundai': ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Kona'],
    'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Murano'],
    'Kia': ['Optima', 'Rio', 'Sportage', 'Sorento', 'Seltos'],
    'Renault': ['Logan', 'Sandero', 'Duster', 'Kaptur', 'Arkana']
}

const positions = ['Водитель', 'Менеджер автопарка', 'Механик', 'Логист', 'Диспетчер']
const departments = ['Транспортный отдел', 'Логистика', 'Сервис', 'Администрация']
const fuelTypes = ['АИ-95', 'АИ-92', 'Дизель', 'Газ']
const locations = ['АЗС ЛУКОЙЛ', 'АЗС Роснефть', 'АЗС Газпромнефть', 'АЗС Татнефть', 'АЗС Shell']

// Генерация случайных данных
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)]
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const randomDate = (start, end) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

const generatePlateNumber = () => {
    const letters = 'АВЕКМНОРСТУХ'
    const letter1 = letters[Math.floor(Math.random() * letters.length)]
    const letter2 = letters[Math.floor(Math.random() * letters.length)]
    const letter3 = letters[Math.floor(Math.random() * letters.length)]
    const numbers = String(Math.floor(Math.random() * 900) + 100)
    const region = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')
    return `${letter1}${numbers}${letter2}${letter3}${region}`
}

const generateVIN = () => {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'
    let vin = ''
    for (let i = 0; i < 17; i++) {
        vin += chars[Math.floor(Math.random() * chars.length)]
    }
    return vin
}

const generateCardNumber = () => {
    return String(Math.floor(Math.random() * 9000000000000000) + 1000000000000000)
}

const seedDatabase = async () => {
    try {
        console.log('Подключение к MongoDB...')
        await mongoose.connect(MONGODB_URI)
        console.log('Подключено к MongoDB')

        // Очистка базы данных
        console.log('Очистка базы данных...')
        await User.deleteMany({})
        await Employee.deleteMany({})
        await Car.deleteMany({})
        await Card.deleteMany({})
        await Transaction.deleteMany({})
        console.log('База данных очищена')

        // Создание пользователей
        console.log('Создание пользователей...')
        // Пароль будет автоматически захеширован через pre-save hook модели User
        const adminUser = new User({
            email: 'admin@fleetmanager.ru',
            password: 'admin123',
            role: 'admin'
        })
        await adminUser.save()

        const managerUser = new User({
            email: 'manager@fleetmanager.ru',
            password: 'manager123',
            role: 'manager'
        })
        await managerUser.save()

        const users = [adminUser, managerUser]
        console.log(`Создано ${users.length} пользователей`)

        // Создание сотрудников
        console.log('Создание сотрудников...')
        const employees = []
        const employeeNames = [
            'Иванов Иван Иванович', 'Петров Петр Петрович', 'Сидоров Сидор Сидорович',
            'Козлов Алексей Владимирович', 'Смирнов Дмитрий Сергеевич', 'Попов Андрей Николаевич',
            'Соколов Максим Александрович', 'Лебедев Сергей Викторович', 'Новиков Игорь Олегович',
            'Морозов Владимир Дмитриевич', 'Волков Павел Игоревич', 'Алексеев Роман Сергеевич',
            'Леонов Артем Валерьевич', 'Семенов Константин Анатольевич', 'Егоров Николай Петрович',
            'Павлов Михаил Юрьевич', 'Козлова Анна Сергеевна', 'Новикова Елена Владимировна',
            'Морозова Ольга Дмитриевна', 'Волкова Татьяна Игоревна'
        ]

        for (let i = 0; i < employeeNames.length; i++) {
            const employee = await Employee.create({
                full_name: employeeNames[i],
                position: randomElement(positions),
                department: randomElement(departments),
                phone: `+7${randomInt(900, 999)}${randomInt(1000000, 9999999)}`,
                hire_date: randomDate(new Date(2020, 0, 1), new Date(2023, 11, 31)),
                status: Math.random() > 0.1 ? 'active' : 'inactive',
                created_by: randomElement(users)._id
            })
            employees.push(employee)
        }
        console.log(`Создано ${employees.length} сотрудников`)

        // Создание автомобилей
        console.log('Создание автомобилей...')
        const cars = []
        const statuses = ['active', 'repair', 'reserve']

        for (let i = 0; i < 30; i++) {
            const brand = randomElement(brands)
            const model = randomElement(models[brand])
            const year = randomInt(2015, 2024)
            const mileage = randomInt(10000, 200000)

            const car = await Car.create({
                brand,
                model,
                plate_number: generatePlateNumber(),
                vin: generateVIN(),
                year,
                mileage,
                status: randomElement(statuses),
                last_service: randomDate(new Date(2023, 0, 1), new Date()),
                assigned_to: Math.random() > 0.3 ? randomElement(employees)._id : null,
                equipment: Math.random() > 0.5 ? [{
                    name: 'GPS-трекер',
                    serial_number: `GPS-${randomInt(100000, 999999)}`,
                    installed_date: randomDate(new Date(2022, 0, 1), new Date())
                }] : []
            })
            cars.push(car)
        }
        console.log(`Создано ${cars.length} автомобилей`)

        // Создание карт
        console.log('Создание карт...')
        const cards = []
        const cardTypes = ['fuel', 'service']
        const cardStatuses = ['active', 'blocked', 'expired']

        for (let i = 0; i < 25; i++) {
            const balance = randomInt(0, 50000)
            const limit = randomInt(10000, 100000)

            const card = await Card.create({
                card_number: generateCardNumber(),
                type: randomElement(cardTypes),
                balance,
                limit,
                status: randomElement(cardStatuses),
                assigned_to: Math.random() > 0.2 ? randomElement(employees)._id : null,
                assigned_car: Math.random() > 0.3 ? randomElement(cars)._id : null,
                expiry_date: randomDate(new Date(), new Date(2026, 11, 31))
            })
            cards.push(card)
        }
        console.log(`Создано ${cards.length} карт`)

        // Создание транзакций
        console.log('Создание транзакций...')
        const transactions = []
        const transactionStatuses = ['completed', 'pending', 'cancelled']
        const startDate = new Date(2024, 0, 1)
        const endDate = new Date()

        for (let i = 0; i < 500; i++) {
            const date = randomDate(startDate, endDate)
            const volume = randomInt(20, 80)
            const pricePerLiter = randomInt(45, 55)
            const amount = volume * pricePerLiter
            const odometer = randomInt(50000, 250000)

            const transaction = await Transaction.create({
                card_id: randomElement(cards)._id,
                employee_id: randomElement(employees)._id,
                car_id: randomElement(cars)._id,
                amount: Math.round(amount),
                fuel_type: randomElement(fuelTypes),
                volume,
                location: randomElement(locations),
                odometer,
                date,
                status: randomElement(transactionStatuses)
            })
            transactions.push(transaction)
        }
        console.log(`Создано ${transactions.length} транзакций`)

        // Обновление балансов карт на основе транзакций
        console.log('Обновление балансов карт...')
        for (const card of cards) {
            const cardTransactions = transactions.filter(t =>
                t.card_id.toString() === card._id.toString() && t.status === 'completed'
            )
            const totalSpent = cardTransactions.reduce((sum, t) => sum + t.amount, 0)
            const newBalance = Math.max(0, card.balance - totalSpent)
            await Card.findByIdAndUpdate(card._id, {balance: newBalance})
        }
        console.log('Балансы карт обновлены')

        // Обновление пробега автомобилей на основе транзакций
        console.log('Обновление пробега автомобилей...')
        for (const car of cars) {
            const carTransactions = transactions.filter(t =>
                t.car_id.toString() === car._id.toString()
            )
            if (carTransactions.length > 0) {
                const maxOdometer = Math.max(...carTransactions.map(t => t.odometer))
                await Car.findByIdAndUpdate(car._id, {mileage: maxOdometer})
            }
        }
        console.log('Пробег автомобилей обновлен')

        // Привязка карт к сотрудникам в модели Employee
        console.log('Привязка карт к сотрудникам...')
        for (let i = 0; i < employees.length && i < cards.length; i++) {
            const card = cards[i]
            if (card.assigned_to) {
                await Employee.findByIdAndUpdate(card.assigned_to, {card_id: card._id})
            }
        }
        console.log('Карты привязаны к сотрудникам')

        // Привязка автомобилей к сотрудникам
        console.log('Привязка автомобилей к сотрудникам...')
        for (const car of cars) {
            if (car.assigned_to) {
                const employee = await Employee.findById(car.assigned_to)
                if (employee && !employee.assigned_cars.includes(car._id)) {
                    employee.assigned_cars.push(car._id)
                    await employee.save()
                }
            }
        }
        console.log('Автомобили привязаны к сотрудникам')

        console.log('\n✅ База данных успешно заполнена!')
        console.log('\nУчетные данные для входа:')
        console.log('Администратор: admin@fleetmanager.ru / admin123')
        console.log('Менеджер: manager@fleetmanager.ru / manager123')
        console.log(`\nСоздано:`)
        console.log(`- Пользователей: ${users.length}`)
        console.log(`- Сотрудников: ${employees.length}`)
        console.log(`- Автомобилей: ${cars.length}`)
        console.log(`- Карт: ${cards.length}`)
        console.log(`- Транзакций: ${transactions.length}`)

        await mongoose.connection.close()
        process.exit(0)
    } catch (error) {
        console.error('Ошибка при заполнении базы данных:', error)
        await mongoose.connection.close()
        process.exit(1)
    }
}

seedDatabase()
