# Bellissimo Lingerie — Инструкция по развёртыванию

## Что это
Интернет-магазин нижнего белья на Next.js + Supabase.
- Быстрая загрузка (фото на CDN, не в коде)
- Админ-панель на /admin — заказчик сам добавляет товары
- Деплой на Vercel (бесплатно)

---

## Шаг 1 — Создай аккаунт Supabase (бесплатно)

1. Зайди на https://supabase.com и зарегистрируйся
2. Создай новый проект (можно назвать bellissimo)
3. Запомни: **Project URL** и **anon public key** (Settings → API)

---

## Шаг 2 — Настрой базу данных

1. В Supabase открой **SQL Editor**
2. Скопируй содержимое файла `supabase-schema.sql`
3. Нажми **Run** — создастся таблица products

---

## Шаг 3 — Создай хранилище фотографий

1. В Supabase открой **Storage**
2. Нажми **New Bucket**
3. Имя: `products`
4. Поставь галочку **Public bucket**
5. Нажми **Create**

---

## Шаг 4 — Задеплой на Vercel

1. Зайди на https://vercel.com и зарегистрируйся через GitHub
2. Загрузи папку проекта на GitHub
3. В Vercel нажми **Add New Project** → выбери репозиторий
4. В **Environment Variables** добавь:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://твой_проект.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = твой_anon_key
   NEXT_PUBLIC_ADMIN_PASSWORD = bellissimo2025
   ```
5. Нажми **Deploy**

---

## Шаг 5 — Добавь домен (опционально)

1. Купи домен на reg.ru (~300 руб/год)
2. В Vercel → Settings → Domains → добавь домен
3. Следуй инструкциям Vercel для настройки DNS
4. SSL подключится автоматически (бесплатно)

---

## Как заказчик добавляет товары

1. Зайти на сайт.ru**/admin**
2. Ввести пароль (по умолчанию: bellissimo2025)
3. Нажать **➕ Добавить товар**
4. Загрузить фото (до 5 штук), заполнить название, цену, размеры
5. Нажать **✅ Добавить товар**
6. Товар появится на сайте мгновенно

Чтобы скрыть товар — нажать 🙈 Скрыть (не удаляет, просто убирает с сайта).

---

## Структура проекта

```
bellissimo/
├── pages/
│   ├── index.js          — главная страница
│   └── admin/
│       └── index.js      — панель управления
├── lib/
│   └── supabase.js       — подключение к базе данных
├── styles/
│   └── Home.module.css   — стили
├── .env.example          — пример переменных окружения
├── supabase-schema.sql   — SQL для настройки базы данных
└── package.json
```

---

## Как изменить пароль администратора

В Vercel → Settings → Environment Variables → измени `NEXT_PUBLIC_ADMIN_PASSWORD`
