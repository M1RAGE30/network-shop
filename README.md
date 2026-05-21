# NetworkShop v2

Интернет-магазин сетевого оборудования: каталог, корзина, заказы, конструкторы сети и Wi‑Fi, чат поддержки, админ-панель.

Стек: React 19 + Vite 8 + Tailwind 4 (frontend), Express 5 + Prisma 7 + MariaDB (backend).

## Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (рекомендуется) **или** Node.js 22+, MariaDB 11+
- Git

## Запуск на новом компьютере (Docker, рекомендуется)

Все сервисы (БД, API, магазин, админка) поднимаются одной командой.

```bash
git clone <url-репозитория> network-shop-v2
cd network-shop-v2
cp .env.example .env
docker compose up -d --build
```

Первый запуск занимает несколько минут: скачиваются образы, применяется схема БД, выполняется seed с товарами из `backend/products.json`.

### Адреса

| Сервис | URL |
|--------|-----|
| Магазин | http://localhost:5173 |
| Админ-панель | http://localhost:5174 |
| API | http://localhost:3000 |
| MariaDB (с хоста) | `localhost:3307` |

### Учётная запись администратора (после seed)

- Email: `admin@networkshop.by`
- Пароль: `Admin123!`

### После первого успешного запуска

В файле `.env` в корне проекта установите:

```env
SEED_ON_START=false
```

И перезапустите API: `docker compose up -d api`. Иначе при каждом старте контейнера seed будет выполняться заново (долго).

### Полезные команды

```bash
docker compose logs -f          # логи всех сервисов
docker compose logs -f api      # только API
docker compose down             # остановить
docker compose down -v          # остановить и удалить данные БД
npm run docker:up               # то же, что docker compose up -d --build
```

### phpMyAdmin (опционально)

```bash
docker compose --profile tools up -d phpmyadmin
```

Откроется http://localhost:8081 (хост `db`, пользователь `shopuser`, пароль `shoppassword`).

---

## Локальная разработка без Docker (только БД в Docker)

Если удобнее запускать Node на хосте, а в контейнере держать только MariaDB:

```bash
docker compose up -d db
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

В `backend/.env` для локального API:

```env
DATABASE_URL=mysql://shopuser:shoppassword@localhost:3307/network_shop
JWT_SECRET=change-me
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
```

```bash
npm run db:push
npm run seed
npm run dev
```

### Frontend (два терминала)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Во втором терминале — админка:

```bash
npm run dev:admin
```

`VITE_API_URL` в `.env` можно оставить пустым: запросы идут на `/api` через прокси Vite.

---

## Переменные окружения

### Корень (`.env` для Docker Compose)

| Переменная | По умолчанию | Назначение |
|------------|--------------|------------|
| `JWT_SECRET` | `dev-change-me` | Подпись JWT |
| `MYSQL_ROOT_PASSWORD` | `root` | Пароль root MariaDB |
| `MYSQL_PORT` | `3307` | Порт БД на хосте |
| `API_PORT` | `3000` | Порт API на хосте |
| `SEED_ON_START` | `true` | Запуск seed при старте API-контейнера |
| `CORS_ORIGINS` | localhost:5173,5174 | Разрешённые origin через запятую |

### Backend (`backend/.env`)

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | Строка подключения MySQL/MariaDB |
| `JWT_SECRET` | Секрет JWT |
| `PORT` | Порт API (3000) |
| `CORS_ORIGINS` | CORS для фронтенда |
| `DB_POOL_SIZE` | Размер пула соединений (10) |
| `SMTP_*` | Почта для верификации email |

### Frontend (`frontend/.env`)

| Переменная | Назначение |
|------------|------------|
| `VITE_API_URL` | Базовый URL API; пусто = прокси `/api` |
| `VITE_DADATA_API_TOKEN` | Подсказки адресов (опционально) |
| `VITE_SHOP_URL` | URL магазина |
| `VITE_ADMIN_URL` | URL админки |

---

## Сборка для production

```bash
cd backend && npm run build && npm start
cd ../frontend && npm run build && npm run build:admin
```

Для production задайте `NODE_ENV=production`, надёжный `JWT_SECRET`, реальные `SMTP_*` и `DATABASE_URL`. Rate limit на API включается только при `NODE_ENV=production`.

---

## Структура Docker-сервисов

- **db** — MariaDB 11 с томом данных и настройками InnoDB
- **api** — Express + Prisma (миграция схемы и seed при старте)
- **shop** — Vite dev-сервер магазина (порт 5173)
- **admin** — Vite dev-сервер админки (порт 5174)
- **phpmyadmin** — профиль `tools`, по желанию

---

## Темы

Светлая тема по умолчанию. Переключатель в шапке сохраняет выбор в `localStorage`.

Подробное описание страниц и API: `docs/ОПИСАНИЕ_САЙТА.txt`
