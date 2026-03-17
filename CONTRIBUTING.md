# Руководство по внесению изменений

Спасибо за интерес к проекту FleetManager. Ниже — как запускать проверки и добавлять новый функционал.

## Проверки перед коммитом

1. **Линт**
   - Frontend: `cd frontend && yarn lint`
   - Backend: `cd backend && yarn lint`

2. **Тесты**
   - Frontend: `cd frontend && yarn test`
   - Backend: `cd backend && yarn test --run`

3. **Сборка**
   - Frontend: `cd frontend && VITE_API_URL=https://api.example.com/api yarn build`
   - Backend: `cd backend && yarn build`

В CI (GitHub Actions) при push/PR в `main` или `master` автоматически выполняются lint, тесты и сборка для frontend и backend.

## Форматирование

- В корне проекта: `.editorconfig`, `.prettierrc`.
- Frontend: `yarn format`, `yarn format:check`
- Backend: `yarn format`, `yarn format:check`

## Добавление нового API endpoint

1. **Валидация** — добавьте правила в соответствующий файл в `backend/src/validators/` (например, `carValidators.ts`).
2. **Контроллер** — добавьте обработчик в `backend/src/controllers/` и обрабатывайте ошибки в едином формате: `{ message: string, errors?: [...] }`.
3. **Маршрут** — зарегистрируйте в `backend/src/routes/`, подключите `authenticate` и при необходимости `authorize('admin', 'manager')`, затем `validate(...)` и контроллер.
4. **OpenAPI** — обновите `backend/openapi.yaml`, описав новый путь и схемы.

## Коммиты

Предпочтительно осмысленные сообщения коммитов на русском или английском языке, например: «Добавлен фильтр транзакций по дате», «Исправлена валидация номера карты».
