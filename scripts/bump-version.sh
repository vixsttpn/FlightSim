#!/usr/bin/env bash
# ==============================================================================
# FlightSim - Bump Version Script
# Повышение версии проекта (major/minor/patch)
# Обновляет: package.json, app.json, android/app/build.gradle, version.properties
# ==============================================================================

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

# Аргумент: major | minor | patch (по умолчанию patch)
BUMP_TYPE="${1:-patch}"

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
    log_error "Неверный тип: $BUMP_TYPE. Используйте: major|minor|patch"
    echo "Пример: ./scripts/bump-version.sh patch"
    exit 1
fi

log_info "Тип повышения: $BUMP_TYPE"
echo ""

# Функция парсинга semver
parse_version() {
    local ver="$1"
    # Убираем v префикс если есть
    ver=$(echo "$ver" | sed 's/^v//')
    IFS='.' read -r MAJOR MINOR PATCH <<< "$ver"
    echo "$MAJOR $MINOR $PATCH"
}

# Функция инкремента
bump_version() {
    local current="$1"
    local type="$2"
    read -r MAJOR MINOR PATCH <<< $(parse_version "$current")
    
    # Дефолты если парсинг не удался
    MAJOR=${MAJOR:-0}
    MINOR=${MINOR:-0}
    PATCH=${PATCH:-0}

    # Убираем суффиксы типа -beta, +build
    MAJOR=$(echo "$MAJOR" | grep -oE '[0-9]+' | head -1)
    MINOR=$(echo "$MINOR" | grep -oE '[0-9]+' | head -1)
    PATCH=$(echo "$PATCH" | grep -oE '[0-9]+' | head -1)

    case "$type" in
        major)
            MAJOR=$((MAJOR + 1))
            MINOR=0
            PATCH=0
            ;;
        minor)
            MINOR=$((MINOR + 1))
            PATCH=0
            ;;
        patch)
            PATCH=$((PATCH + 1))
            ;;
    esac

    echo "${MAJOR}.${MINOR}.${PATCH}"
}

# Функция для получения versionCode из версии (простой алгоритм)
version_to_code() {
    local ver="$1"
    read -r MAJOR MINOR PATCH <<< $(parse_version "$ver")
    # Формула: major*10000 + minor*100 + patch
    # Ограничиваем до int
    echo $((MAJOR * 10000 + MINOR * 100 + PATCH))
}

# 1. Определяем текущую версию из разных источников
CURRENT_VERSION=""

