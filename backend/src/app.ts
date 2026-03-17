import dotenv from 'dotenv'
dotenv.config()

const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const
const missing = requiredEnvVars.filter((key) => !process.env[key]?.trim())
if (missing.length > 0) {
  console.error(
    `Ошибка: не заданы обязательные переменные окружения: ${missing.join(', ')}. Скопируйте .env.example в .env и заполните значения.`
  )
  process.exit(1)
}

import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import yaml from 'js-yaml'

import connectDB from './config/database.js'
import authRoutes from './routes/auth.js'
import carRoutes from './routes/cars.js'
import employeeRoutes from './routes/employees.js'
import cardRoutes from './routes/cards.js'
import transactionRoutes from './routes/transactions.js'
import maintenanceRoutes from './routes/maintenance.js'
import logger from './utils/logger.js'

const app = express()
const PORT = process.env.PORT || 5002

void connectDB()

app.use(helmet())
const isProd = process.env.NODE_ENV === 'production'
const corsOrigin = isProd && process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : undefined
app.use(cors(corsOrigin ? { origin: corsOrigin } : {}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false
})
app.use('/api', apiLimiter)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadsPath = path.join(__dirname, '..', 'uploads')
app.use('/uploads', express.static(uploadsPath))

app.use('/api/auth', authRoutes)
app.use('/api/cars', carRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/cards', cardRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/maintenance', maintenanceRoutes)

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'FleetManager API is running' })
})

if (process.env.NODE_ENV !== 'production') {
  const openapiPath = path.join(__dirname, '..', 'openapi.yaml')
  if (fs.existsSync(openapiPath)) {
    const spec = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as object
    const swaggerHandlers = [swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'FleetManager API' })] as unknown as express.RequestHandler[]
    app.use('/api-docs', ...swaggerHandlers)
  }
}

interface HttpError {
  message?: string
  statusCode?: number
  code?: number
  name?: string
  stack?: string
  errors?: unknown
  keyPattern?: Record<string, number>
}

app.use((err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const error = err as HttpError
  logger.error('Unhandled error', {
    message: error?.message,
    stack: error?.stack,
    path: req.path,
    method: req.method
  })

  if (error?.name === 'ValidationError') {
    res.status(400).json({
      message: 'Ошибка валидации данных',
      errors: error.errors
    })
    return
  }

  if (error?.name === 'CastError') {
    res.status(400).json({ message: 'Некорректный идентификатор ресурса' })
    return
  }

  if (error?.code === 11000) {
    res.status(409).json({ message: 'Запись с таким значением уже существует' })
    return
  }

  const status =
    error?.statusCode != null && Number.isInteger(error.statusCode) ? error.statusCode : 500
  res.status(status).json({
    message: status === 500 ? 'Что-то пошло не так!' : (error?.message ?? 'Ошибка'),
    error: process.env.NODE_ENV === 'development' ? error?.stack : undefined
  })
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
