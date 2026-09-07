#!/usr/bin/env bash
# ==============================================================================
# FlightSim - Generate Icons Script
# Генерация всех Android иконок из исходного изображения
# Использует ImageMagick (magick/convert) или Python PIL как fallback
# ==============================================================================

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

# Директории
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Возможные пути к результирующим ресурсам
# Поддержка разных структур: React Native, Expo, Flutter, etc
POSSIBLE_RES_ROOTS=(
    "$PROJECT_ROOT/android/app/src/main/res"
    "$PROJECT_ROOT/app/src/main/res"
    "$PROJECT_ROOT/src/main/res"
    "$PROJECT_ROOT/android/src/main/res"
    "$PROJECT_ROOT/res"
)

# Найти корень ресурсов
RES_ROOT=""
for p in "${POSSIBLE_RES_ROOTS[@]}"; do
    if [ -d "$p" ]; then
        RES_ROOT="$p"
        break
    fi
done

# Если не нашли, создаем стандартный путь
if [ -z "$RES_ROOT" ]; then
    RES_ROOT="$PROJECT_ROOT/android/app/src/main/res"
    log_warn "Папка res не найдена, будет создана: $RES_ROOT"
    mkdir -p "$RES_ROOT"
fi

log_info "Res root: $RES_ROOT"
log_info "Project root: $PROJECT_ROOT"

# Определить исходную иконку
# Приоритет: аргумент командной строки > env var > стандартные пути > создать заглушку
DEFAULT_SOURCES=(
    "$PROJECT_ROOT/assets/icon.png"
    "$PROJECT_ROOT/assets/images/icon.png"
    "$PROJECT_ROOT/assets/images/icon-512.png"
    "$PROJECT_ROOT/icon.png"
    "$PROJECT_ROOT/app-icon.png"
    "$PROJECT_ROOT/src/assets/icon.png"
    "$PROJECT_ROOT/public/icon.png"
    "$PROJECT_ROOT/android/app/src/main/ic_launcher-web.png"
)

SOURCE_ICON="${1:-""}"

# Если аргумент не передан, проверяем env var
if [ -z "$SOURCE_ICON" ] && [ -n "$ICON_SOURCE" ]; then
    SOURCE_ICON="$ICON_SOURCE"
fi

# Если все еще пусто, ищем в стандартных местах
if [ -z "$SOURCE_ICON" ]; then
    for candidate in "${DEFAULT_SOURCES[@]}"; do
        if [ -f "$candidate" ]; then
            SOURCE_ICON="$candidate"
            log_info "Найдена исходная иконка: $candidate"
            break
        fi
    done
fi

# Если иконка не найдена, пытаемся создать базовую из цвета бренда
# Бренд цвет FlightSim: #D500AA (magenta) с самолетом (эмулируем через ImageMagick)
if [ -z "$SOURCE_ICON" ] || [ ! -f "$SOURCE_ICON" ]; then
    log_warn "Исходная иконка не найдена, создаем временную заглушку..."
    TEMP_SOURCE="$PROJECT_ROOT/assets/icon-1024-temp.png"
    mkdir -p "$(dirname "$TEMP_SOURCE")"
    
    # Пробуем создать через ImageMagick
    if command -v magick >/dev/null 2>&1; then
        magick -size 1024x1024 xc:"#D500AA" -fill white -gravity center -pointsize 600 -annotate +0+0 "✈" "$TEMP_SOURCE" 2>/dev/null || \
        magick -size 1024x1024 xc:"#D500AA" "$TEMP_SOURCE"
        SOURCE_ICON="$TEMP_SOURCE"
        log_info "Создана заглушка через magick: $SOURCE_ICON"
    elif command -v convert >/dev/null 2>&1; then
        convert -size 1024x1024 xc:"#D500AA" "$TEMP_SOURCE"
        SOURCE_ICON="$TEMP_SOURCE"
        log_info "Создана заглушка через convert: $SOURCE_ICON"
    elif command -v python3 >/dev/null 2>&1; then
        python3 << 'PYEOF'
