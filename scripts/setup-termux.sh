#!/usr/bin/env bash
# ==============================================================================
# FlightSim - Termux Setup Script
# Скрипт полной настройки окружения Termux для сборки FlightSim Android
# Автор: FlightSim Team / Agent #3
# ==============================================================================

# Прерывать выполнение при любой ошибке
set -e

# Цвета для логов
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Логирование
log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "${CYAN}[STEP]${NC} $1"; }

# Определяем директорию скрипта и проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${CYAN}"
echo "  ______ _  _       _    _   ____  _           "
echo " |  ___|| |(_)     | |  | | / ___|(_) _ __ ___  "
echo " | |_   | || | __ _| |__| | \___ \ | || '_ \` _ \\"
echo " |  _|  | || |/ _\` |  __  |  ___) || || | | | | |"
echo " |_|    |_||_|\__, |_|  |_| |____/ |_||_| |_| |_|"
echo "               __/ |                            "
echo "              |___/   Termux Setup              "
echo -e "${NC}"
echo "Project root: $PROJECT_ROOT"
echo ""

# Проверяем, запущены ли мы в Termux
is_termux() {
    # Проверка наличия Termux специфичных переменных
    [[ -d "/data/data/com.termux" ]] || [[ "$PREFIX" == *"com.termux"* ]]
}

# Функция проверки команды
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Обновление пакетов
log_step "1/7 Обновление пакетов Termux..."
if is_termux; then
    pkg update -y && pkg upgrade -y
    log_success "Пакеты обновлены"
else
    log_warn "Не Termux окружение, пропускаем pkg update"
    if command_exists apt-get; then
        log_info "Обнаружен apt-get, обновляем..."
        sudo apt-get update -y || apt-get update -y || true
    fi
fi

# 2. Установка базовых зависимостей
log_step "2/7 Установка базовых зависимостей..."

if is_termux; then
    # Основной набор для Termux
    PACKAGES=(
        git
        nodejs-lts
        python
        openjdk-17
        termux-tools
        termux-api
        which
        openssl
        wget
        curl
        jq
        zip
        unzip
        build-essential
    )
    
    # Пытаемся установить ImageMagick для генерации иконок
    PACKAGES+=(imagemagick)

    for pkg_name in "${PACKAGES[@]}"; do
        if pkg list-installed | grep -q "^$pkg_name/" 2>/dev/null; then
            log_info "$pkg_name уже установлен"
        else
            log_info "Устанавливаем $pkg_name..."
            pkg install -y "$pkg_name" || log_warn "Не удалось установить $pkg_name"
        fi
    done
else
    # Linux окружение (для тестов)
    log_warn "Linux режим - проверяем зависимости через систему"
    for cmd in git node python3 java; do
        if command_exists $cmd; then
            log_success "$cmd найден: $( $cmd --version 2>&1 | head -n1 )"
        else
            log_warn "$cmd не найден"
        fi
    done
fi

# 3. Настройка хранилища Termux
log_step "3/7 Настройка доступа к хранилищу..."
if is_termux && command_exists termux-setup-storage; then
    # Только запрашиваем, если еще не настроено
    if [ ! -d "$HOME/storage" ]; then
        termux-setup-storage
        log_success "Доступ к хранилищу запрошен"
    else
        log_success "Хранилище уже настроено"
    fi
else
    log_info "termux-setup-storage пропущен (не Termux)"
fi

# 4. Проверка и настройка Java
log_step "4/7 Настройка Java..."
if command_exists java; then
    JAVA_VER=$(java -version 2>&1 | head -n1)
    log_success "Java найдена: $JAVA_VER"
else
    log_warn "Java не найдена, пробуем установить openjdk-17"
    if is_termux; then
        pkg install -y openjdk-17 || true
    fi
fi

