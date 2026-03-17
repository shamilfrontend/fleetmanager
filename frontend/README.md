# FleetManager Frontend

Vue 3 SPA для системы управления автопарком.

## Запуск

```bash
yarn install
yarn dev
```

Приложение откроется на `http://localhost:3000`. В режиме разработки запросы к `/api` проксируются на backend (порт 5002).

## Скрипты

- `yarn dev` — dev-сервер с hot reload
- `yarn build` — production-сборка (требуется `VITE_API_URL` в окружении)
- `yarn preview` — просмотр production-сборки
- `yarn lint` / `yarn lint:fix` — ESLint
- `yarn format` / `yarn format:check` — Prettier
- `yarn test` — unit-тесты (Vitest)

## Структура

- `src/api/` — клиенты API (axios, auth, cars, employees, cards, transactions, maintenance)
- `src/components/` — Vue-компоненты (common, dashboard)
- `src/layouts/` — AuthLayout, DefaultLayout
- `src/pages/` — страницы приложения
- `src/router/` — Vue Router
- `src/stores/` — Pinia (auth, cars, employees, toast)
- `src/types/` — реэкспорт типов из `@fleetmanager/types`
- `src/utils/` — утилиты, валидация, экспорт

## Переменные окружения

- `VITE_API_URL` — базовый URL API. В production **обязателен** (сборка падает без него).
