#!/usr/bin/env bash
# ==============================================================================
# FlightSim - Decode Keystore Script
# Декодирует keystore из base64 переменной окружения для сборки Release
# Поддерживает: .env файлы, переменные окружения, файлы base64
# ==============================================================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "${CYAN}[STEP]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Параметры по умолчанию
# Аргумент 1: путь к base64 файлу или base64 строке
# Аргумент 2: выходной путь keystore
DEFAULT_KEYSTORE_OUTPUTS=(
    "$PROJECT_ROOT/android/app/release.jks"
    "$PROJECT_ROOT/android/app/upload-keystore.jks"
    "$PROJECT_ROOT/android/release.jks"
    "$PROJECT_ROOT/app/release.keystore"
    "$PROJECT_ROOT/release.jks"
)

# Определяем выходной путь
if [ -n "$2" ]; then
    OUTPUT_PATH="$2"
else
    # Ищем существующий build.gradle чтобы понять куда класть
    OUTPUT_PATH="${DEFAULT_KEYSTORE_OUTPUTS[0]}"
    # Если есть переменная окружения KEYSTORE_PATH - используем ее
    if [ -n "$KEYSTORE_PATH" ]; then
        OUTPUT_PATH="$KEYSTORE_PATH"
    fi
fi

log_info "Проект: $PROJECT_ROOT"
log_info "Выходной keystore: $OUTPUT_PATH"

# Функция для декодирования base64 кроссплатформенно
decode_base64() {
    local input_file="$1"
    local output_file="$2"
    
    # Пробуем разные варианты base64 команд
    if base64 --help 2>&1 | grep -q "\-d"; then
        # GNU coreutils
        base64 -d "$input_file" > "$output_file"
    elif base64 --help 2>&1 | grep -q "\-D"; then
        # macOS/BSD
        base64 -D -i "$input_file" -o "$output_file" 2>/dev/null || base64 --decode "$input_file" > "$output_file"
    else
        # Fallback через openssl
        openssl base64 -d -in "$input_file" -out "$output_file"
    fi
}

