import type { Types } from 'mongoose'
import type { IEmployee } from '../models/Employee.js'
import type { ICard } from '../models/Card.js'

export interface CreateLinkHistoryParams {
  linkType: string
  employeeId?: string | null
  cardId?: string | null
  carId?: string | null
  action: string
  previousValue: string | null
  newValue: string | null
  changedBy: Types.ObjectId
}

/**
 * Создает запись в истории изменений связей
 */
export const createLinkHistory = async ({
  linkType,
  employeeId,
  cardId,
  carId,
  action,
  previousValue,
  newValue,
  changedBy
}: CreateLinkHistoryParams): Promise<void> => {
  try {
    const { default: LinkHistory } = await import('../models/LinkHistory.js')
    const history = new LinkHistory({
      link_type: linkType,
      employee_id: employeeId ?? null,
      card_id: cardId ?? null,
      car_id: carId ?? null,
      action,
      previous_value: previousValue,
      new_value: newValue,
      changed_by: changedBy
    })
    await history.save()
  } catch (error) {
    console.error('Ошибка создания истории связей:', error)
  }
}

/**
 * Отслеживает изменения связей сотрудника
 */
export const trackEmployeeLinks = async (
  oldEmployee: IEmployee | null,
  newEmployee: IEmployee,
  userId: Types.ObjectId
): Promise<void> => {
  const oldCardId = oldEmployee?.card_id?.toString() ?? null
  const newCardId = newEmployee?.card_id?.toString() ?? null

  if (oldCardId !== newCardId) {
    if (oldCardId && !newCardId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployee._id.toString(),
        cardId: oldCardId,
        action: 'unassigned',
        previousValue: oldCardId,
        newValue: null,
        changedBy: userId
      })
    } else if (!oldCardId && newCardId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployee._id.toString(),
        cardId: newCardId,
        action: 'assigned',
        previousValue: null,
        newValue: newCardId,
        changedBy: userId
      })
    } else if (oldCardId && newCardId && oldCardId !== newCardId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployee._id.toString(),
        cardId: newCardId,
        action: 'changed',
        previousValue: oldCardId,
        newValue: newCardId,
        changedBy: userId
      })
    }
  }

  const oldCars = (oldEmployee?.assigned_cars ?? []).map((c) => c.toString()).sort()
  const newCars = (newEmployee?.assigned_cars ?? []).map((c) => c.toString()).sort()
  const oldCarsStr = oldCars.join(',')
  const newCarsStr = newCars.join(',')

  if (oldCarsStr !== newCarsStr) {
    const added = newCars.filter((c) => !oldCars.includes(c))
    const removed = oldCars.filter((c) => !newCars.includes(c))

    for (const carId of added) {
      await createLinkHistory({
        linkType: 'employee-car',
        employeeId: newEmployee._id.toString(),
        carId,
        action: 'assigned',
        previousValue: null,
        newValue: carId,
        changedBy: userId
      })
    }

    for (const carId of removed) {
      await createLinkHistory({
        linkType: 'employee-car',
        employeeId: newEmployee._id.toString(),
        carId,
        action: 'unassigned',
        previousValue: carId,
        newValue: null,
        changedBy: userId
      })
    }
  }
}

/**
 * Отслеживает изменения связей карты
 */
export const trackCardLinks = async (
  oldCard: ICard | null,
  newCard: ICard,
  userId: Types.ObjectId
): Promise<void> => {
  const oldEmployeeId = oldCard?.assigned_to?.toString() ?? null
  const newEmployeeId = newCard?.assigned_to?.toString() ?? null

  if (oldEmployeeId !== newEmployeeId) {
    if (oldEmployeeId && !newEmployeeId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: oldEmployeeId,
        cardId: newCard._id.toString(),
        action: 'unassigned',
        previousValue: oldEmployeeId,
        newValue: null,
        changedBy: userId
      })
    } else if (!oldEmployeeId && newEmployeeId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployeeId,
        cardId: newCard._id.toString(),
        action: 'assigned',
        previousValue: null,
        newValue: newEmployeeId,
        changedBy: userId
      })
    } else if (oldEmployeeId && newEmployeeId && oldEmployeeId !== newEmployeeId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployeeId,
        cardId: newCard._id.toString(),
        action: 'changed',
        previousValue: oldEmployeeId,
        newValue: newEmployeeId,
        changedBy: userId
      })
    }
  }

  const oldCarId = oldCard?.assigned_car?.toString() ?? null
  const newCarId = newCard?.assigned_car?.toString() ?? null

  if (oldCarId !== newCarId) {
    if (oldCarId && !newCarId) {
      await createLinkHistory({
        linkType: 'card-car',
        cardId: newCard._id.toString(),
        carId: oldCarId,
        action: 'unassigned',
        previousValue: oldCarId,
        newValue: null,
        changedBy: userId
      })
    } else if (!oldCarId && newCarId) {
      await createLinkHistory({
        linkType: 'card-car',
        cardId: newCard._id.toString(),
        carId: newCarId,
        action: 'assigned',
        previousValue: null,
        newValue: newCarId,
        changedBy: userId
      })
    } else if (oldCarId && newCarId && oldCarId !== newCarId) {
      await createLinkHistory({
        linkType: 'card-car',
        cardId: newCard._id.toString(),
        carId: newCarId,
        action: 'changed',
        previousValue: oldCarId,
        newValue: newCarId,
        changedBy: userId
      })
    }
  }
}
