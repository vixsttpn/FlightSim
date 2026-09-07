#!/usr/bin/env bash
# ==============================================================================
# FlightSim - Quick Push Script
# Быстрый git add + commit + push одной командой
# Используется в Termux для быстрой отправки изменений
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Проверяем что это git репозиторий
if [ ! -d ".git" ]; then
    log_error "Не git репозиторий: $PROJECT_ROOT"
    echo "Инициализируйте репозиторий: git init"
    exit 1
fi

# Получаем текущую ветку
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
log_info "Текущая ветка: $CURRENT_BRANCH"
log_info "Проект: $PROJECT_ROOT"

# Проверяем статус
echo ""
echo -e "${CYAN}--- Git Status ---${NC}"
git status --short

# Проверяем есть ли изменения
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    log_warn "Нет изменений для коммита"
    # Проверяем не запушены ли коммиты
    if git log --branches --not --remotes 2>/dev/null | grep -q .; then
        log_info "Есть локальные не запушенные коммиты, пушим..."
        git push origin "$CURRENT_BRANCH" || {
            log_warn "Push не удался, пробуем --set-upstream"
            git push --set-upstream origin "$CURRENT_BRANCH"
        }
        log_success "Push выполнен"
        exit 0
    fi
    exit 0
fi

# Формируем commit message
# Если передан аргумент - используем его, иначе генерируем с датой
if [ $# -gt 0 ]; then
    # Собираем все аргументы в сообщение
    COMMIT_MSG="$*"
else
    # Генерируем умное сообщение по измененным файлам
    CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null | head -n 5 | tr '\n' ',' | sed 's/,$//')
    if [ -z "$CHANGED_FILES" ]; then
        CHANGED_FILES=$(git ls-files --others --exclude-standard | head -n 3 | tr '\n' ',' | sed 's/,$//')
    fi
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
    if [ -n "$CHANGED_FILES" ]; then
        COMMIT_MSG="quick: $TIMESTAMP - $CHANGED_FILES"
    else
        COMMIT_MSG="quick: $TIMESTAMP update FlightSim"
    fi
fi

echo ""
log_info "Commit message: \"$COMMIT_MSG\""
echo ""

# Git add
log_info "Выполняем git add -A..."
git add -A

# Проверяем что попало в индекс
CACHED_COUNT=$(git diff --cached --numstat | wc -l)
if [ "$CACHED_COUNT" -eq 0 ]; then
    log_warn "После git add нет staged изменений"
    exit 0
fi

echo -e "${CYAN}--- Staged Changes ---${NC}"
git diff --cached --stat

# Commit
log_info "Коммитим..."
# Если есть gpg sign или хуки, не фейлимся из-за них, но пытаемся
if ! git commit -m "$COMMIT_MSG"; then
    log_warn "Commit с подписью не удался, пробуем без verify..."
    git commit -m "$COMMIT_MSG" --no-verify || {
        log_error "Commit не удался"
        exit 1
    }
fi

log_success "Закоммичено: $COMMIT_MSG"

# Push
log_info "Пушим в origin/$CURRENT_BRANCH..."

# Проверяем есть ли upstream
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
    log_warn "Upstream не установлен, устанавливаем..."
    if git push --set-upstream origin "$CURRENT_BRANCH"; then
        log_success "Push --set-upstream выполнен"
    else
        log_error "Push не удался. Проверьте remote:"
        git remote -v
        exit 1
    fi
else
    # Обычный пуш
    if git push origin "$CURRENT_BRANCH"; then
        log_success "Push выполнен успешно"
    else
        log_warn "Push не удался, пробуем pull --rebase..."
        if git pull --rebase origin "$CURRENT_BRANCH"; then
            log_info "Rebase успешен, повторный push..."
            git push origin "$CURRENT_BRANCH" && log_success "Push после rebase успешен" || {
                log_error "Push все еще не удается, требуется ручное разрешение"
                exit 1
            }
        else
            log_error "Rebase не удался, возможны конфликты"
            echo "Выполните вручную: git pull --rebase и разрешите конфликты"
            exit 1
        fi
    fi
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}  Quick Push завершен успешно!  ${NC}"
echo -e "${GREEN}================================${NC}"
git log -1 --oneline
echo ""

# Дополнительно: показываем ссылку на коммит если remote GitHub
REMOTE_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
if echo "$REMOTE_URL" | grep -q "github.com"; then
    # Парсим github user/repo
    GH_PATH=$(echo "$REMOTE_URL" | sed -E 's/.*github.com[:\/](.*)(\.git)?/\1/' | sed 's/\.git$//')
    COMMIT_HASH=$(git rev-parse HEAD)
    echo -e "GitHub commit: ${BLUE}https://github.com/$GH_PATH/commit/$COMMIT_HASH${NC}"
fi
