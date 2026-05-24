# Docker (среда разработки)

Стек поднимается одной командой из корня репозитория: `docker compose up -d --build`.

| Сервис Compose | Образ | Назначение |
|----------------|-------|------------|
| `mysql` | `mysql:8.4` | База данных |
| `backend` | `networkshop/backend:dev` | REST API и WebSocket |
| `storefront` | `networkshop/frontend:dev` | Витрина (Vite, порт 5173) |
| `admin-panel` | `networkshop/frontend:dev` | Админ-панель (Vite, порт 5174) |
| `phpmyadmin` | `phpmyadmin:5.2` | Профиль `tools`, порт 8081 |

Имена контейнеров формирует Docker Compose: `networkshop-<сервис>-1`.

Том данных: `networkshop_mysql_data`.

## Обновление кода в контейнерах

Папки `frontend/src` и `backend/src` смонтированы в контейнеры — Vite и nodemon обычно подхватывают правки сами (HMR). Достаточно обновить вкладку в браузере; при сомнениях — жёсткое обновление (Ctrl+F5).

Перезапуск только фронта (после правок, если страница «застыла»):

```bash
docker compose restart storefront admin-panel
```

Полная остановка и подъём заново:

```bash
docker compose down
docker compose up -d --build
```

С phpMyAdmin (профиль `tools`):

```bash
docker compose --profile tools down
docker compose --profile tools up -d --build
```

Пересборка нужна, если менялись `package.json`, `Dockerfile` или зависимости — для правок только в `.ts`/`.tsx`/`.css` в `src/` обычно хватает `restart` или даже только обновления страницы.

Порты: основной магазин **5173**, админка **5174**, API **3000**.

Письма (подтверждение email, сброс пароля): в **`backend/.env`** нужны `SMTP_*` и `SHOP_URL=http://localhost:5173` (ссылки ведут на витрину с хоста).

Подсказки адреса (DaData): ключ задаётся в **`frontend/.env`**, не в `backend/.env`:

```env
VITE_DADATA_API_TOKEN=ваш_токен_из_личного_кабинета_dadata
```

После добавления или смены токена перезапустите витрину: `docker compose restart storefront` (или локально — перезапуск `npm run dev`).

### Товары не появляются

Проверьте: `docker compose logs backend --tail 80` — должно быть `Server running on port 3000`, без `app crashed`.

Первый запуск с пустой БД: seed ~1–3 мин (`Imported: 548`). При перезапуске seed **пропускается**, если товары уже есть. Полный re-import: `FORCE_SEED=true docker compose up -d backend`.

Если был `Cannot find module '.prisma/client'`: `docker compose restart backend` (в entrypoint выполняется `prisma generate`).