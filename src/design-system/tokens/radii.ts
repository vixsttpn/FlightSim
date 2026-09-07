/**
 * Design Tokens - Radii (Border Radius)
 * Скругления углов для темной темы FR24
 * От острых углов карты до полностью круглых аватаров самолетов
 */

export const radii = {
  // Базовые значения
  none: '0px',
  '2xs': '2px',
  xs: '4px',
  sm: '6px',
  md: '8px', // базовый радиус для карточек (FR24 стиль)
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  '4xl': '32px',
  full: '9999px', // полностью круглый

  // Семантические алиасы
  button: '8px', // кнопки
  buttonSmall: '6px',
  buttonLarge: '12px',
  card: '12px', // карточки полетов
  cardSmall: '8px',
  cardLarge: '16px',
  input: '8px',
  badge: '9999px', // бейджи статуса рейса
  avatar: '9999px',
  tooltip: '6px',
  modal: '16px',
  popover: '12px',
  focusRing: '8px', // для focus состояний
} as const;

// Для использования в конкретных компонентах
export const componentRadii = {
  aircraftMarker: radii.full, // маркер самолета на карте - круглый
  flightCard: radii.lg,
  airportDot: radii.full,
  panel: radii.lg,
  mapControl: radii.md,
  statusDot: radii.full,
} as const;

export type Radii = typeof radii;

export default radii;
