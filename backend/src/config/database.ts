import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/fleetmanager'
    )
    console.log(`MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Error: ${message}`)
    process.exit(1)
  }
}

export default connectDB
