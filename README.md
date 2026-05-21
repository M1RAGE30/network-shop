# NetworkShop v2

Интернет-магазин сетевого оборудования: каталог, корзина, заказы, конструкторы сети и Wi‑Fi, чат поддержки, админ-панель.

Стек: React 19 + Vite 8 + Tailwind 4 (frontend), Express 5 + Prisma 7 + MariaDB (backend).

## Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (рекомендуется) **или** Node.js 22+, MariaDB 11+
- Git

## Учётные данные MariaDB (из `docker-compose.yml`)

Эти значения задаются при первом запуске контейнера `db`. Меняются только если вы правите `docker-compose.yml` или пересоздаёте том (`docker compose down -v`).

| Параметр | Значение |
|----------|----------|
| База данных | `network_shop` |
| Пользователь приложения | `shopuser` |
| Пароль пользователя | `shoppassword` |
| Root-пользователь | `root` |
| Root-пароль | `root` (переменная `MARIADB_ROOT_PASSWORD`, по умолчанию `root`) |
| Порт на вашем ПК | `3307` → внутри контейнера `3306` |
| Имя сервиса в Docker-сети | `db` |

**API в Docker** всегда подключается как `shopuser` к `db:3306` (строка в `docker-compose.yml`, не из `backend/.env`).

**API на хосте** (`npm run dev` в `backend`) — в `backend/.env` укажите `localhost:3307`. Подойдут оба варианта (если compose не меняли):

```env
DATABASE_URL=mysql://shopuser:shoppassword@localhost:3307/network_shop
```

или

```env
DATABASE_URL=mysql://root:root@localhost:3307/network_shop
```

В `backend/.env.example` указан вариант с `shopuser` — он совпадает с пользователем API в Docker.

---

## Запуск на новом компьютере (Docker)

```bash
git clone <url-репозитория> network-shop-v2
cd network-shop-v2
cp backend/.env.example backend/.env
docker compose up -d --build
```

Отредактируйте `backend/.env`: `JWT_SECRET`, `SMTP_*`.  
Для фронтенда при необходимости: `cp frontend/.env.example frontend/.env`.

Первый запуск занимает несколько минут: образы, `prisma db push`, при `SEED_ON_START=true` в `backend/.env` — seed из `backend/products.json`.

### Адреса

| Сервис | URL |
|--------|-----|
| Магазин | http://localhost:5173 |
| Админ-панель | http://localhost:5174 |
| API | http://localhost:3000 |
| MariaDB с хоста | `127.0.0.1:3307`, база `network_shop` |

### Админ сайта (после seed)

- Email: `admin@networkshop.by`
- Пароль: `Admin123!`

### После первого успешного запуска

В `backend/.env`:

```env
SEED_ON_START=false
```

Затем: `docker compose up -d api`.

### Полезные команды

```bash
docker compose logs -f
docker compose logs -f api
docker compose down
docker compose down -v
npm run docker:up
```

### phpMyAdmin (опционально)

```bash
docker compose --profile tools up -d phpmyadmin
```

Откройте в браузере: **http://localhost:8081**

В `docker-compose.yml` для phpMyAdmin задано:

| Переменная | Значение |
|------------|----------|
| `PMA_HOST` | `db` (имя сервиса MariaDB в Docker, не `localhost`) |
| `PMA_USER` | `shopuser` |
| `PMA_PASSWORD` | `shoppassword` |

Обычно вход выполняется **автоматически** под `shopuser`. Если появится форма входа:

- **Сервер:** `db`
- **Пользователь:** `shopuser`
- **Пароль:** `shoppassword`

Полный доступ (root): пользователь `root`, пароль `root` — только если вы не меняли `MARIADB_ROOT_PASSWORD` в compose.

С хоста (DBeaver, HeidiSQL и т.п.): хост `127.0.0.1`, порт `3307`, база `network_shop`, логин/пароль — `shopuser` / `shoppassword` или `root` / `root`.

---

## Локальная разработка (только БД в Docker)

```bash
docker compose up -d db
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
```

Пример `backend/.env` (подключение с хоста к контейнеру `db`):

```env
DATABASE_URL=mysql://shopuser:shoppassword@localhost:3307/network_shop
JWT_SECRET=change-me
PORT=3000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
SEED_ON_START=false
```

```bash
npm run db:push
npm run seed
npm run dev
```

`SEED_ON_START` влияет только на контейнер `api` в Docker, не на `npm run dev`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Админка (второй терминал):

```bash
npm run dev:admin
```

Для dev удобнее **пустой** `VITE_API_URL` — запросы идут на `/api` через прокси Vite.  
Если задан `VITE_API_URL=http://localhost:3000`, axios ходит на API напрямую (тоже работает при запущенном backend).

---

## Переменные окружения

### `backend/.env`

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | Для `npm run dev` на хосте: `localhost:3307`. В Docker API использует `shopuser@db:3306` из compose |
| `JWT_SECRET` | Подпись JWT |
| `PORT` | Порт API (3000) |
| `CORS_ORIGINS` | Origins фронтенда через запятую |
| `DB_POOL_SIZE` | Пул соединений (по умолчанию 10) |
| `SEED_ON_START` | `true` — seed при старте контейнера `api`; после первого запуска — `false` |
| `SMTP_*` | Почта для кода подтверждения email |

### `frontend/.env`

| Переменная | По умолчанию в example | Назначение |
|------------|------------------------|------------|
| `VITE_API_URL` | пусто | Пусто — прокси `/api`; иначе полный URL API |
| `VITE_DADATA_API_TOKEN` | пусто | Подсказки адресов (опционально) |
| `VITE_SHOP_URL` | http://localhost:5173 | URL магазина |
| `VITE_ADMIN_URL` | http://localhost:5174 | URL админки |

### Порты Docker без корневого `.env`

В `docker-compose.yml` уже задано: БД `3307`, API `3000`, магазин `5173`, админ `5174`, phpMyAdmin `8081`.  
Переопределение из shell, например: `MYSQL_PORT=3308 docker compose up -d db`.

---

## Сборка для production

```bash
cd backend && npm run build && npm start
cd ../frontend && npm run build && npm run build:admin
```

`NODE_ENV=production`, надёжный `JWT_SECRET`, реальные `SMTP_*` и `DATABASE_URL`. Rate limit на API только в production.

---

## Сервисы Docker

- **db** — MariaDB 11, том `mysql_data`
- **api** — Express + Prisma, `backend/.env` + фиксированный `DATABASE_URL` для сети Docker
- **shop** — Vite, порт 5173
- **admin** — Vite, порт 5174
- **phpmyadmin** — профиль `tools`, порт 8081

---

## Темы

Светлая тема по умолчанию. Переключатель в шапке — `localStorage`.

Подробнее: `docs/ОПИСАНИЕ_САЙТА.txt`
