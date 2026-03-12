import { validationResult } from 'express-validator'

/** @param {import('express-validator').ValidationChain[]} validations */
export const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((v) => v.run(req)))
        const errors = validationResult(req)
        if (errors.isEmpty()) return next()
        const first = errors.array()[0]
        return res.status(400).json({
            message: first.msg,
            errors: errors.array().map((e) => ({path: e.path, msg: e.msg}))
        })
    }
}
