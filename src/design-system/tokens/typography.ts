/**
 * Design Tokens - Typography
 * Типографика для темной темы FlightSim в стиле FR24
 * Шрифты: Inter / JetBrains Mono для моноширинного (координаты, ICAO)
 */

// Семейства шрифтов
export const fontFamily = {
  sans: [
    'Inter',
    'SF Pro Display',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ].join(', '),
  mono: [
    'JetBrains Mono',
    'SF Mono',
    'Consolas',
    'Liberation Mono',
    'Menlo',
    'monospace',
  ].join(', '),
  display: [
    'Inter Tight',
    'Inter',
    'sans-serif',
  ].join(', '),
} as const;

// Размеры шрифтов - модульная шкала 1.125 (major second)
export const fontSize = {
  '2xs': '0.625rem', // 10px - бейджи, микротекст
  xs: '0.75rem', // 12px - подписи, лейблы
  sm: '0.8125rem', // 13px - вторичный текст
  base: '0.875rem', // 14px - основной текст UI (FR24 использует 14px)
  md: '1rem', // 16px - параграфы
  lg: '1.125rem', // 18px - подзаголовки
  xl: '1.25rem', // 20px - заголовки карточек
  '2xl': '1.5rem', // 24px - заголовки секций
  '3xl': '1.875rem', // 30px - крупные заголовки
  '4xl': '2.25rem', // 36px - hero
  '5xl': '3rem', // 48px - дисплей
} as const;

// Веса шрифтов
export const fontWeight = {
  thin: 100,
  extralight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
  // Семантические алиасы
  body: 400,
  heading: 600,
  display: 700,
} as const;

// Высота строки
export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5, // для body
  relaxed: 1.625,
  loose: 2,
  // Специфичные
  body: 1.5,
  heading: 1.25,
  display: 1.1,
  mono: 1.4,
} as const;

// Межбуквенный интервал
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
  // Семантические
  label: '0.05em', // для капса
  mono: '-0.02em',
} as const;

// Готовые типографические стили
export const typography = {
  // Заголовки
  h1: {
    fontFamily: fontFamily.display,
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.display,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamily.display,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.normal,
  },
  h5: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },

  // Body
  bodyLarge: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySmall: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.normal,
    letterSpacing: letterSpacing.normal,
  },

  // Лейблы и подписи
  label: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.label,
    textTransform: 'uppercase' as const,
  },
  labelSmall: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize['2xs'],
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.tight,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.regular,
    lineHeight: lineHeight.snug,
    letterSpacing: letterSpacing.normal,
  },

  // Моноширинные стили для авиационных данных
  mono: {
    data: {
      fontFamily: fontFamily.mono,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.mono,
      letterSpacing: letterSpacing.mono,
    },
    small: {
      fontFamily: fontFamily.mono,
      fontSize: fontSize.xs,
      fontWeight: fontWeight.regular,
      lineHeight: lineHeight.mono,
      letterSpacing: letterSpacing.mono,
    },
    code: {
      fontFamily: fontFamily.mono,
      fontSize: fontSize.base,
      fontWeight: fontWeight.regular,
      lineHeight: lineHeight.mono,
    },
  },

  // Кнопки и интерактив
  button: {
    large: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wide,
    },
    medium: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wide,
    },
    small: {
      fontFamily: fontFamily.sans,
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      lineHeight: lineHeight.none,
      letterSpacing: letterSpacing.wide,
    },
  },
} as const;

// Тип для автодополнения
export type Typography = typeof typography;
export type FontSize = keyof typeof fontSize;
export type FontWeight = keyof typeof fontWeight;

export default typography;