from PIL import Image
import os
path = os.path.join(os.getcwd(), "assets/icon-1024-temp.png") if os.path.exists("assets") else "/tmp/icon-1024-temp.png"
# fallback to project root detection via env
import pathlib
project_root = pathlib.Path(__file__).parent.parent if '__file__' in globals() else pathlib.Path.cwd()
# Try absolute
for p in [project_root / "assets/icon-1024-temp.png", pathlib.Path("/mnt/data/FlightSim/assets/icon-1024-temp.png"), pathlib.Path("/tmp/icon-1024-temp.png")]:
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        img = Image.new("RGB", (1024, 1024), "#D500AA")
        img.save(p, "PNG")
        print(f"Created {p}")
        break
    except Exception as e:
        print(e)
PYEOF
        # Find created file
        for c in "$PROJECT_ROOT/assets/icon-1024-temp.png /mnt/data/FlightSim/assets/icon-1024-temp.png /tmp/icon-1024-temp.png"; do
            if [ -f "$c" ]; then SOURCE_ICON="$c"; break; fi
        done
    else
        log_error "Не найден способ создать иконку. Укажите путь: ./generate-icons.sh /path/to/icon.png"
        exit 1
    fi
fi

if [ ! -f "$SOURCE_ICON" ]; then
    log_error "Source icon не найден: $SOURCE_ICON"
    exit 1
fi

log_success "Используется исходник: $SOURCE_ICON"
log_info "Размер исходника: $(wc -c < "$SOURCE_ICON") bytes"

# Размеры иконок Android (mipmap)
# Стандарт Android launcher icons
declare -A ICON_SIZES
ICON_SIZES["mipmap-mdpi"]=48
ICON_SIZES["mipmap-hdpi"]=72
ICON_SIZES["mipmap-xhdpi"]=96
ICON_SIZES["mipmap-xxhdpi"]=144
ICON_SIZES["mipmap-xxxhdpi"]=192

# Дополнительные размеры
PLAY_STORE_SIZE=512
WEB_SIZES=(192 512)
ADAPTIVE_FOREGROUND_SIZE=432
ADAPTIVE_BACKGROUND_SIZE=432

# Определяем способ ресайза
RESIZE_CMD=""

if command -v magick >/dev/null 2>&1; then
    RESIZE_CMD="magick"
    log_success "Используется ImageMagick (magick)"
elif command -v convert >/dev/null 2>&1; then
    RESIZE_CMD="convert"
    log_success "Используется ImageMagick (convert)"
elif command -v python3 >/dev/null 2>&1 && python3 -c "from PIL import Image" 2>/dev/null; then
    RESIZE_CMD="python3"
    log_success "Используется Python PIL (fallback)"
else
    log_warn "ImageMagick и PIL не найдены, будет выполнено простое копирование (без ресайза)"
    RESIZE_CMD="copy"
fi

# Функция ресайза одной иконки
# Аргументы: input, output, size
generate_icon() {
    local input="$1"
    local output="$2"
    local size="$3"
    
    mkdir -p "$(dirname "$output")"

    case "$RESIZE_CMD" in
        magick)
            magick "$input" -resize "${size}x${size}" -background none -gravity center -extent "${size}x${size}" "$output"
            ;;
        convert)
            convert "$input" -resize "${size}x${size}" -background none -gravity center -extent "${size}x${size}" "$output"
            ;;
        python3)
            python3 << EOF
from PIL import Image
import sys
inp = r"$input"
out = r"$output"
size = $size
try:
    img = Image.open(inp).convert("RGBA")
    # Resize with high quality
    img = img.resize((size, size), Image.LANCZOS)
    # Ensure output dir
    import os
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out, "PNG")
except Exception as e:
    print(f"Failed to resize {inp} -> {out}: {e}")
    sys.exit(1)
EOF
            ;;
        copy)
            cp "$input" "$output"
            ;;
    esac
    
    if [ -f "$output" ]; then
        echo -e "  ${GREEN}✓${NC} $(basename $(dirname "$output"))/ $(basename "$output") -> ${size}x${size}"
    else
        log_error "Не удалось создать $output"
        return 1
    fi
}

