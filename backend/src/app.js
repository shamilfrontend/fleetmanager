import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import rateLimit from 'express-rate-limit'
import connectDB from './config/database.js'
import authRoutes from './routes/auth.js'
import carRoutes from './routes/cars.js'
import employeeRoutes from './routes/employees.js'
import cardRoutes from './routes/cards.js'
import transactionRoutes from './routes/transactions.js'
import linkHistoryRoutes from './routes/linkHistory.js'
import maintenanceRoutes from './routes/maintenance.js'
import logger from './utils/logger.js'

const app = express()
const PORT = process.env.PORT || 5002

// Подключение к БД
connectDB()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Базовый rate limit для всех API-роутов
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false
})
app.use('/api', apiLimiter)

// Статические файлы для загрузок
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsPath = path.join(__dirname, '..', 'uploads')
app.use('/uploads', express.static(uploadsPath))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/cars', carRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/cards', cardRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/link-history', linkHistoryRoutes)
app.use('/api/maintenance', maintenanceRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'FleetManager API is running' })
})

// Error handling
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  })

  // Специализированная обработка типичных ошибок Mongoose
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: 'Ошибка валидации данных', details: err.errors })
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Некорректный идентификатор ресурса' })
  }

  const status = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500
  res.status(status).json({
    message: status === 500 ? 'Что-то пошло не так!' : err.message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
