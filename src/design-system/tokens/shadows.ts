/**
 * Design Tokens - Shadows
 * Тени для темной темы #0F172A
 * В темной теме тени более мягкие и с цветным оттенком бренда #CB00B6
 */

export const shadows = {
  // Базовые тени - без цвета (нейтральные)
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',

  // Inner тени (вдавленные элементы)
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.4)',
  innerLg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.5)',

  // Брендовые тени с акцентом #CB00B6
  brand: {
    sm: '0 1px 3px 0 rgba(203, 0, 182, 0.2), 0 1px 2px -1px rgba(203, 0, 182, 0.2)',
    md: '0 4px 12px 0 rgba(203, 0, 182, 0.25)',
    lg: '0 8px 24px 0 rgba(203, 0, 182, 0.3)',
    xl: '0 16px 40px 0 rgba(203, 0, 182, 0.35)',
    glow: '0 0 20px 0 rgba(203, 0, 182, 0.4), 0 0 40px 0 rgba(203, 0, 182, 0.2)',
    glowStrong: '0 0 30px 0 rgba(203, 0, 182, 0.6), 0 0 60px 0 rgba(203, 0, 182, 0.3)',
  },

  // Семантические тени для компонентов
  card: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)',
  cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)',
  cardElevated: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',

  // Для карты и overlay
  map: {
    control: '0 2px 8px 0 rgba(0, 0, 0, 0.5)',
    tooltip: '0 8px 16px 0 rgba(0, 0, 0, 0.6)',
    aircraftSelected: '0 0 0 4px rgba(203, 0, 182, 0.3), 0 4px 12px 0 rgba(0,0,0,0.5)',
  },

  // Focus ring тени
  focus: {
    default: '0 0 0 3px rgba(203, 0, 182, 0.4)',
    error: '0 0 0 3px rgba(239, 68, 68, 0.4)',
    success: '0 0 0 3px rgba(16, 185, 129, 0.4)',
  },

  // Модалки и поповеры
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
  popover: '0 10px 30px -5px rgba(0, 0, 0, 0.7)',
  dropdown: '0 10px 20px -5px rgba(0, 0, 0, 0.6), 0 4px 10px -4px rgba(0, 0, 0, 0.5)',

  // Верхняя панель / навбар
  navbar: '0 1px 3px 0 rgba(0,0,0,0.5), 0 1px 2px -1px rgba(0,0,0,0.5)',
} as const;

// Комбинированные тени (тень + свечение)
export const combinedShadows = {
  cardWithBrandGlow: `${shadows.card}, ${shadows.brand.sm}`,
  selectedAircraft: shadows.map.aircraftSelected,
};

export type Shadows = typeof shadows;

export default shadows;