log_info "Генерация mipmap иконок..."

# Генерируем основные launcher иконки
for folder in "${!ICON_SIZES[@]}"; do
    size=${ICON_SIZES[$folder]}
    # Обычная иконка
    generate_icon "$SOURCE_ICON" "$RES_ROOT/$folder/ic_launcher.png" "$size"
    # Круглая иконка (используем то же изображение, Android обрежет)
    generate_icon "$SOURCE_ICON" "$RES_ROOT/$folder/ic_launcher_round.png" "$size"
done

# Генерируем Play Store иконку 512x512 в корень проекта
log_info "Генерация Play Store иконок..."
generate_icon "$SOURCE_ICON" "$PROJECT_ROOT/play-store-icon-512.png" "$PLAY_STORE_SIZE"
generate_icon "$SOURCE_ICON" "$PROJECT_ROOT/assets/icon-512.png" "$PLAY_STORE_SIZE" || true

# Генерируем web иконки если есть папка public или assets
if [ -d "$PROJECT_ROOT/public" ]; then
    for sz in "${WEB_SIZES[@]}"; do
        generate_icon "$SOURCE_ICON" "$PROJECT_ROOT/public/icon-${sz}x${sz}.png" "$sz" || true
    done
fi

# Генерация adaptive icons (если проект использует adaptive)
# Структура: mipmap-xxxhdpi/ic_launcher_foreground.png и background
log_info "Генерация adaptive icons (foreground/background)..."
for folder in "${!ICON_SIZES[@]}"; do
    # Только для xhdpi и выше генерим foreground 432 обычно, но для простоты ресайзим под папку
    # Стандарт adaptive: 108dp * density, но file 432 для xxxhdpi
    size=${ICON_SIZES[$folder]}
    # Если это xxxhdpi, нужен 432, иначе пропорционально
    if [ "$folder" == "mipmap-xxxhdpi" ]; then
        generate_icon "$SOURCE_ICON" "$RES_ROOT/$folder/ic_launcher_foreground.png" "$ADAPTIVE_FOREGROUND_SIZE" || true
    else
        # Для остальных генерим тот же size
        generate_icon "$SOURCE_ICON" "$RES_ROOT/$folder/ic_launcher_foreground.png" "$size" || true
    fi
done

# Если есть отдельный background (часто однотонный), создаем magenta background для adaptive
# Проверяем наличие background файла, если нет - создаем цветной
ADAPTIVE_BG_COLOR="#D500AA"
BG_TMP="/tmp/flightsim_bg_1024.png"
if [ "$RESIZE_CMD" == "magick" ]; then
    magick -size 1024x1024 xc:"$ADAPTIVE_BG_COLOR" "$BG_TMP" 2>/dev/null || true
elif [ "$RESIZE_CMD" == "convert" ]; then
    convert -size 1024x1024 xc:"$ADAPTIVE_BG_COLOR" "$BG_TMP" 2>/dev/null || true
fi

if [ -f "$BG_TMP" ]; then
    for folder in "${!ICON_SIZES[@]}"; do
        size=${ICON_SIZES[$folder]}
        target="$RES_ROOT/$folder/ic_launcher_background.png"
        if [ ! -f "$target" ]; then
            generate_icon "$BG_TMP" "$target" "$size" || true
        fi
    done
    rm -f "$BG_TMP"
fi

# Дополнительно: копируем в app/src/main/res если android/app/src/main/res пусто
# и наоборот для универсальности

log_success "Генерация иконок завершена!"
echo ""
echo "Сгенерированы:"
ls -lh "$RES_ROOT"/mipmap-*/ic_launcher.png 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
log_info "Также проверьте:"
echo "  - $PROJECT_ROOT/play-store-icon-512.png"
echo "  - $RES_ROOT/mipmap-*/ic_launcher_round.png"
echo ""

# Делаем иконки доступными (не нужны +x, но для порядка выставим 644)
chmod 644 "$RES_ROOT"/mipmap-*/*.png 2>/dev/null || true

# Проверка - выводим список
echo -e "${GREEN}Готово! Иконки для FlightSim сгенерированы.${NC}"
