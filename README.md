# AI Lead Hunter v2.0

Веб-приложение для поиска потенциальных клиентов, ведения базы лидов, синхронизации с Google Sheets, AI-генерации сообщений и аудита сайтов.

## Стек

- React 19 + TypeScript + Vite 6
- Tailwind CSS + shadcn/ui
- Zustand + LocalStorage
- Google Sheets API (OAuth 2.0)
- OpenAI API (gpt-4o-mini)

## Быстрый старт

```bash
npm install
cp .env.example .env
npm run dev
```

Откройте `http://localhost:5173`

## Настройка интеграций

### OpenAI (AI-сообщения и аудит)

1. Получите API Key на [platform.openai.com](https://platform.openai.com)
2. **Настройки → OpenAI** → вставьте ключ `sk-...`

### Google Sheets

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com)
2. Включите **Google Sheets API**
3. Создайте **OAuth 2.0 Client ID** (тип: Web application)
4. Authorized JavaScript origins: `http://localhost:5173` (+ ваш production URL)
5. Скопируйте Client ID в `.env`:

```env
VITE_GOOGLE_CLIENT_ID=ваш-client-id.apps.googleusercontent.com
```

6. В приложении: **Настройки → Google Sheets → Подключить Google → Создать таблицу → Синхронизировать**

## MVP 2.0 — реализовано

- **Google Sheets**: OAuth, создание таблицы, двусторонняя синхронизация, импорт/экспорт
- **Карточка лида**: вкладки Обзор / История / Комментарии, полноэкранный режим `/leads/:id`
- **AI Message Generator**: персональные сообщения на основе проблем лида
- **AI Site Audit**: анализ URL (формы, WhatsApp, онлайн-запись, дизайн, CTA) + AI-рекомендации
- **Что можно улучшить**: чеклист проблем и рекомендации

## Сборка и публикация

```bash
npm run build
npm run preview
```

### Vercel

```bash
npm i -g vercel
vercel
```

Добавьте env-переменные `VITE_GOOGLE_CLIENT_ID` в настройках проекта Vercel.

### Netlify

```bash
npm run build
# dist/ — publish directory
```

## Структура

```
src/
├── services/
│   ├── integrations/   # Google OAuth + Sheets sync
│   ├── ai/             # OpenAI message generator
│   └── audit/          # Site analyzer
├── components/leads/   # LeadDetailView, comments, activity
└── features/           # hooks для leads, sheets
```

## Безопасность

- API-ключи хранятся в LocalStorage (MVP без backend)
- Для production рекомендуется server-side proxy для OpenAI
- Не коммитьте `.env` с реальными ключами

## Roadmap MVP 3.0

- Backend + PostgreSQL
- Auth, billing, multi-user
- Gmail / Telegram интеграции
