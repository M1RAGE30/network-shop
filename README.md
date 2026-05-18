# NetworkShop v2

Интернет-магазин сетевого оборудования: каталог, корзина, заказы, конструкторы сети и Wi‑Fi, чат поддержки, админ-панель.

Стек: React 19 + Vite 8 + Tailwind 4 (frontend), Express 5 + Prisma 7 + MariaDB (backend).

## Быстрый старт

```bash
cd D:\MAXIM\network-shop-v2
docker compose up -d
```

БД: `localhost:3307`, phpMyAdmin: http://localhost:8081

```bash
cd backend
npm install
cp .env.example .env
```

В `.env`:

```env
DATABASE_URL=mysql://root:root@localhost:3307/network_shop
JWT_SECRET=change-me
PORT=3000
CLIENT_URL=http://localhost:5173
```

```bash
npm run db:generate
npm run db:push
npm run seed
npm run dev
```

```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

Приложение: http://localhost:5173

## Темы

Светлая тема по умолчанию. Переключатель в шапке сохраняет выбор в `localStorage`.

## Отличия от network-shop

- Отдельная папка и Docker-том (`network_shop_db`, порт БД 3307)
- Обновлённая дизайн-система (минимализм, синий акцент)
- Корректная поддержка светлой и тёмной темы на всех экранах

Полное описание страниц и API: `docs/ОПИСАНИЕ_САЙТА.txt`
