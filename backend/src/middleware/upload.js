import multer from 'multer'
import path from 'path'
import fs from 'fs'
import {fileURLToPath} from 'url'
import {dirname} from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Создаем директории для загрузки файлов, если их нет
const uploadsDir = path.join(__dirname, '..', 'uploads')
const photosDir = path.join(uploadsDir, 'photos')
const documentsDir = path.join(uploadsDir, 'documents')

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, {recursive: true})
}
if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, {recursive: true})
}
if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, {recursive: true})
}

// Настройка хранилища для фотографий
const photoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, photosDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, `car-photo-${uniqueSuffix}${ext}`)
    }
})

// Настройка хранилища для документов
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentsDir)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname)
        cb(null, `car-doc-${uniqueSuffix}${ext}`)
    }
})

// Фильтр для фотографий
const photoFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
        return cb(null, true)
    } else {
        cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'))
    }
}

// Фильтр для документов
const documentFilter = (req, file, cb) => {
    const allowedTypes = /pdf/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = file.mimetype === 'application/pdf'

    if (mimetype && extname) {
        return cb(null, true)
    } else {
        cb(new Error('Разрешен только формат PDF'))
    }
}

export const uploadPhoto = multer({
    storage: photoStorage,
    limits: {fileSize: 5 * 1024 * 1024}, // 5MB
    fileFilter: photoFilter
})

export const uploadDocument = multer({
    storage: documentStorage,
    limits: {fileSize: 10 * 1024 * 1024}, // 10MB
    fileFilter: documentFilter
})