# Приоритет: package.json > app.json > build.gradle > version.properties > 0.1.0
if [ -f "$PROJECT_ROOT/package.json" ]; then
    if command -v node >/dev/null 2>&1; then
        CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
    else
        # Fallback через grep/jq
        if command -v jq >/dev/null 2>&1; then
            CURRENT_VERSION=$(jq -r '.version' "$PROJECT_ROOT/package.json" 2>/dev/null || echo "")
        else
            CURRENT_VERSION=$(grep -oE '"version": "[0-9]+\.[0-9]+\.[0-9]+' "$PROJECT_ROOT/package.json" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        fi
    fi
    log_info "Версия из package.json: $CURRENT_VERSION"
fi

if [ -z "$CURRENT_VERSION" ] && [ -f "$PROJECT_ROOT/app.json" ]; then
    if command -v jq >/dev/null 2>&1; then
        CURRENT_VERSION=$(jq -r '.expo.version // .version' "$PROJECT_ROOT/app.json" 2>/dev/null || echo "")
    fi
    [ -n "$CURRENT_VERSION" ] && [ "$CURRENT_VERSION" != "null" ] && log_info "Версия из app.json: $CURRENT_VERSION" || CURRENT_VERSION=""
fi

if [ -z "$CURRENT_VERSION" ]; then
    # Ищем в android/app/build.gradle
    BUILD_GRADLE_PATHS=(
        "$PROJECT_ROOT/android/app/build.gradle"
        "$PROJECT_ROOT/android/app/build.gradle.kts"
        "$PROJECT_ROOT/app/build.gradle"
    )
    for bg in "${BUILD_GRADLE_PATHS[@]}"; do
        if [ -f "$bg" ]; then
            # Ищем versionName "x.y.z"
            VER_FROM_GRADLE=$(grep -E 'versionName' "$bg" | grep -oE '"[0-9]+\.[0-9]+\.[0-9]+' | tr -d '"' | head -1)
            if [ -z "$VER_FROM_GRADLE" ]; then
                VER_FROM_GRADLE=$(grep -E 'versionName' "$bg" | grep -oE "'[0-9]+\.[0-9]+\.[0-9]+'" | tr -d "'" | head -1)
            fi
            if [ -n "$VER_FROM_GRADLE" ]; then
                CURRENT_VERSION="$VER_FROM_GRADLE"
                log_info "Версия из build.gradle: $CURRENT_VERSION ($bg)"
                break
            fi
        fi
    done
fi

if [ -z "$CURRENT_VERSION" ] && [ -f "$PROJECT_ROOT/version.properties" ]; then
    CURRENT_VERSION=$(grep -E '^VERSION_NAME' "$PROJECT_ROOT/version.properties" | cut -d'=' -f2 | tr -d ' ' | tr -d '"' | tr -d "'" | head -1)
    [ -n "$CURRENT_VERSION" ] && log_info "Версия из version.properties: $CURRENT_VERSION"
fi

if [ -z "$CURRENT_VERSION" ] || [ "$CURRENT_VERSION" == "null" ]; then
    CURRENT_VERSION="0.1.0"
    log_warn "Текущая версия не найдена, используем $CURRENT_VERSION"
fi

# Вычисляем новую версию
NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$BUMP_TYPE")
NEW_VERSION_CODE=$(version_to_code "$NEW_VERSION")

log_step "Повышение версии: $CURRENT_VERSION -> $NEW_VERSION (code $NEW_VERSION_CODE)"
echo ""

# Подтверждение если интерактивный терминал
if [ -t 0 ]; then
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Отменено пользователем"
        exit 0
    fi
fi

UPDATED_FILES=()

# 2. Обновляем package.json
if [ -f "$PROJECT_ROOT/package.json" ]; then
    log_step "Обновляем package.json..."
    if command -v node >/dev/null 2>&1; then
        # Используем node для безопасного обновления JSON
        node << EOF
const fs = require('fs');
const path = require('path');
const pkgPath = path.join('$PROJECT_ROOT', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Updated package.json');
EOF
    else
        # Fallback sed
        sed -i.bak -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+\"/\"version\": \"$NEW_VERSION\"/" "$PROJECT_ROOT/package.json"
        rm -f "$PROJECT_ROOT/package.json.bak"
    fi
    UPDATED_FILES+=("package.json")
    log_success "package.json -> $NEW_VERSION"
fi

# 3. Обновляем app.json (Expo)
if [ -f "$PROJECT_ROOT/app.json" ]; then
    log_step "Обновляем app.json..."
    if command -v node >/dev/null 2>&1; then
        node << EOF
const fs = require('fs');
const pkgPath = '$PROJECT_ROOT/app.json';
let data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (data.expo && data.expo.version) {
    data.expo.version = '$NEW_VERSION';
    // Также обновляем android.versionCode если есть
    if (data.expo.android) {
        data.expo.android.versionCode = $NEW_VERSION_CODE;
    }
    if (data.expo.ios) {
        data.expo.ios.buildNumber = '$NEW_VERSION';
    }
} else if (data.version) {
    data.version = '$NEW_VERSION';
}
fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2) + '\n');
EOF
    else
        # sed fallback
        if command -v jq >/dev/null 2>&1; then
            jq --arg ver "$NEW_VERSION" --argjson code "$NEW_VERSION_CODE" '.expo.version = $ver | .expo.android.versionCode = $code' "$PROJECT_ROOT/app.json" > /tmp/app.json.tmp && mv /tmp/app.json.tmp "$PROJECT_ROOT/app.json"
        fi
    fi
    UPDATED_FILES+=("app.json")
    log_success "app.json -> $NEW_VERSION"
fi

