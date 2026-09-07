/**
 * Design Tokens - ThemeProvider
 * Провайдер темы для FlightSim
 * Инжектит CSS переменные, keyframes, и предоставляет контекст темы
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { colors, cssVariables, baseColors } from './colors';
import typography, { fontFamily } from './typography';
import spacing, { componentSpacing, layout } from './spacing';
import radii, { componentRadii } from './radii';
import shadows from './shadows';
import animation from './animation';
import zIndex from './zIndex';

// Полный объект темы
export const theme = {
  colors,
  baseColors,
  typography,
  fontFamily,
  spacing,
  componentSpacing,
  layout,
  radii,
  componentRadii,
  shadows,
  animation,
  zIndex,
  cssVariables,
} as const;

export type Theme = typeof theme;

// Тип режима темы (пока только dark, заложено под light в будущем)
export type ThemeMode = 'dark' | 'light';

// Контекст
interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Хук для использования темы
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

// Генерация CSS переменных из токенов
function generateCssVariablesString(): string {
  const vars: string[] = [];

  // Цвета
  vars.push(`--color-bg-primary: ${colors.background.primary};`);
  vars.push(`--color-bg-secondary: ${colors.background.secondary};`);
  vars.push(`--color-bg-tertiary: ${colors.background.tertiary};`);
  vars.push(`--color-bg-elevated: ${colors.background.elevated};`);
  vars.push(`--color-surface-primary: ${colors.surface.primary};`);
  vars.push(`--color-surface-hover: ${colors.surface.hover};`);
  vars.push(`--color-brand-primary: ${colors.brand.primary};`);
  vars.push(`--color-brand-hover: ${colors.brand.primaryHover};`);
  vars.push(`--color-text-primary: ${colors.text.primary};`);
  vars.push(`--color-text-secondary: ${colors.text.secondary};`);
  vars.push(`--color-text-tertiary: ${colors.text.tertiary};`);
  vars.push(`--color-border-primary: ${colors.border.primary};`);
  vars.push(`--color-border-focus: ${colors.border.focus};`);

  // Типографика
  vars.push(`--font-sans: ${fontFamily.sans};`);
  vars.push(`--font-mono: ${fontFamily.mono};`);
  vars.push(`--font-display: ${fontFamily.display};`);

  // Отступы
  Object.entries(spacing).forEach(([key, value]) => {
    // Экранируем ключи с точкой
    const cssKey = key.toString().replace('.', '-');
    if (typeof value === 'string') {
      vars.push(`--spacing-${cssKey}: ${value};`);
    }
  });

  // Радиусы
  Object.entries(radii).forEach(([key, value]) => {
    vars.push(`--radius-${key}: ${value};`);
  });

  // Z-index
  vars.push(`--z-map: ${zIndex.map.base};`);
  vars.push(`--z-map-aircraft: ${zIndex.map.aircraft};`);
  vars.push(`--z-navbar: ${zIndex.navbar};`);
  vars.push(`--z-sidebar: ${zIndex.sidebar};`);
  vars.push(`--z-modal: ${zIndex.modal};`);
  vars.push(`--z-tooltip: ${zIndex.tooltip};`);
  vars.push(`--z-toast: ${zIndex.toast};`);

  // Тени и анимации
  vars.push(`--shadow-card: ${shadows.card};`);
  vars.push(`--shadow-modal: ${shadows.modal};`);
  vars.push(`--shadow-brand-glow: ${shadows.brand.glow};`);
  vars.push(`--duration-fast: ${animation.duration.fast};`);
  vars.push(`--duration-normal: ${animation.duration.normal};`);
  vars.push(`--easing-default: ${animation.easing.default};`);

  return vars.join('\n    ');
}

// Глобальные стили
function getGlobalStyles(): string {
  return `
    /* Импорт шрифтов */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    /* CSS переменные темы */
    :root {
      color-scheme: dark;
      ${generateCssVariablesString()}
    }

    /* Keyframes */
    ${animation.keyframesCSS}

    /* Базовый ресет для темной темы */
    html {
      background-color: var(--color-bg-primary);
      color: var(--color-text-primary);
      font-family: var(--font-sans);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    body {
      margin: 0;
      background-color: ${colors.background.primary};
      color: ${colors.text.primary};
      font-family: ${fontFamily.sans};
      font-size: ${typography.body.fontSize};
      line-height: ${typography.body.lineHeight};
    }

    /* Скроллбар для темной темы */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: ${colors.background.primary};
    }
    ::-webkit-scrollbar-thumb {
      background: ${colors.background.elevated};
      border-radius: ${radii.full};
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${colors.surface.hover};
    }

    /* Focus */
    *:focus-visible {
      outline: none;
      box-shadow: ${shadows.focus.default};
    }

    /* Selection */
    ::selection {
      background-color: ${colors.brand.primaryMuted};
      color: ${colors.text.primary};
    }
  `;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  injectGlobal?: boolean; // инжектить ли глобальные стили
}

export function ThemeProvider({
  children,
  defaultMode = 'dark',
  injectGlobal = true,
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);

  // Мемоизируем тему (на будущее для light/dark переключателя)
  const currentTheme = useMemo(() => {
    // Сейчас только dark, но архитектура готова для light
    if (mode === 'light') {
      // Заглушка: пока возвращаем dark тему, можно расширить
      return theme;
    }
    return theme;
  }, [mode]);

  // Инжект глобальных стилей
  useEffect(() => {
    if (!injectGlobal) return;
    if (typeof document === 'undefined') return;

    const styleId = 'flightsim-design-tokens';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = getGlobalStyles();

    return () => {
      // Не удаляем при анмаунте чтобы избежать FOUC при HMR
      // styleEl?.remove();
    };
  }, [injectGlobal, mode]);

  // Применяем класс темы к html
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: currentTheme,
      mode,
      setMode,
    }),
    [currentTheme, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Утилита для использования токенов вне React (например в canvas для карты)
export function getTheme(): Theme {
  return theme;
}

// Хелпер для преобразования токенов в CSS prop объект
export const css = {
  var: (name: string) => `var(--${name})`,
  color: (path: string) => `var(--color-${path})`,
  spacing: (key: string | number) => `var(--spacing-${String(key).replace('.', '-')})`,
  radius: (key: string) => `var(--radius-${key})`,
};

export default ThemeProvider;
