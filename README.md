# FleetManager - Система управления автопарком

Веб-приложение для автоматизации управления автопарком, контроля закрепления активов за сотрудниками, управления топливными картами и аналитики использования транспортных средств.

## Технологический стек

### Frontend
- Vue 3 (Composition API)
- TypeScript
- Vite
- Pinia
- Vue Router
- Axios
- SCSS

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Bcrypt

## Установка и запуск

### Требования
- Node.js 18+
- MongoDB
- Yarn или npm

### Backend

1. Перейдите в директорию backend:
```bash
cd backend
```

2. Установите зависимости:
```bash
yarn install
```

3. Создайте файл `.env` на основе `.env.example`:
```bash
cp .env.example .env
```

4. Настройте переменные окружения в `.env`:
```
PORT=5002
MONGODB_URI=mongodb://localhost:27017/fleetmanager
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
NODE_ENV=development
```

5. Запустите сервер:
```bash
yarn dev
```

### Frontend

1. Перейдите в директорию frontend:
```bash
cd frontend
```

2. Установите зависимости:
```bash
yarn install
```

3. Создайте файл `.env` (опционально):
```
VITE_API_URL=http://localhost:5002/api
```

4. Запустите dev-сервер:
```bash
yarn dev
```

Приложение будет доступно по адресу `http://localhost:3000`

## Структура проекта

```
fleetmanager/
├── frontend/          # Vue 3 приложение
│   ├── src/
│   │   ├── api/       # API клиенты
│   │   ├── components/# Vue компоненты
│   │   ├── layouts/   # Layout компоненты
│   │   ├── pages/     # Страницы приложения
│   │   ├── router/    # Vue Router конфигурация
│   │   ├── stores/    # Pinia stores
│   │   └── utils/     # Утилиты
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── models/    # Mongoose модели
│   │   ├── controllers/# Контроллеры
│   │   ├── routes/    # Маршруты API
│   │   ├── middleware/# Middleware
│   │   └── config/    # Конфигурация
│   └── package.json
└── README.md
```

## Роли пользователей

- **Администратор** - полный доступ ко всем разделам
- **Менеджер** - управление сотрудниками, картами, транзакциями
- **Водитель** - ограниченный доступ (личные карты, гараж)

## API Endpoints

### Аутентификация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход
- `POST /api/auth/refresh` - Обновление токена
- `GET /api/auth/me` - Получение текущего пользователя

### Автомобили
- `GET /api/cars` - Список автомобилей
- `GET /api/cars/:id` - Детали автомобиля
- `POST /api/cars` - Создание автомобиля
- `PUT /api/cars/:id` - Обновление автомобиля
- `DELETE /api/cars/:id` - Удаление автомобиля

### Сотрудники
- `GET /api/employees` - Список сотрудников
- `GET /api/employees/:id` - Детали сотрудника
- `POST /api/employees` - Создание сотрудника
- `PUT /api/employees/:id` - Обновление сотрудника
- `DELETE /api/employees/:id` - Удаление сотрудника

### Карты
- `GET /api/cards` - Список карт
- `GET /api/cards/:id` - Детали карты
- `POST /api/cards` - Создание карты
- `PUT /api/cards/:id` - Обновление карты
- `DELETE /api/cards/:id` - Удаление карты

### Транзакции
- `GET /api/transactions` - Список транзакций (с фильтрами)
- `GET /api/transactions/:id` - Детали транзакции
- `POST /api/transactions` - Создание транзакции
- `PUT /api/transactions/:id` - Обновление транзакции
- `DELETE /api/transactions/:id` - Удаление транзакции

## Лицензия

MIT
