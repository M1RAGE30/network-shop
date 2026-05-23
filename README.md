# NetworkShop

Веб-приложение для подбора и продажи сетевого оборудования: каталог, корзина, заказы, конструкторы сети и Wi‑Fi, чат поддержки, админ-панель.

**Стек:** React 19, Vite 8, Tailwind CSS 4, TypeScript · Express 5, Prisma 7, MySQL 8, Socket.IO.

## Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (рекомендуется) **или** Node.js 22+, MySQL 8+
- Git

## Docker (разработка)

Конфигурация в `docker-compose.yml` — **среда разработки**: hot-reload исходников, Vite dev-серверы, автоматический `prisma db push` при старте backend.

Подробнее о сервисах: [docker/README.md](docker/README.md).

### Быстрый старт

```bash
git clone <url-репозитория> network-shop-v2
cd network-shop-v2
cp backend/.env.example backend/.env
docker compose up -d --build
```

В `backend/.env` задайте `JWT_SECRET` и `SMTP_*`.  
Фронтенд при необходимости: `cp frontend/.env.example frontend/.env`.

При `SEED_ON_START=true` в `backend/.env` при первом запуске выполняется seed (`backend/products.json`).

### Сервисы и адреса

| Сервис Compose | Назначение | URL / порт на хосте |
|----------------|------------|---------------------|
| `storefront` | Витрина | http://localhost:5173 |
| `admin-panel` | Администрирование | http://localhost:5174 |
| `backend` | API | http://localhost:3000 |
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

Backend в Docker подключается к `mysql` по переменным из compose (не по `localhost` из `backend/.env`).

### Администратор (после seed)

- Email: `admin@networkshop.by`
- Пароль: `Admin123!`

### Команды

```bash
docker compose up -d --build
docker compose logs -f backend
docker compose --profile tools up -d phpmyadmin
docker compose down
docker compose --profile tools down -v --remove-orphans
npm run docker:up
npm run docker:reset
```

После первого успешного запуска в `backend/.env`: `SEED_ON_START=false`, затем `docker compose up -d backend`.

### phpMyAdmin

```bash
docker compose --profile tools up -d phpmyadmin
```

Сервер: `mysql`, пользователь `shopuser`, пароль `shoppassword`.

---

## Локальная разработка без полного Docker

Только база в контейнере:

```bash
docker compose up -d mysql
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

```env
DATABASE_URL=mysql://shopuser:shoppassword@localhost:3307/network_shop
```

```bash
npm run db:push
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
npm run dev:admin
```

`VITE_API_URL` оставьте пустым — запросы идут на `/api` через прокси Vite.

---

## Переменные окружения

### `backend/.env`

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | Для запуска на хосте: `localhost:3307` |
| `JWT_SECRET` | Подпись JWT |
| `CORS_ORIGINS` | Origins витрины и админки |
| `SEED_ON_START` | Seed при старте контейнера `backend` |
| `SMTP_*` | Почта для подтверждения email |

### `frontend/.env`

| Переменная | Назначение |
|------------|------------|
| `VITE_API_URL` | Пусто — прокси `/api` |
| `VITE_DADATA_API_TOKEN` | DaData (опционально) |
| `VITE_SHOP_URL` / `VITE_ADMIN_URL` | URL витрины и админки |

### Переопределение портов Docker (опционально)

Без корневого `.env` — из командной строки:

```bash
MYSQL_PORT=3308 BACKEND_PORT=3001 docker compose up -d
```

---

## Production

Сборка без Docker dev-образов:

```bash
cd backend && npm run build && npm start
cd ../frontend && npm run build && npm run build:admin
```

Для production: отдельный хостинг, `NODE_ENV=production`, надёжные секреты, миграции Prisma, статическая раздача frontend (nginx и т.п.).

---

## Документация

- Аннотация к диплому: [docs/ANNOTACIYA.md](docs/ANNOTACIYA.md)
- Описание функционала: [docs/ОПИСАНИЕ_САЙТА.txt](docs/ОПИСАНИЕ_САЙТА.txt)