# Установка JAVA_HOME для Termux
if is_termux; then
    export JAVA_HOME="$PREFIX/lib/jvm/java-17-openjdk" 2>/dev/null || true
    if [ ! -d "$JAVA_HOME" ]; then
        # Ищем реальный путь
        JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java) 2>/dev/null) 2>/dev/null) 2>/dev/null) || true
    fi
    log_info "JAVA_HOME=$JAVA_HOME"
fi

# 5. Настройка Node.js и npm зависимостей
log_step "5/7 Настройка Node.js окружения..."
if command_exists node; then
    log_success "Node: $(node --version) | NPM: $(npm --version)"
    
    # Проверяем yarn
    if ! command_exists yarn; then
        log_info "Устанавливаем yarn..."
        npm install -g yarn || log_warn "Не удалось установить yarn"
    fi

    # Устанавливаем зависимости проекта, если есть package.json
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        log_info "Найден package.json, устанавливаем зависимости..."
        cd "$PROJECT_ROOT"
        if [ -f "yarn.lock" ]; then
            yarn install || npm install
        else
            npm install
        fi
        cd - >/dev/null
        log_success "npm зависимости установлены"
    else
        log_info "package.json не найден в корне, пропускаем"
    fi
else
    log_warn "Node.js не найден"
fi

# 6. Настройка Android SDK окружения (если возможно)
log_step "6/7 Проверка Android окружения..."
# Создаем local.properties если есть ANDROID_HOME
if [ -n "$ANDROID_HOME" ] || [ -n "$ANDROID_SDK_ROOT" ]; then
    SDK_PATH="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
    log_success "Android SDK найден: $SDK_PATH"
    if [ -f "$PROJECT_ROOT/android/local.properties" ]; then
        log_info "android/local.properties уже существует"
    else
        echo "sdk.dir=$SDK_PATH" > "$PROJECT_ROOT/android/local.properties" 2>/dev/null || true
        log_success "Создан android/local.properties"
    fi
else
    log_info "ANDROID_HOME не установлен (нормально для Termux, будет использоваться gradle wrapper)"
fi

# Проверяем gradlew
if [ -f "$PROJECT_ROOT/android/gradlew" ]; then
    chmod +x "$PROJECT_ROOT/android/gradlew"
    log_success "gradlew помечен как исполняемый"
fi

# 7. Делаем все скрипты исполняемыми
log_step "7/7 Установка прав на выполнение скриптов..."
# Делаем все .sh в scripts/ исполняемыми - логика chmod +x
if [ -d "$SCRIPT_DIR" ]; then
    chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true
    log_success "Права +x установлены для:"
    ls -l "$SCRIPT_DIR"/*.sh | awk '{print "  " $1 " " $9}'
else
    log_warn "Директория скриптов не найдена"
fi

# Дополнительно: делаем исполняемыми другие полезные скрипты
chmod +x "$PROJECT_ROOT/android/gradlew" 2>/dev/null || true

# Проверка окружения в конце
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Проверка окружения FlightSim         ${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Termux: $(is_termux && echo YES || echo NO)"
echo "Git: $(command_exists git && git --version || echo NOT FOUND)"
echo "Node: $(command_exists node && node --version || echo NOT FOUND)"
echo "NPM: $(command_exists npm && npm --version || echo NOT FOUND)"
echo "Java: $(command_exists java && java -version 2>&1 | head -n1 || echo NOT FOUND)"
echo "Python: $(command_exists python && python --version 2>&1 || echo NOT FOUND)"
echo "ImageMagick: $(command_exists magick && echo YES || (command_exists convert && echo YES || echo NO))"
echo ""
log_success "Настройка Termux для FlightSim завершена!"
echo -e "${YELLOW}Следующие шаги:${NC}"
echo "  1. Запустите: ./scripts/generate-icons.sh"
echo "  2. Настройте keystore: ./scripts/decode-keystore.sh"
echo "  3. Соберите проект: cd android && ./gradlew assembleDebug"
echo ""
