/**
 * Design Tokens - Colors
 * Темная палитра в стиле FlightRadar24
 * Основные цвета: #0F172A (фон), #1E293B (поверхность), #CB00B6 (акцент), white
 */

// Базовые константы палитры FR24
export const baseColors = {
  backgroundDeep: '#0F172A', // slate-900 - основной фон приложения
  backgroundSurface: '#1E293B', // slate-800 - карточки, сайдбары, панели
  backgroundElevated: '#334155', // slate-700 - приподнятые элементы
  accentPrimary: '#CB00B6', // маджента - брендовый цвет из логотипа
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Полная палитра для темной темы
export const colors = {
  // Фон
  background: {
    primary: baseColors.backgroundDeep, // #0F172A
    secondary: baseColors.backgroundSurface, // #1E293B
    tertiary: '#1A2332', // промежуточный между primary и secondary
    elevated: baseColors.backgroundElevated, // #334155
    overlay: 'rgba(15, 23, 42, 0.8)', // полупрозрачный оверлей
    inverse: baseColors.white,
  },

  // Поверхности (карточки, модалки, тултипы)
  surface: {
    primary: baseColors.backgroundSurface,
    secondary: '#253449', // чуть светлее secondary
    tertiary: baseColors.backgroundElevated,
    hover: '#2D3E5A',
    active: '#344862',
    disabled: '#1E2A3A',
  },

  // Бренд / Акцент
  brand: {
    primary: baseColors.accentPrimary, // #CB00B6
    primaryHover: '#E200C8',
    primaryActive: '#A3008A',
    primaryMuted: 'rgba(203, 0, 182, 0.15)',
    primaryBorder: 'rgba(203, 0, 182, 0.3)',
    secondary: '#9333EA', // фиолетовый компаньон
    secondaryHover: '#A855F7',
  },

  // Текст
  text: {
    primary: baseColors.white, // #FFFFFF на темном фоне
    secondary: '#CBD5E1', // slate-300
    tertiary: '#94A3B8', // slate-400
    disabled: '#64748B', // slate-500
    inverse: baseColors.backgroundDeep,
    accent: baseColors.accentPrimary,
    onAccent: baseColors.white,
  },

  // Границы
  border: {
    primary: '#334155', // slate-700
    secondary: '#1E293B',
    tertiary: '#475569',
    accent: baseColors.accentPrimary,
    focus: '#CB00B6',
    hover: '#475569',
  },

  // Семантические цвета
  semantic: {
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.15)',
    successBorder: 'rgba(16, 185, 129, 0.3)',
    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    warningBorder: 'rgba(245, 158, 11, 0.3)',
    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    errorBorder: 'rgba(239, 68, 68, 0.3)',
    info: '#0EA5E9',
    infoBg: 'rgba(14, 165, 233, 0.15)',
    infoBorder: 'rgba(14, 165, 233, 0.3)',
  },

  // Специфичные для FlightSim / карты
  flight: {
    path: baseColors.accentPrimary,
    pathGlow: 'rgba(203, 0, 182, 0.4)',
    aircraft: baseColors.white,
    aircraftSelected: baseColors.accentPrimary,
    airport: '#94A3B8',
    airportMajor: '#FFFFFF',
    airspace: 'rgba(148, 163, 184, 0.2)',
    trail: 'rgba(203, 0, 182, 0.6)',
  },

  // Интерактивные состояния
  interactive: {
    hoverOverlay: 'rgba(255, 255, 255, 0.05)',
    activeOverlay: 'rgba(255, 255, 255, 0.1)',
    focusRing: '0 0 0 3px rgba(203, 0, 182, 0.4)',
  },
} as const;

// CSS переменные для динамического темизирования
export const cssVariables = {
  '--color-bg-primary': colors.background.primary,
  '--color-bg-secondary': colors.background.secondary,
  '--color-bg-elevated': colors.background.elevated,
  '--color-surface-primary': colors.surface.primary,
  '--color-brand-primary': colors.brand.primary,
  '--color-text-primary': colors.text.primary,
  '--color-text-secondary': colors.text.secondary,
  '--color-border-primary': colors.border.primary,
  '--color-accent': baseColors.accentPrimary,
} as const;

// Тип для автодополнения
export type Colors = typeof colors;
export type BaseColors = typeof baseColors;

export default colors;
