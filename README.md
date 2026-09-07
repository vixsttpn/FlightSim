# FlightSim ✈️

<img src="https://raw.githubusercontent.com/placeholder/logo.png" alt="FlightSim Logo" width="200" />

**FlightSim** — мобильный авиасимулятор на стеке **Ionic React + TypeScript + Vite + Capacitor**.

Фирменный цвет: `#CC00CC` (пурпурный). Иконка: белый самолет в круге на пурпурном фоне.

> Проект разрабатывается субагентами. Ты — субагент №1, отвечаешь за корень проекта.

## 📂 Структура проекта

```
/mnt/data/FlightSim/
├── public/                 # Статика (создаст субагент 2)
├── src/                    # Исходный код (создадут субагенты 2-10)
│   ├── components/         # UI компоненты
│   ├── pages/              # Страницы
│   ├── services/           # Сервисы / физика полета
│   ├── hooks/              # Кастомные хуки
│   ├── assets/             # Текстуры, звуки
│   ├── App.tsx
│   ├── main.tsx
│   └── ...
├── android/                # Нативный Android проект (генерируется cap)
├── ios/                     # Нативный iOS проект (генерируется cap)
├── capacitor.config.ts
├── vite.config.ts
├── tsconfig.json
├── index.html
└── package.json
```

## 🚀 Быстрый старт (Desktop / Linux / macOS)

```bash
# 1. Клонируй и перейди
cd /mnt/data/FlightSim

# 2. Установи Node 20 (рекомендуется через nvm)
nvm use 20
# или
nvm install 20 && nvm use 20

# 3. Установи зависимости
npm install

# 4. Запусти в браузере (Ionic serve)
npm run dev
# => http://localhost:8100

# 5. Сборка
npm run build

# 6. Синхронизация с Capacitor
npx cap sync

# 7. Android
npx cap add android
npx cap open android
# внутри Android Studio: Run

# 8. iOS (только macOS)
npx cap add ios
npx cap open ios
```

## 📱 Инструкция для Termux (Android разработка на телефоне)

Полноценная сборка APK прямо с телефона!

### Шаг 0: Подготовка Termux

Установи **Termux** из F-Droid (не из Google Play — там старая версия).

Открой Termux и выполни:

```bash
# Обнови пакеты
pkg update -y && pkg upgrade -y

# Установи необходимые инструменты
pkg install -y nodejs-lts git openjdk-17 gradle python make clang pkg-config

# Проверь версии
node -v  # должно быть v20.x
npm -v
java -version # JDK 17
gradle -v
```

### Шаг 1: Клон и установка

```bash
# Если проект в /mnt/data/FlightSim уже скопирован, просто перейди
cd /mnt/data/FlightSim

# Если клонируешь с git:
# git clone <repo-url>
# cd FlightSim

# Используй Node 20 (в Termux по умолчанию lts = 20)
npm install

# Поставь Ionic CLI глобально (опционально)
npm install -g @ionic/cli native-run
```

### Шаг 2: Запуск в браузере Termux

```bash
# Запусти dev сервер
npm run dev -- --host 0.0.0.0

# Узнай IP
ifconfig | grep 192
# Открой в браузере телефона http://<ip>:8100
```

### Шаг 3: Сборка Android APK в Termux

Это главный кейс — собрать APK без ПК.

```bash
# 1. Инициализируй Android платформу (один раз)
npx cap add android

# 2. Собери веб-часть
npm run build

# 3. Синхронизируй
npx cap sync android

# 4. Собери APK через Gradle (без Android Studio)

cd android
chmod +x gradlew

# Debug APK (быстро)
./gradlew assembleDebug

# APK будет тут:
# android/app/build/outputs/apk/debug/app-debug.apk

# Release APK (требует подписи)
# ./gradlew assembleRelease

# Вернись в корень
cd ..

# Установи APK
# termux-open android/app/build/outputs/apk/debug/app-debug.apk
# или cp в папку Downloads
cp android/app/build/outputs/apk/debug/app-debug.apk /storage/emulated/0/Download/FlightSim-debug.apk
```

> **Важно для Termux:** Первый запуск `./gradlew` скачает Gradle Wrapper (~100MB) и зависимости. Нужно стабильное интернет соединение и ~2GB места.

### Шаг 4: Live Reload на устройстве

```bash
# Узнай IP телефона
ip addr | grep wlan0

# Запусти с live reload на девайс (если телефон подключен по USB + adb)
# Или
npm run dev -- --host

# В capacitor.config.ts включи server.url:
# server: { url: 'http://YOUR_IP:8100', cleartext: true }

npx cap run android -l --external
```

### Частые проблемы Termux

| Проблема | Решение |
|----------|---------|
| `EACCES` при npm install | `npm config set cache ~/.npm-cache --global` |
| `gradlew: Permission denied` | `chmod +x android/gradlew` |
| SDK not found | `pkg install android-sdk` или используй `gradle` напрямую, он скачает нужное |
| Не хватает RAM | Закрой другие приложения, `pkg install nodejs-lts` уже оптимизирован |
| Сборка зависает | Подключи зарядку, в Termux: `termux-wake-lock` |

## 🛠 Скрипты

| Команда | Что делает |
|---------|------------|
| `npm run dev` | Запуск dev сервера Vite на 8100 |
| `npm run build` | TypeScript проверка + сборка в dist/ |
| `npm run preview` | Превью собранного проекта |
| `npm run cap:sync` | Синхронизация web -> native |
| `npm run cap:android` | Sync + открыть Android Studio |
| `npm run cap:ios` | Sync + открыть Xcode |

## 📦 Зависимости

- **Ionic React** 8.x - UI фреймворк
- **React** 18.x - ядро
- **React Router** 6.x - навигация
- **Capacitor** 6.x - нативная обертка
- **Vite** 5.x - сборщик
- **TypeScript** 5.x

## 🔐 Лицензия

Proprietary - FlightSim © 2026 All Rights Reserved. См. `LICENSE`.

## 👥 Команда субагентов

- `№1 (ты)` — Корень проекта [DONE]
- №2 — public + assets + иконка
- №3 — src/core / App.tsx
- №4 — src/pages
- №5 — src/components
- №6 — src/services (физика)
- №7 — src/hooks + utils
- №8 — Capacitor нативные фичи
- №9 — Тесты / линтеры / CI
- №10 — Финальная сборка и верификация

Удачного полета! ✈️
