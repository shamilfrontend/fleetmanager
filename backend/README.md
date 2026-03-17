# FleetManager Backend

Express API для системы управления автопарком (MongoDB, JWT).

## Запуск

```bash
yarn install
cp .env.example .env
# Заполните .env (MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET)
yarn dev
```

Сервер запустится на `http://localhost:5002`.

## Скрипты

- `yarn dev` — запуск с hot reload (tsx watch)
- `yarn build` — сборка TypeScript в `dist/`
- `yarn start` — запуск из `dist/` (production)
- `yarn lint` / `yarn format` — ESLint и Prettier
- `yarn test` — unit-тесты (Vitest)
- `yarn seed` — заполнение БД тестовыми данными (только для dev, см. README_SEED.md)

## Структура

- `src/config/` — подключение к БД
- `src/controllers/` — обработчики маршрутов
- `src/middleware/` — auth, validate, upload
- `src/models/` — Mongoose-модели
- `src/routes/` — маршруты API
- `src/scripts/` — seed
- `src/validators/` — express-validator
- `src/utils/` — logger, pagination
- `openapi.yaml` — описание API (OpenAPI 3.0)

## Документация API

В режиме разработки (`NODE_ENV !== 'production'`) доступна Swagger UI: `http://localhost:5002/api-docs`.

## Переменные окружения

См. `.env.example`. Обязательные: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. В production задайте `FRONTEND_ORIGIN` для CORS.
