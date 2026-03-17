export interface User {
  _id: string
  email: string
  role: 'admin' | 'manager' | 'driver'
  employee_id?: string
  created_at: string
  updated_at: string
}

export interface Employee {
  _id: string
  full_name: string
  position: string
  department: string
  phone: string
  card_id?: string
  assigned_cars: string[]
  hire_date: string
  status: 'active' | 'inactive'
  created_by: string
}

export interface Equipment {
  name: string
  serial_number: string
  installed_date: string
}

export interface Car {
  _id: string
  brand: string
  model: string
  plate_number: string
  vin: string
  year: number
  equipment: Equipment[]
  assigned_to?: string
  status: 'active' | 'repair' | 'reserve'
  mileage: number
  last_service?: string
  photos?: string[]
  documents?: string[]
}

export interface Card {
  _id: string
  card_number: string
  type: 'fuel' | 'service'
  balance: number
  limit: number
  assigned_to?: string
  assigned_car?: string
  status: 'active' | 'blocked' | 'expired'
  expiry_date?: string
}

export interface Transaction {
  _id: string
  card_id: string
  employee_id: string
  car_id: string
  amount: number
  fuel_type: string
  volume: number
  location: string
  odometer: number
  date: string
  status: 'completed' | 'pending' | 'cancelled'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

/** Единый формат ошибки API (message + опционально errors) */
export interface ApiErrorBody {
  message: string
  errors?: Array<{ path?: string; msg?: string }>
}
