/**
 * Design Tokens - Index Barrel
 * Централизованный экспорт всех токенов
 */

// Токены
export { default as colors, baseColors, cssVariables } from './colors';
export { default as typography, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing } from './typography';
export { default as spacing, componentSpacing, layout } from './spacing';
export { default as radii, componentRadii } from './radii';
export { default as shadows, combinedShadows } from './shadows';
export { default as animation, duration, easing, transition, keyframes, keyframesCSS } from './animation';
export { default as zIndex, getZIndex } from './zIndex';

// Провайдер
export { default as ThemeProvider, theme, useTheme, getTheme, css } from './ThemeProvider';
export type { Theme, ThemeMode } from './ThemeProvider';

// Типы
export type { Colors, BaseColors } from './colors';
export type { Typography, FontSize, FontWeight } from './typography';
export type { Spacing, ComponentSpacing } from './spacing';
export type { Radii } from './radii';
export type { Shadows } from './shadows';
export type { Animation, Duration, Easing } from './animation';
export type { ZIndex } from './zIndex';

// Объединенный объект темы для быстрого импорта
import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import radii from './radii';
import shadows from './shadows';
import animation from './animation';
import zIndex from './zIndex';

export const tokens = {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  animation,
  zIndex,
} as const;

export default tokens;
