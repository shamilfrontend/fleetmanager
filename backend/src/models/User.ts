import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser {
  _id: mongoose.Types.ObjectId
  email: string
  password: string
  role: 'admin' | 'manager' | 'driver'
  employee_id: mongoose.Types.ObjectId | null
  created_at: Date
  updated_at: Date
}

export type IUserPublic = Omit<IUser, 'password'>

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>
}

type UserModel = mongoose.Model<IUser, Record<string, never>, IUserMethods>

const userSchema = new mongoose.Schema<IUser, UserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'driver'],
      default: 'driver'
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  this.updated_at = new Date()
  next()
})

userSchema.methods.comparePassword = async function (candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.model<IUser, UserModel>('User', userSchema)
