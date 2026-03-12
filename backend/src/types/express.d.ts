import type { IUserPublic } from '../models/User.js'

declare global {
  namespace Express {
    interface Request {
      user?: IUserPublic
    }
  }
}

export {}
