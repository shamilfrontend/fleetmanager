import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const uploadsDir = path.join(__dirname, '..', 'uploads')
const photosDir = path.join(uploadsDir, 'photos')
const documentsDir = path.join(uploadsDir, 'documents')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true })
}
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true })
}

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, photosDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `car-photo-${uniqueSuffix}${ext}`)
  }
})

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `car-doc-${uniqueSuffix}${ext}`)
  }
})

const photoFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)
  if (mimetype && extname) {
    cb(null, true)
  } else {
    cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'))
  }
}

const documentFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowedTypes = /pdf/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = file.mimetype === 'application/pdf'
  if (mimetype && extname) {
    cb(null, true)
  } else {
    cb(new Error('Разрешен только формат PDF'))
  }
}

export const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: photoFilter
})

export const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: documentFilter
})
