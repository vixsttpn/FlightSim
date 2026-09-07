/**
 * Design Tokens - Animation
 * Анимации, переходы и keyframes для FlightSim
 * Плавные, быстрые переходы в стиле FR24
 */

// Длительности
export const duration = {
  instant: '0ms',
  fastest: '50ms',
  faster: '100ms',
  fast: '150ms', // базовый для hover
  normal: '200ms', // базовый для UI
  slow: '300ms', // для панелей, модалок
  slower: '400ms',
  slowest: '600ms',
  ultraSlow: '1000ms', // для карты, путей
} as const;

// Функции сглаживания
export const easing = {
  linear: 'linear',
  // Стандартные
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // Акцентные - более выразительные
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)', // для появления
  easeInExpo: 'cubic-bezier(0.7, 0, 0.84, 0)',
  easeInOutExpo: 'cubic-bezier(0.87, 0, 0.13, 1)',
  // Пружинистые (для интерактива)
  springSnappy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springSmooth: 'cubic-bezier(0.25, 1.2, 0.5, 1)',
  // FR24 style - быстрое появление, плавное исчезновение
  default: 'cubic-bezier(0.2, 0, 0, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

// Готовые transition строки
export const transition = {
  // Базовые
  allFast: `all ${duration.fast} ${easing.easeOut}`,
  allNormal: `all ${duration.normal} ${easing.easeOut}`,
  allSlow: `all ${duration.slow} ${easing.easeOut}`,

  // Специфичные свойства
  colors: `color ${duration.fast} ${easing.easeOut}, background-color ${duration.fast} ${easing.easeOut}, border-color ${duration.fast} ${easing.easeOut}`,
  opacity: `opacity ${duration.fast} ${easing.easeOut}`,
  transform: `transform ${duration.normal} ${easing.easeOutExpo}`,
  shadow: `box-shadow ${duration.fast} ${easing.easeOut}`,

  // Для компонентов
  button: `all ${duration.fast} ${easing.default}`,
  card: `transform ${duration.normal} ${easing.springSmooth}, box-shadow ${duration.normal} ${easing.easeOut}`,
  modal: `opacity ${duration.normal} ${easing.easeOut}, transform ${duration.normal} ${easing.easeOutExpo}`,
  panel: `transform ${duration.slow} ${easing.easeOutExpo}, opacity ${duration.slow} ${easing.easeOut}`,
  tooltip: `opacity ${duration.faster} ${easing.easeOut}, transform ${duration.faster} ${easing.easeOut}`,

  // Карта
  mapMarker: `transform ${duration.normal} ${easing.springSnappy}`,
  flightPath: `stroke-dashoffset ${duration.ultraSlow} ${easing.linear}`,
} as const;

// Keyframes в виде объектов для использования в styled-components / emotion / inline style
// Также экспортируем CSS строки для глобального инжекта
export const keyframes = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  slideInUp: {
    from: { transform: 'translateY(100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideInDown: {
    from: { transform: 'translateY(-100%)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  slideInLeft: {
    from: { transform: 'translateX(-100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  slideInRight: {
    from: { transform: 'translateX(100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  scaleOut: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: { transform: 'scale(0.95)', opacity: 0 },
  },
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
  pulseScale: {
    '0%, 100%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.05)' },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  shimmer: {
    from: { backgroundPosition: '-1000px 0' },
    to: { backgroundPosition: '1000px 0' },
  },
  flightMove: {
    '0%': { offsetDistance: '0%' },
    '100%': { offsetDistance: '100%' },
  },
  // Специфичные для авиации
  aircraftBlink: {
    '0%, 90%, 100%': { opacity: 1 },
    '95%': { opacity: 0.3 },
  },
  radarSweep: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
} as const;

// CSS @keyframes строки для инжекта через <style>
export const keyframesCSS = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes slideInUp {
    from { transform: translateY(100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideInDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideInLeft {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes pulseScale {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes aircraftBlink {
    0%, 90%, 100% { opacity: 1; }
    95% { opacity: 0.3; }
  }
  @keyframes radarSweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }
`;

// Пресеты анимаций
export const animation = {
  duration,
  easing,
  transition,
  keyframes,
  keyframesCSS,
} as const;

export type Animation = typeof animation;
export type Duration = keyof typeof duration;
export type Easing = keyof typeof easing;

export default animation;