# 4. Обновляем android/app/build.gradle
for BUILD_GRADLE in "$PROJECT_ROOT/android/app/build.gradle" "$PROJECT_ROOT/android/app/build.gradle.kts"; do
    if [ -f "$BUILD_GRADLE" ]; then
        log_step "Обновляем $BUILD_GRADLE..."
        
        # Сохраняем бэкап
        cp "$BUILD_GRADLE" "$BUILD_GRADLE.bak"
        
        # Обновляем versionName
        # Поддерживаем оба формата: versionName "1.0.0" и versionName = "1.0.0"
        sed -i -E "s/(versionName[[:space:]]*=?[[:space:]]*\")[0-9]+\.[0-9]+\.[0-9]+(\")/\1$NEW_VERSION\2/" "$BUILD_GRADLE"
        sed -i -E "s/(versionName[[:space:]]*=?[[:space:]]*')[0-9]+\.[0-9]+\.[0-9]+(')/\1$NEW_VERSION\2/" "$BUILD_GRADLE"
        
        # Обновляем versionCode - ищем число и увеличиваем
        # Читаем текущий versionCode
        CURRENT_CODE=$(grep -E 'versionCode' "$BUILD_GRADLE" | grep -oE '[0-9]+' | head -1 || echo "0")
        if [ -n "$CURRENT_CODE" ]; then
            # Если CURRENT_CODE меньше нового, используем новый
            if [ "$CURRENT_CODE" -lt "$NEW_VERSION_CODE" ]; then
                sed -i -E "s/(versionCode[[:space:]]*=?[[:space:]]*)[0-9]+/\1$NEW_VERSION_CODE/" "$BUILD_GRADLE"
                log_info "versionCode: $CURRENT_CODE -> $NEW_VERSION_CODE"
            else
                # Просто +1
                NEXT_CODE=$((CURRENT_CODE + 1))
                sed -i -E "s/(versionCode[[:space:]]*=?[[:space:]]*)[0-9]+/\1$NEXT_CODE/" "$BUILD_GRADLE"
                log_info "versionCode: $CURRENT_CODE -> $NEXT_CODE (increment)"
                NEW_VERSION_CODE=$NEXT_CODE
            fi
        fi

        rm -f "$BUILD_GRADLE.bak"
        UPDATED_FILES+=("$(basename $BUILD_GRADLE)")
        log_success "build.gradle -> $NEW_VERSION / $NEW_VERSION_CODE"
    fi
done

# 5. Обновляем version.properties (если есть)
VERSION_PROPS="$PROJECT_ROOT/version.properties"
if [ -f "$VERSION_PROPS" ] || [ -f "$PROJECT_ROOT/android/version.properties" ]; then
    for vp in "$VERSION_PROPS" "$PROJECT_ROOT/android/version.properties"; do
        if [ -f "$vp" ]; then
            log_step "Обновляем $vp..."
            # Создаем если нет VERSION_NAME
            if grep -q "VERSION_NAME" "$vp"; then
                sed -i.bak -E "s/^VERSION_NAME.*=.*/VERSION_NAME=$NEW_VERSION/" "$vp"
            else
                echo "VERSION_NAME=$NEW_VERSION" >> "$vp"
            fi
            if grep -q "VERSION_CODE" "$vp"; then
                sed -i.bak -E "s/^VERSION_CODE.*=.*/VERSION_CODE=$NEW_VERSION_CODE/" "$vp"
            else
                echo "VERSION_CODE=$NEW_VERSION_CODE" >> "$vp"
            fi
            rm -f "$vp.bak"
            UPDATED_FILES+=("$(basename $vp)")
            log_success "$vp обновлен"
        fi
    done
else
    # Создаем новый version.properties в корне если ничего нет
    log_info "Создаем $VERSION_PROPS..."
    echo "# FlightSim Version" > "$VERSION_PROPS"
    echo "VERSION_NAME=$NEW_VERSION" >> "$VERSION_PROPS"
    echo "VERSION_CODE=$NEW_VERSION_CODE" >> "$VERSION_PROPS"
    echo "BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$VERSION_PROPS"
    UPDATED_FILES+=("version.properties (new)")
fi

# 6. Обновляем android/local.properties или другие файлы если нужно
# Дополнительно: записываем в файл VERSION в корне
echo "$NEW_VERSION" > "$PROJECT_ROOT/VERSION" 2>/dev/null || true
echo "$NEW_VERSION_CODE" > "$PROJECT_ROOT/VERSION_CODE" 2>/dev/null || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Версия успешно повышена!              ${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Старая: $CURRENT_VERSION"
echo "Новая:  $NEW_VERSION"
echo "Code:   $NEW_VERSION_CODE"
echo "Тип:    $BUMP_TYPE"
echo ""
echo "Обновленные файлы:"
for f in "${UPDATED_FILES[@]}"; do
    echo "  - $f"
done
echo ""

# 7. Предлагаем git commit если репозиторий
if [ -d "$PROJECT_ROOT/.git" ]; then
    if [ -t 0 ]; then
        echo -e "${YELLOW}Создать git commit для новой версии?${NC}"
        read -p "(y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "$PROJECT_ROOT"
            git add "${UPDATED_FILES[@]}" VERSION VERSION_CODE 2>/dev/null || git add -A
            git commit -m "chore: bump version to $NEW_VERSION ($NEW_VERSION_CODE) [$BUMP_TYPE]" || log_warn "Commit не удался"
            # Создаем тег
            git tag -a "v$NEW_VERSION" -m "Version $NEW_VERSION" 2>/dev/null && log_success "Тег v$NEW_VERSION создан" || log_warn "Тег уже существует"
            log_success "Git commit создан"
        fi
    else
        log_info "Неинтерактивный режим, пропускаем git commit"
    fi
fi

log_success "Готово! FlightSim v$NEW_VERSION"
