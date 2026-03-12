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
}) => {
  try {
    // Ленивый импорт для избежания циклических зависимостей
    const { default: LinkHistory } = await import('../models/LinkHistory.js')
    
    const history = new LinkHistory({
      link_type: linkType,
      employee_id: employeeId || null,
      card_id: cardId || null,
      car_id: carId || null,
      action,
      previous_value: previousValue,
      new_value: newValue,
      changed_by: changedBy
    })
    await history.save()
    return history
  } catch (error) {
    console.error('Ошибка создания истории связей:', error)
    // Не бросаем ошибку, чтобы не прерывать основной процесс
  }
}

/**
 * Отслеживает изменения связей сотрудника
 */
export const trackEmployeeLinks = async (oldEmployee, newEmployee, userId) => {
  // Отслеживание изменения карты
  const oldCardId = oldEmployee?.card_id?.toString() || null
  const newCardId = newEmployee?.card_id?.toString() || null

  if (oldCardId !== newCardId) {
    if (oldCardId && !newCardId) {
      // Карта отвязана
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployee._id,
        cardId: oldCardId,
        action: 'unassigned',
        previousValue: oldCardId,
        newValue: null,
        changedBy: userId
      })
    } else if (!oldCardId && newCardId) {
      // Карта привязана
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployee._id,
        cardId: newCardId,
        action: 'assigned',
        previousValue: null,
        newValue: newCardId,
        changedBy: userId
      })
    } else if (oldCardId && newCardId && oldCardId !== newCardId) {
      // Карта изменена
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployee._id,
        cardId: newCardId,
        action: 'changed',
        previousValue: oldCardId,
        newValue: newCardId,
        changedBy: userId
      })
    }
  }

  // Отслеживание изменения автомобилей
  const oldCars = (oldEmployee?.assigned_cars || []).map(c => c.toString()).sort()
  const newCars = (newEmployee?.assigned_cars || []).map(c => c.toString()).sort()
  const oldCarsStr = oldCars.join(',')
  const newCarsStr = newCars.join(',')

  if (oldCarsStr !== newCarsStr) {
    // Находим добавленные и удаленные автомобили
    const added = newCars.filter(c => !oldCars.includes(c))
    const removed = oldCars.filter(c => !newCars.includes(c))

    // Записываем добавленные
    for (const carId of added) {
      await createLinkHistory({
        linkType: 'employee-car',
        employeeId: newEmployee._id,
        carId,
        action: 'assigned',
        previousValue: null,
        newValue: carId,
        changedBy: userId
      })
    }

    // Записываем удаленные
    for (const carId of removed) {
      await createLinkHistory({
        linkType: 'employee-car',
        employeeId: newEmployee._id,
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
export const trackCardLinks = async (oldCard, newCard, userId) => {
  // Отслеживание изменения сотрудника
  const oldEmployeeId = oldCard?.assigned_to?.toString() || null
  const newEmployeeId = newCard?.assigned_to?.toString() || null

  if (oldEmployeeId !== newEmployeeId) {
    if (oldEmployeeId && !newEmployeeId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: oldEmployeeId,
        cardId: newCard._id,
        action: 'unassigned',
        previousValue: oldEmployeeId,
        newValue: null,
        changedBy: userId
      })
    } else if (!oldEmployeeId && newEmployeeId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployeeId,
        cardId: newCard._id,
        action: 'assigned',
        previousValue: null,
        newValue: newEmployeeId,
        changedBy: userId
      })
    } else if (oldEmployeeId && newEmployeeId && oldEmployeeId !== newEmployeeId) {
      await createLinkHistory({
        linkType: 'employee-card',
        employeeId: newEmployeeId,
        cardId: newCard._id,
        action: 'changed',
        previousValue: oldEmployeeId,
        newValue: newEmployeeId,
        changedBy: userId
      })
    }
  }

  // Отслеживание изменения автомобиля
  const oldCarId = oldCard?.assigned_car?.toString() || null
  const newCarId = newCard?.assigned_car?.toString() || null

  if (oldCarId !== newCarId) {
    if (oldCarId && !newCarId) {
      await createLinkHistory({
        linkType: 'card-car',
        cardId: newCard._id,
        carId: oldCarId,
        action: 'unassigned',
        previousValue: oldCarId,
        newValue: null,
        changedBy: userId
      })
    } else if (!oldCarId && newCarId) {
      await createLinkHistory({
        linkType: 'card-car',
        cardId: newCard._id,
        carId: newCarId,
        action: 'assigned',
        previousValue: null,
        newValue: newCarId,
        changedBy: userId
      })
    } else if (oldCarId && newCarId && oldCarId !== newCarId) {
      await createLinkHistory({
        linkType: 'card-car',
        cardId: newCard._id,
        carId: newCarId,
        action: 'changed',
        previousValue: oldCarId,
        newValue: newCarId,
        changedBy: userId
      })
    }
  }
}