# Функция поиска base64 данных
find_keystore_base64() {
    local b64_data=""

    # 1. Аргумент 1 как файл
    if [ -n "$1" ] && [ -f "$1" ]; then
        log_info "Используем base64 файл из аргумента: $1"
        cat "$1"
        return 0
    fi

    # 2. Аргумент 1 как сама base64 строка (длинная)
    if [ -n "$1" ] && [ ${#1} -gt 50 ]; then
        # Проверяем что это похоже на base64
        if echo "$1" | grep -qE '^[A-Za-z0-9+/=]+$'; then
            log_info "Используем base64 строку из аргумента"
            echo "$1"
            return 0
        fi
    fi

    # 3. Переменные окружения (приоритет)
    ENV_VARS=(
        "KEYSTORE_BASE64"
        "ANDROID_KEYSTORE_BASE64"
        "RELEASE_KEYSTORE_BASE64"
        "UPLOAD_KEYSTORE_BASE64"
        "EXPO_ANDROID_KEYSTORE_BASE64"
        "FLIGHTSIM_KEYSTORE_BASE64"
    )

    for var_name in "${ENV_VARS[@]}"; do
        val="${!var_name:-}"
        # Минимальный порог 20 символов чтобы тест с маленьким keystore тоже работал
        if [ -n "$val" ] && [ ${#val} -gt 20 ]; then
            log_success "Найдена переменная: $var_name (${#val} chars)"
            echo "$val"
            return 0
        fi
    done

    # 4. Поиск в .env файлах
    ENV_FILES=(
        "$PROJECT_ROOT/.env"
        "$PROJECT_ROOT/.env.local"
        "$PROJECT_ROOT/android/.env"
        "$PROJECT_ROOT/.env.production"
    )

    for env_file in "${ENV_FILES[@]}"; do
        if [ -f "$env_file" ]; then
            log_info "Проверяем $env_file..."
            # Ищем строку с KEYSTORE_BASE64
            for var_name in "${ENV_VARS[@]}"; do
                found=$(grep -E "^${var_name}=" "$env_file" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | head -1 || echo "")
                if [ -n "$found" ] && [ ${#found} -gt 20 ]; then
                    log_success "Найдено в $env_file: $var_name"
                    echo "$found"
                    return 0
                fi
            done
        fi
    done

    # 5. Проверяем файлы keystore.base64, release.jks.base64 и т.п.
    B64_FILE_CANDIDATES=(
        "$PROJECT_ROOT/android/app/release.jks.base64"
        "$PROJECT_ROOT/android/release.jks.base64"
        "$PROJECT_ROOT/release.jks.base64"
        "$PROJECT_ROOT/keystore.base64"
        "$PROJECT_ROOT/android/keystore.base64"
        "/tmp/keystore.base64"
    )

    for f in "${B64_FILE_CANDIDATES[@]}"; do
        if [ -f "$f" ] && [ $(wc -c < "$f") -gt 100 ]; then
            log_success "Найден base64 файл: $f"
            cat "$f"
            return 0
        fi
    done

    return 1
}

# Главный процесс
log_step "1/4 Поиск keystore base64 данных..."

# Временный файл для base64
TMP_B64="/tmp/flightsim_keystore_$$.b64"
TMP_OUT="/tmp/flightsim_keystore_$$.jks"

# Пытаемся найти base64
if B64_CONTENT=$(find_keystore_base64 "$1"); then
    echo "$B64_CONTENT" > "$TMP_B64"
    log_success "Base64 данные найдены (${#B64_CONTENT} символов)"
else
    log_error "Keystore base64 не найден!"
    echo ""
    echo "Где скрипт ищет:"
    echo "  - Аргумент 1: файл или строка base64"
    echo "  - Переменные окружения: KEYSTORE_BASE64, ANDROID_KEYSTORE_BASE64, RELEASE_KEYSTORE_BASE64"
    echo "  - Файлы .env с этими переменными"
    echo "  - Файлы: android/app/release.jks.base64, keystore.base64"
    echo ""
    echo "Пример использования:"
    echo "  export KEYSTORE_BASE64=\$(base64 -w0 /path/to/original.jks)"
    echo "  ./scripts/decode-keystore.sh"
    echo ""
    echo "  ./scripts/decode-keystore.sh /path/to/keystore.b64"
    echo "  ./scripts/decode-keystore.sh /path/to/keystore.b64 /custom/output.jks"
    echo ""
    # Проверяем может keystore уже существует
    if [ -f "$OUTPUT_PATH" ]; then
        log_warn "Но keystore уже существует: $OUTPUT_PATH"
        ls -lh "$OUTPUT_PATH"
        rm -f "$TMP_B64" "$TMP_OUT"
        exit 0
    fi
    rm -f "$TMP_B64" "$TMP_OUT"
    exit 1
fi

# 2. Декодируем
log_step "2/4 Декодирование base64 -> jks..."

mkdir -p "$(dirname "$OUTPUT_PATH")"
mkdir -p "$(dirname "$TMP_OUT")"

if decode_base64 "$TMP_B64" "$TMP_OUT"; then
    log_success "Декодирование выполнено во временный файл"
else
    log_error "Ошибка декодирования base64"
    echo "Проверьте что данные корректные base64"
    # Показываем первые 100 символов для отладки
    head -c 100 "$TMP_B64"
    echo ""
    rm -f "$TMP_B64" "$TMP_OUT"
    exit 1
fi

# Проверяем что файл не пустой и похож на jks/keystore
if [ ! -s "$TMP_OUT" ]; then
    log_error "Декодированный файл пустой!"
    rm -f "$TMP_B64" "$TMP_OUT"
    exit 1
fi

FILE_SIZE=$(wc -c < "$TMP_OUT")
log_info "Размер декодированного файла: $FILE_SIZE bytes"

# Проверка что это Java keystore (начинается с магических байтов)
# JKS обычно начинается с FEEDFEED, PKCS12 с 30 82
if command -v xxd >/dev/null 2>&1; then
    MAGIC=$(xxd -l 4 -p "$TMP_OUT" | head -1)
    log_info "Magic bytes: $MAGIC (ожидается feedfeed для JKS или 3082 для PKCS12)"
fi

# Перемещаем в финальное место
mv "$TMP_OUT" "$OUTPUT_PATH"
chmod 600 "$OUTPUT_PATH"
log_success "Keystore сохранен: $OUTPUT_PATH"
ls -lh "$OUTPUT_PATH"

rm -f "$TMP_B64"

# 3. Создаем keystore.properties для Gradle
log_step "3/4 Создание keystore.properties..."

# Ищем пароли в env или .env
find_env_value() {
    local key="$1"
    local val="${!key:-}"
    if [ -n "$val" ]; then
        echo "$val"
        return 0
    fi
    # Ищем в .env
    for ef in "$PROJECT_ROOT/.env" "$PROJECT_ROOT/.env.local" "$PROJECT_ROOT/android/.env"; do
        if [ -f "$ef" ]; then
            v=$(grep -E "^${key}=" "$ef" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | head -1)
            if [ -n "$v" ]; then
                echo "$v"
                return 0
            fi
        fi
    done
    echo ""
}

STORE_PASSWORD=$(find_env_value "KEYSTORE_PASSWORD")
KEY_ALIAS=$(find_env_value "KEY_ALIAS")
KEY_PASSWORD=$(find_env_value "KEY_PASSWORD")

# Дефолты если не найдены
STORE_PASSWORD=${STORE_PASSWORD:-$(find_env_value "ANDROID_KEYSTORE_PASSWORD")}
KEY_ALIAS=${KEY_ALIAS:-$(find_env_value "ANDROID_KEY_ALIAS")}
KEY_PASSWORD=${KEY_PASSWORD:-$(find_env_value "ANDROID_KEY_PASSWORD")}

# Если все еще пусто, ставим заглушки с предупреждением
if [ -z "$STORE_PASSWORD" ]; then
    STORE_PASSWORD="android"
    log_warn "KEYSTORE_PASSWORD не найден, используется дефолт: android (замените в keystore.properties)"
fi
if [ -z "$KEY_ALIAS" ]; then
    KEY_ALIAS="upload"
    log_warn "KEY_ALIAS не найден, используется дефолт: upload"
fi
if [ -z "$KEY_PASSWORD" ]; then
    KEY_PASSWORD="$STORE_PASSWORD"
    log_warn "KEY_PASSWORD не найден, используется тот же что и storePassword"
fi

# Определяем куда сохранять properties
PROPERTIES_CANDIDATES=(
    "$PROJECT_ROOT/android/keystore.properties"
    "$PROJECT_ROOT/android/app/keystore.properties"
    "$PROJECT_ROOT/keystore.properties"
)

# Выбираем первый существующий или первый из списка
KEYSTORE_PROPS="${PROPERTIES_CANDIDATES[0]}"
for p in "${PROPERTIES_CANDIDATES[@]}"; do
    if [ -f "$p" ]; then
        KEYSTORE_PROPS="$p"
        break
    fi
done

# Если аргумент 3 передан как путь к properties - используем его
if [ -n "$3" ]; then
    KEYSTORE_PROPS="$3"
fi

mkdir -p "$(dirname "$KEYSTORE_PROPS")"

cat > "$KEYSTORE_PROPS" <<EOF
# FlightSim Keystore Properties
# Сгенерировано автоматически скриптом decode-keystore.sh
# Дата: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# НЕ коммитьте этот файл с реальными паролями если он в публичном репо!

storeFile=$(basename "$OUTPUT_PATH")
storeFileAbsolute=$OUTPUT_PATH
storePassword=$STORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
# Для совместимости с разными проектами
MYAPP_RELEASE_STORE_FILE=$(basename "$OUTPUT_PATH")
MYAPP_RELEASE_KEY_ALIAS=$KEY_ALIAS
MYAPP_RELEASE_STORE_PASSWORD=$STORE_PASSWORD
MYAPP_RELEASE_KEY_PASSWORD=$KEY_PASSWORD
EOF

chmod 600 "$KEYSTORE_PROPS"
log_success "Создан $KEYSTORE_PROPS:"
cat "$KEYSTORE_PROPS" | sed 's/Password=.*/Password=****/'  # Скрываем пароли в выводе

# Также создаем копию для android/app/ если нужно и основной файл в android/
if [[ "$KEYSTORE_PROPS" == *"android/keystore.properties"* ]]; then
    APP_PROPS="$PROJECT_ROOT/android/app/keystore.properties"
    if [ ! -f "$APP_PROPS" ]; then
        cp "$KEYSTORE_PROPS" "$APP_PROPS" 2>/dev/null || true
        log_info "Скопировано также в $APP_PROPS"
    fi
fi

# 4. Проверка keystore через keytool если доступен
log_step "4/4 Проверка keystore..."

if command -v keytool >/dev/null 2>&1; then
    log_info "Проверяем keystore через keytool..."
    if keytool -list -keystore "$OUTPUT_PATH" -storepass "$STORE_PASSWORD" >/dev/null 2>&1; then
        log_success "Keystore валиден, содержимое:"
        keytool -list -keystore "$OUTPUT_PATH" -storepass "$STORE_PASSWORD" 2>&1 | head -n 20 || true
    else
        log_warn "keytool не смог прочитать keystore с паролем '$STORE_PASSWORD'. Проверьте пароль или тип keystore"
        echo "Пробуем без пароля или с другим типом..."
        keytool -list -keystore "$OUTPUT_PATH" 2>&1 | head -n 20 || true
    fi
else
    log_warn "keytool не найден, пропускаем проверку (установите openjdk)"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Keystore успешно декодирован!         ${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Keystore: $OUTPUT_PATH ($FILE_SIZE bytes)"
echo "Properties: $KEYSTORE_PROPS"
echo "Alias: $KEY_ALIAS"
echo ""
echo -e "${YELLOW}Далее для сборки:${NC}"
echo "  cd android && ./gradlew assembleRelease"
echo "  или"
echo "  ./gradlew bundleRelease"
echo ""
echo -e "${BLUE}Для безопасности:${NC} chmod 600 на оба файла уже установлен"
echo ""

# Удаляем временные файлы
rm -f "$TMP_B64" "$TMP_OUT" /tmp/keystore.properties.tmp 2>/dev/null || true

log_success "Готово!"
