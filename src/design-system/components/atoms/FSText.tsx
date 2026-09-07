/**
 * FSText - Типографический атом FlightSim
 * Единая система текстовых стилей на базе Ionic, использует токены colors.ts
 * Поддерживает варианты заголовков, body, моноширный для авиационных данных
 */
import React from 'react';
import { colors } from '../../tokens/colors';

export type FSTextVariant =
  | 'display' // Большой дисплей 32px - для главных чисел
  | 'h1' // 28px
  | 'h2' // 24px
  | 'h3' // 20px
  | 'h4' // 18px
  | 'h5' // 16px bold
  | 'body' // 15px regular - основной текст
  | 'bodyStrong' // 15px semibold
  | 'bodySmall' // 13px - вторичный
  | 'caption' // 12px - подписи
  | 'label' // 12px uppercase - лейблы
  | 'overline' // 10px uppercase - надстрочный
  | 'mono' // моно для кодов рейсов, высоты, ICAO
  | 'monoSmall'; // 12px моно

export type FSTextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'accent'
  | 'inverse'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'white';

export type FSTextWeight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
export type FSTextAlign = 'left' | 'center' | 'right' | 'justify';

export interface FSTextProps {
  children: React.ReactNode;
  /** Типографика стиль */
  variant?: FSTextVariant;
  /** Цвет из токенов */
  color?: FSTextColor;
  /** Насыщенность */
  weight?: FSTextWeight;
  /** Выравнивание */
  align?: FSTextAlign;
  /** Одна строка с ... */
  truncate?: boolean;
  /** Макс линий (line clamp) */
  lines?: number;
  /** Верхний регистр */
  uppercase?: boolean;
  /** Итальянский для callsign */
  italic?: boolean;
  /** Дополнительный класс */
  className?: string;
  /** Inline стили */
  style?: React.CSSProperties;
  /** Использовать как span/div/p */
  as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'label';
  /** onClick */
  onClick?: () => void;
  /** data-testid */
  testId?: string;
}

// Маппинг вариантов на стили
const variantMap: Record<FSTextVariant, React.CSSProperties> = {
  display: { fontSize: '32px', lineHeight: '36px', fontWeight: 800, letterSpacing: '-0.02em' },
  h1: { fontSize: '28px', lineHeight: '32px', fontWeight: 700, letterSpacing: '-0.015em' },
  h2: { fontSize: '24px', lineHeight: '28px', fontWeight: 700, letterSpacing: '-0.01em' },
  h3: { fontSize: '20px', lineHeight: '24px', fontWeight: 600, letterSpacing: '-0.005em' },
  h4: { fontSize: '18px', lineHeight: '22px', fontWeight: 600 },
  h5: { fontSize: '16px', lineHeight: '20px', fontWeight: 600 },
  body: { fontSize: '15px', lineHeight: '22px', fontWeight: 400 },
  bodyStrong: { fontSize: '15px', lineHeight: '22px', fontWeight: 600 },
  bodySmall: { fontSize: '13px', lineHeight: '18px', fontWeight: 400 },
  caption: { fontSize: '12px', lineHeight: '16px', fontWeight: 400 },
  label: { fontSize: '12px', lineHeight: '14px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const },
  overline: { fontSize: '10px', lineHeight: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  mono: { fontSize: '14px', lineHeight: '20px', fontWeight: 500, fontFamily: 'JetBrains Mono, SFMono-Regular, Menlo, monospace' },
  monoSmall: { fontSize: '12px', lineHeight: '16px', fontWeight: 500, fontFamily: 'JetBrains Mono, SFMono-Regular, Menlo, monospace' },
};

const colorMap: Record<FSTextColor, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  disabled: colors.text.disabled,
  accent: colors.text.accent,
  inverse: colors.text.inverse,
  success: colors.semantic.success,
  warning: colors.semantic.warning,
  error: colors.semantic.error,
  info: colors.semantic.info,
  white: '#FFFFFF',
};

const weightMap: Record<FSTextWeight, number> = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

export const FSText: React.FC<FSTextProps> = ({
  children,
  variant = 'body',
  color = 'primary',
  weight,
  align = 'left',
  truncate = false,
  lines,
  uppercase = false,
  italic = false,
  className = '',
  style = {},
  as,
  onClick,
  testId,
}) => {
  // Авто-тег на основе варианта
  const defaultTag = (() => {
    if (as) return as;
    switch (variant) {
      case 'display':
      case 'h1':
        return 'h1';
      case 'h2':
        return 'h2';
      case 'h3':
        return 'h3';
      case 'h4':
      case 'h5':
        return 'h4';
      case 'label':
      case 'overline':
      case 'caption':
        return 'span';
      default:
        return 'span';
    }
  })();

  const Tag = defaultTag as any;

  const combinedStyle: React.CSSProperties = {
    ...variantMap[variant],
    color: colorMap[color],
    fontWeight: weight ? weightMap[weight] : variantMap[variant].fontWeight,
    textAlign: align,
    fontStyle: italic ? 'italic' : undefined,
    textTransform: uppercase ? 'uppercase' : (variantMap[variant].textTransform as any),
    margin: 0,
    // Обрезка
    ...(truncate
      ? {
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        }
      : {}),
    // Мультилайн clamp
    ...(lines
      ? {
          display: '-webkit-box',
          WebkitLineClamp: lines,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }
      : {}),
    ...style,
  };

  return (
    <Tag
      className={`fs-text fs-text--${variant} fs-text--${color} ${className}`.trim()}
      style={combinedStyle}
      onClick={onClick}
      data-testid={testId}
    >
      {children}
    </Tag>
  );
};

export default FSText;
