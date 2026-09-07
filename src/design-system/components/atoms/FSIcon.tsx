/**
 * FSIcon - Атом иконки FlightSim
 * Обертка над IonIcon с токенами цветов, размеров и поддержкой кастомных SVG
 * Для авиационных иконок: самолет, аэропорт, радар и т.д.
 */
import React from 'react';
import { IonIcon } from '@ionic/react';
import { colors } from '../../tokens/colors';

export type FSIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
export type FSIconColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'white'
  | 'current';

export interface FSIconProps {
  /** Иконка ionicon (импорт из ionicons/icons) или строка */
  icon?: string;
  /** Кастомный SVG элемент или ReactNode */
  children?: React.ReactNode;
  /** Размер иконки */
  size?: FSIconSize;
  /** Цвет из токенов */
  color?: FSIconColor;
  /** Кастомный цвет (перекрывает color) */
  customColor?: string;
  /** Дополнительный класс */
  className?: string;
  /** Inline стили */
  style?: React.CSSProperties;
  /** Клик хендлер */
  onClick?: () => void;
  /** Вращение (для лоадеров, компаса) */
  spin?: boolean;
  /** Пульсация (для live индикаторов) */
  pulse?: boolean;
  /** aria-label для доступности */
  ariaLabel?: string;
  /** testId */
  testId?: string;
}

const sizeMap: Record<string, string> = {
  xs: '12px',
  sm: '16px',
  md: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};

const colorMap: Record<FSIconColor, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  accent: colors.brand.primary,
  success: colors.semantic.success,
  warning: colors.semantic.warning,
  error: colors.semantic.error,
  info: colors.semantic.info,
  white: colors.text.primary,
  current: 'currentColor',
};

export const FSIcon: React.FC<FSIconProps> = ({
  icon,
  children,
  size = 'md',
  color = 'current',
  customColor,
  className = '',
  style = {},
  onClick,
  spin = false,
  pulse = false,
  ariaLabel,
  testId,
}) => {
  const resolvedSize = typeof size === 'number' ? `${size}px` : sizeMap[size as string] || sizeMap.md;
  const resolvedColor = customColor || colorMap[color];

  const iconStyle: React.CSSProperties = {
    fontSize: resolvedSize,
    width: resolvedSize,
    height: resolvedSize,
    color: resolvedColor,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : undefined,
    animation: spin ? 'fs-icon-spin 1s linear infinite' : pulse ? 'fs-icon-pulse 2s ease-in-out infinite' : undefined,
    ...style,
  };

  // Рендер кастомных детей (SVG)
  if (children && !icon) {
    return (
      <span
        className={`fs-icon fs-icon--${color} ${className}`.trim()}
        style={iconStyle}
        onClick={onClick}
        aria-label={ariaLabel}
        data-testid={testId}
        role={ariaLabel ? 'img' : undefined}
      >
        {children}
      </span>
    );
  }

  return (
    <>
      <IonIcon
        icon={icon}
        className={`fs-icon fs-icon--${typeof size === 'string' ? size : 'custom'} fs-icon--${color} ${className}`.trim()}
        style={iconStyle}
        onClick={onClick as any}
        aria-label={ariaLabel}
        data-testid={testId}
      />
      {(spin || pulse) && (
        <style>
          {`
            @keyframes fs-icon-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes fs-icon-pulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(0.95); }
            }
          `}
        </style>
      )}
    </>
  );
};

export default FSIcon;
