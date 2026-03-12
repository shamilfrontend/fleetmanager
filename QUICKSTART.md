# Быстрый старт FleetManager

## Предварительные требования

1. Установите Node.js (версия 18 или выше)
2. Установите MongoDB (локально или используйте MongoDB Atlas)
3. Установите Yarn (или используйте npm)

## Установка

### 1. Backend

```bash
cd backend
yarn install
cp .env.example .env
# Отредактируйте .env файл с вашими настройками
yarn dev
```

Backend будет доступен на `http://localhost:5002`

### 2. Frontend

В новом терминале:

```bash
cd frontend
yarn install
yarn dev
```

Frontend будет доступен на `http://localhost:3000`

## Первый запуск

1. Убедитесь, что MongoDB запущен
2. Запустите backend сервер
3. Запустите frontend сервер
4. Откройте браузер и перейдите на `http://localhost:3000`
5. Для первого входа создайте пользователя через API:

```bash
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "role": "admin"
  }'
```

Затем войдите в систему используя эти учетные данные.

## Структура проекта

- `frontend/` - Vue 3 приложение
- `backend/` - Express API сервер
- `README.md` - Полная документация

## Переменные окружения

### Backend (.env)

```
PORT=5002
MONGODB_URI=mongodb://localhost:27017/fleetmanager
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
NODE_ENV=development
```

### Frontend (.env - опционально)

```
VITE_API_URL=http://localhost:5002/api
```
