/**
 * Design Tokens - Spacing
 * Система отступов на основе 4px базовой единицы
 * Используется для margin, padding, gap
 */

// Базовая единица 4px
const BASE = 4;

export const spacing = {
  // Числовые токены
  0: '0px',
  px: '1px',
  0.5: `${BASE * 0.5}px`, // 2px
  1: `${BASE * 1}px`, // 4px
  1.5: `${BASE * 1.5}px`, // 6px
  2: `${BASE * 2}px`, // 8px
  2.5: `${BASE * 2.5}px`, // 10px
  3: `${BASE * 3}px`, // 12px
  3.5: `${BASE * 3.5}px`, // 14px
  4: `${BASE * 4}px`, // 16px
  5: `${BASE * 5}px`, // 20px
  6: `${BASE * 6}px`, // 24px
  7: `${BASE * 7}px`, // 28px
  8: `${BASE * 8}px`, // 32px
  9: `${BASE * 9}px`, // 36px
  10: `${BASE * 10}px`, // 40px
  11: `${BASE * 11}px`, // 44px
  12: `${BASE * 12}px`, // 48px
  14: `${BASE * 14}px`, // 56px
  16: `${BASE * 16}px`, // 64px
  20: `${BASE * 20}px`, // 80px
  24: `${BASE * 24}px`, // 96px
  28: `${BASE * 28}px`, // 112px
  32: `${BASE * 32}px`, // 128px

  // Семантические алиасы для удобства
  none: '0px',
  '3xs': `${BASE * 0.5}px`, // 2px - микроотступы
  '2xs': `${BASE * 1}px`, // 4px
  xs: `${BASE * 2}px`, // 8px - минимальный осмысленный
  sm: `${BASE * 3}px`, // 12px
  md: `${BASE * 4}px`, // 16px - базовый
  lg: `${BASE * 6}px`, // 24px
  xl: `${BASE * 8}px`, // 32px
  '2xl': `${BASE * 12}px`, // 48px
  '3xl': `${BASE * 16}px`, // 64px
  '4xl': `${BASE * 24}px`, // 96px
} as const;

// Отступы для конкретных компонентов
export const componentSpacing = {
  // Карточки
  card: {
    padding: spacing[4], // 16px
    paddingLg: spacing[6], // 24px
    gap: spacing[4],
    gapSm: spacing[2],
  },
  // Кнопки
  button: {
    paddingX: spacing[4],
    paddingYSm: spacing[2],
    paddingYMd: spacing[2.5],
    paddingYLg: spacing[3],
    gap: spacing[2],
  },
  // Формы
  input: {
    paddingX: spacing[3],
    paddingY: spacing[2.5],
    gap: spacing[1.5],
  },
  // Сайдбар / панели
  panel: {
    padding: spacing[4],
    gap: spacing[6],
    sectionGap: spacing[8],
  },
  // Навбар
  navbar: {
    height: spacing[14], // 56px
    paddingX: spacing[4],
    gap: spacing[6],
  },
  // Модалки
  modal: {
    padding: spacing[6],
    gap: spacing[4],
  },
} as const;

// Контейнерные размеры для layout
export const layout = {
  maxWidth: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  },
  sidebar: {
    collapsed: '64px',
    default: '280px',
    wide: '360px',
  },
  header: {
    height: '56px',
  },
} as const;

export type Spacing = typeof spacing;
export type ComponentSpacing = typeof componentSpacing;

export default spacing;
