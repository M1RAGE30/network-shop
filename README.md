# NetworkShop

Веб-приложение для подбора и продажи сетевого оборудования: каталог, корзина, заказы, конструкторы сети и Wi‑Fi, чат поддержки, админ-панель.

**Стек:** React 19, Vite 8, Tailwind CSS 4, TypeScript · Express 5, Prisma 7, MySQL 8, Socket.IO.

## Структура репозитория

| Путь | Назначение |
|------|------------|
| `frontend/` | Витрина (`index.html`, порт 5173) и админка (`admin.html`, порт 5174) |
| `backend/` | REST API, WebSocket, Prisma, `products.json` для seed |
| `docker/` | Конфиг MySQL (`mysql.cnf`) |
| `docker-compose.yml` | Среда разработки (hot-reload) |

## Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (рекомендуется) **или** Node.js 22+, MySQL 8+
- Git

## Docker (разработка)

Конфигурация в `docker-compose.yml` — **среда разработки**: hot-reload исходников, Vite dev-серверы, `prisma db push` при старте backend.

Подробнее: [docker/README.md](docker/README.md).

### Быстрый старт

```bash
git clone <url-репозитория> network-shop-v2
cd network-shop-v2
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up -d --build
```

В `backend/.env` обязательно задайте:

- `JWT_SECRET` — произвольная длинная строка;
- `SMTP_*` — для подтверждения email и сброса пароля;
- `SHOP_URL=http://localhost:5173` — ссылки в письмах (сброс пароля).

В Docker `DATABASE_URL` для backend подставляется из compose (хост `mysql`), значение `localhost:3307` в `.env` нужно только для запуска backend **на хосте**.

При `SEED_ON_START=true` при первом запуске выполняется seed из `backend/products.json` (~500+ товаров, 1–3 мин).

### Сервисы и адреса

| Сервис Compose | Назначение | URL / порт на хосте |
|----------------|------------|---------------------|
| `storefront` | Витрина | http://localhost:5173 |
| `admin-panel` | Администрирование | http://localhost:5174 |
| `backend` | API + WebSocket | http://localhost:3000 |
| `mysql` | MySQL 8.4 | `127.0.0.1:3307` |
| `phpmyadmin` | Управление БД (профиль `tools`) | http://localhost:8081 |

### Учётные данные MySQL (по умолчанию)

| Параметр | Значение |
|----------|----------|
| База | `network_shop` |
| Пользователь приложения | `shopuser` / `shoppassword` |
| Root | `root` / `root` |
| Хост внутри Docker | `mysql:3306` |
| Хост с вашего ПК | `127.0.0.1:3307` |

### Администратор (после seed)

- Email: `admin@networkshop.by`
- Пароль: `Admin123!`

### Команды

```bash
docker compose up -d --build
docker compose logs -f backend
docker compose restart storefront admin-panel
docker compose --profile tools up -d phpmyadmin
docker compose down
docker compose --profile tools down -v --remove-orphans

# из корня репозитория
npm run docker:up
npm run docker:logs
npm run docker:reset
```

После первого успешного seed в `backend/.env` можно поставить `SEED_ON_START=false`, затем `docker compose up -d backend`.

Повторный полный импорт каталога: `FORCE_SEED=true docker compose up -d backend` (см. [docker/README.md](docker/README.md)).

### phpMyAdmin

```bash
docker compose --profile tools up -d phpmyadmin
```

Сервер: `mysql`, пользователь `shopuser`, пароль `shoppassword`.

---

## Локальная разработка без полного Docker

Только MySQL в контейнере:

```bash
docker compose up -d mysql
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

В `.env` для хоста:

```env
DATABASE_URL=mysql://shopuser:shoppassword@localhost:3307/network_shop
```

```bash
npm run db:push
npm run seed
npm run dev
```

API: http://localhost:3000

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev          
npm run dev:admin   
```

`VITE_API_URL` оставьте пустым — запросы идут на `/api` и `/uploads` через прокси Vite (`VITE_PROXY_TARGET` в Docker задаётся в compose).

---

## Переменные окружения

### `backend/.env` (шаблон: `backend/.env.example`)

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | MySQL; на хосте: `localhost:3307`; в Docker переопределяется compose |
| `JWT_SECRET` | Подпись JWT (обязательно сменить) |
| `PORT` | Порт API (по умолчанию `3000`) |
| `CORS_ORIGINS` | Origins витрины и админки через запятую |
| `DB_POOL_SIZE` | Размер пула подключений Prisma |
| `SEED_ON_START` | `true` — seed при старте контейнера backend |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Почта (подтверждение email, сброс пароля) |
| `SHOP_URL` | URL витрины для ссылок в письмах (`http://localhost:5173`) |

В Docker дополнительно (через compose, без правки `.env`): `NODE_ENV=development`, `FORCE_SEED` для принудительного re-seed.

### `frontend/.env` (шаблон: `frontend/.env.example`)

| Переменная | Назначение |
|------------|------------|
| `VITE_API_URL` | Пусто — прокси Vite на backend |
| `VITE_DADATA_API_TOKEN` | Подсказки адреса DaData (опционально) |
| `VITE_SHOP_URL` | URL витрины (ссылки, редиректы) |
| `VITE_ADMIN_URL` | URL админ-панели |

### Переопределение портов Docker

```bash
MYSQL_PORT=3308 BACKEND_PORT=3001 STOREFRONT_PORT=5173 ADMIN_PORT=5174 PHPMYADMIN_PORT=8081 docker compose up -d
```

---

## Production

Сборка без dev-образов:

```bash
cd backend && npm run build && npm start
cd ../frontend && npm run build && npm run build:admin
```

Для production: отдельный хостинг, `NODE_ENV=production`, надёжные секреты, миграции Prisma (или controlled `db push`), раздача статики `frontend/dist` и `frontend/dist-admin` (nginx и т.п.), постоянное хранилище для `backend/uploads`.

---

## Что не попадает в Git

См. `.gitignore`: `node_modules`, сборки, `backend/generated`, `backend/uploads`, локальные `.env`, кэши Vite/ESLint, каталог `assets/` (временные файлы Cursor).