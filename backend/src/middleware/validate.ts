import type { Request, Response, NextFunction } from 'express'
import { validationResult, type ValidationChain } from 'express-validator'

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((v) => v.run(req)))
    const errors = validationResult(req)
    if (errors.isEmpty()) {
      next()
      return
    }
    const first = errors.array()[0]
    const firstErr = first as { msg?: string; path?: string }
    res.status(400).json({
      message: (firstErr.msg as string) ?? 'Ошибка валидации',
      errors: errors.array().map((e) => ({ path: (e as { path?: string }).path, msg: (e as { msg?: string }).msg }))
    })
  }
}
