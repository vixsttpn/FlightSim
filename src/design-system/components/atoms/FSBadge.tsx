/**
 * FSBadge - Атом бейджа FlightSim
 * Для статусов рейсов, счетчиков, индикаторов на карте
 * Использует семантические цвета из tokens/colors.ts
 */
import React from 'react';
import { IonBadge } from '@ionic/react';
import { colors } from '../../tokens/colors';

export type FSBadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type FSBadgeSize = 'sm' | 'md' | 'lg';
export type FSBadgeShape = 'rounded' | 'pill' | 'square';

export interface FSBadgeProps {
  children: React.ReactNode;
  /** Семантический вариант */
  variant?: FSBadgeVariant;
  /** Размер */
  size?: FSBadgeSize;
  /** Форма */
  shape?: FSBadgeShape;
  /** Показать точку-индикатор слева */
  dot?: boolean;
  /** Цвет точки (если dot=true, иначе по варианту) */
  dotColor?: string;
  /** Пульсирующая анимация для live-статусов */
  pulse?: boolean;
  /** Обводка */
  outlined?: boolean;
  /** Иконка слева */
  icon?: React.ReactNode;
  /** Дополнительный класс */
  className?: string;
  /** Стили */
  style?: React.CSSProperties;
  /** onClick */
  onClick?: () => void;
  /** testId */
  testId?: string;
}

const variantStyles: Record<FSBadgeVariant, { bg: string; color: string; border: string }> = {
  default: { bg: colors.surface.tertiary, color: colors.text.secondary, border: colors.border.primary },
  primary: { bg: colors.brand.primaryMuted, color: colors.brand.primary, border: colors.brand.primaryBorder },
  success: { bg: colors.semantic.successBg, color: colors.semantic.success, border: colors.semantic.successBorder },
  warning: { bg: colors.semantic.warningBg, color: colors.semantic.warning, border: colors.semantic.warningBorder },
  error: { bg: colors.semantic.errorBg, color: colors.semantic.error, border: colors.semantic.errorBorder },
  info: { bg: colors.semantic.infoBg, color: colors.semantic.info, border: colors.semantic.infoBorder },
  neutral: { bg: 'rgba(148, 163, 184, 0.15)', color: colors.text.tertiary, border: 'rgba(148,163,184,0.3)' },
};

const sizeStyles: Record<FSBadgeSize, React.CSSProperties> = {
  sm: { fontSize: '10px', padding: '2px 6px', height: '18px', lineHeight: '14px' },
  md: { fontSize: '12px', padding: '3px 8px', height: '22px', lineHeight: '16px' },
  lg: { fontSize: '13px', padding: '4px 10px', height: '26px', lineHeight: '18px' },
};

export const FSBadge: React.FC<FSBadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  shape = 'rounded',
  dot = false,
  dotColor,
  pulse = false,
  outlined = false,
  icon,
  className = '',
  style = {},
  onClick,
  testId,
}) => {
  const v = variantStyles[variant];

  const shapeStyle: React.CSSProperties = {
    borderRadius: shape === 'pill' ? '999px' : shape === 'square' ? '4px' : '6px',
  };

  const combinedStyle: React.CSSProperties = {
    ...sizeStyles[size],
    ...shapeStyle,
    background: outlined ? 'transparent' : v.bg,
    color: v.color,
    border: `1px solid ${v.border}`,
    fontWeight: 600,
    letterSpacing: '0.02em',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    cursor: onClick ? 'pointer' : 'default',
    userSelect: 'none',
    position: 'relative',
    // Для пульсации
    ...style,
  };

  // Цвет точки
  const effectiveDotColor = dotColor || v.color;

  return (
    <IonBadge
      className={`fs-badge fs-badge--${variant} fs-badge--${size} fs-badge--${shape} ${className}`.trim()}
      style={combinedStyle}
      onClick={onClick as any}
      data-testid={testId}
    >
      {/* Индикатор-точка */}
      {dot && (
        <span
          style={{
            width: size === 'sm' ? '6px' : '8px',
            height: size === 'sm' ? '6px' : '8px',
            borderRadius: '50%',
            background: effectiveDotColor,
            display: 'inline-block',
            flexShrink: 0,
            boxShadow: pulse ? `0 0 0 0 ${effectiveDotColor}` : 'none',
            animation: pulse ? 'fs-badge-pulse 2s infinite' : 'none',
          }}
        />
      )}
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>

      {/* Локальная keyframes для пульса */}
      {pulse && (
        <style>
          {`
            @keyframes fs-badge-pulse {
              0% { box-shadow: 0 0 0 0 ${effectiveDotColor}99; }
              70% { box-shadow: 0 0 0 6px ${effectiveDotColor}00; }
              100% { box-shadow: 0 0 0 0 ${effectiveDotColor}00; }
            }
          `}
        </style>
      )}
    </IonBadge>
  );
};

export default FSBadge;
