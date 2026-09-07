/**
 * FSButton - Базовый атом кнопки FlightSim
 * Обертка над IonButton с дизайн-токенами и вариантами из FlightRadar24 стайлгайда
 * Поддерживает цвета из tokens/colors.ts, размеры, loading, иконки
 */
import React from 'react';
import { IonButton, IonSpinner, IonIcon } from '@ionic/react';
import { colors } from '../../tokens/colors';

// Типы пропсов
export type FSButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
export type FSButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';
export type FSButtonFill = 'solid' | 'outline' | 'clear' | 'default';

export interface FSButtonProps {
  /** Контент кнопки */
  children?: React.ReactNode;
  /** Визуальный вариант */
  variant?: FSButtonVariant;
  /** Размер кнопки */
  size?: FSButtonSize;
  /** Fill тип Ionic */
  fill?: FSButtonFill;
  /** Заблокирована ли кнопка */
  disabled?: boolean;
  /** Состояние загрузки */
  loading?: boolean;
  /** Растянуть на всю ширину */
  fullWidth?: boolean;
  /** Иконка слева/справа (ionicon name или элемент) */
  icon?: string | React.ReactNode;
  /** Позиция иконки */
  iconPosition?: 'start' | 'end';
  /** Только иконка (квадратная кнопка) */
  iconOnly?: boolean;
  /** Тип кнопки HTML */
  type?: 'button' | 'submit' | 'reset';
  /** Дополнительный класс */
  className?: string;
  /** inline стили */
  style?: React.CSSProperties;
  /** Клик хендлер */
  onClick?: (e: React.MouseEvent<HTMLIonButtonElement>) => void;
  /** ID для тестов */
  testId?: string;
  /** Router link */
  routerLink?: string;
  /** Форма связанная */
  form?: string;
}

// Маппинг вариантов на стили
const variantStyles: Record<FSButtonVariant, React.CSSProperties> = {
  primary: {
    '--background': colors.brand.primary,
    '--background-hover': colors.brand.primaryHover,
    '--background-activated': colors.brand.primaryActive,
    '--color': colors.text.onAccent,
    '--border-color': colors.brand.primary,
  } as React.CSSProperties,
  secondary: {
    '--background': colors.surface.primary,
    '--background-hover': colors.surface.hover,
    '--background-activated': colors.surface.active,
    '--color': colors.text.primary,
    '--border-color': colors.border.primary,
  } as React.CSSProperties,
  ghost: {
    '--background': 'transparent',
    '--background-hover': colors.interactive.hoverOverlay,
    '--background-activated': colors.interactive.activeOverlay,
    '--color': colors.text.secondary,
    '--border-color': 'transparent',
  } as React.CSSProperties,
  outline: {
    '--background': 'transparent',
    '--background-hover': colors.brand.primaryMuted,
    '--background-activated': colors.brand.primaryBorder,
    '--color': colors.brand.primary,
    '--border-color': colors.brand.primary,
    '--border-style': 'solid',
    '--border-width': '1px',
  } as React.CSSProperties,
  danger: {
    '--background': colors.semantic.error,
    '--background-hover': '#DC2626',
    '--background-activated': '#B91C1C',
    '--color': colors.text.primary,
  } as React.CSSProperties,
  success: {
    '--background': colors.semantic.success,
    '--background-hover': '#059669',
    '--background-activated': '#047857',
    '--color': colors.text.primary,
  } as React.CSSProperties,
};

const sizeStyles: Record<FSButtonSize, React.CSSProperties> = {
  xs: { '--padding-start': '8px', '--padding-end': '8px', height: '24px', fontSize: '12px' },
  sm: { '--padding-start': '12px', '--padding-end': '12px', height: '32px', fontSize: '13px' },
  md: { '--padding-start': '16px', '--padding-end': '16px', height: '40px', fontSize: '14px' },
  lg: { '--padding-start': '24px', '--padding-end': '24px', height: '48px', fontSize: '16px' },
  icon: { '--padding-start': '0', '--padding-end': '0', width: '40px', height: '40px' },
};

export const FSButton: React.FC<FSButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fill,
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'start',
  iconOnly = false,
  type = 'button',
  className = '',
  style = {},
  onClick,
  testId,
  routerLink,
  form,
}) => {
  // Определяем fill на основе варианта если не передан явно
  const resolvedFill: FSButtonFill = fill ?? (variant === 'ghost' ? 'clear' : variant === 'outline' ? 'outline' : 'solid');

  // Комбинируем стили токенов + кастомные
  const combinedStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...sizeStyles[iconOnly ? 'icon' : size],
    width: fullWidth ? '100%' : undefined,
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'none' as const,
    borderRadius: '8px',
    // Брендовый фокус ринг
    '--box-shadow': 'none',
    ...style,
  };

  const handleClick = (e: React.MouseEvent<HTMLIonButtonElement>) => {
    if (loading || disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };

  return (
    <IonButton
      fill={resolvedFill}
      size={size === 'lg' ? 'large' : size === 'sm' || size === 'xs' ? 'small' : 'default'}
      disabled={disabled || loading}
      onClick={handleClick as any}
      style={combinedStyle}
      className={`fs-button fs-button--${variant} fs-button--${size} ${className}`.trim()}
      data-testid={testId}
      routerLink={routerLink}
      type={type}
      form={form}
    >
      {loading ? (
        // Спиннер вместо контента при загрузке
        <IonSpinner name="crescent" style={{ width: '16px', height: '16px' }} />
      ) : (
        <>
          {icon && iconPosition === 'start' && (
            <span style={{ display: 'flex', marginRight: children ? '8px' : 0, alignItems: 'center' }}>
              {typeof icon === 'string' ? <IonIcon icon={icon} style={{ fontSize: size === 'lg' ? '20px' : '18px' }} /> : icon}
            </span>
          )}
          {children && <span className="fs-button__label">{children}</span>}
          {icon && iconPosition === 'end' && (
            <span style={{ display: 'flex', marginLeft: children ? '8px' : 0, alignItems: 'center' }}>
              {typeof icon === 'string' ? <IonIcon icon={icon} style={{ fontSize: size === 'lg' ? '20px' : '18px' }} /> : icon}
            </span>
          )}
          {/* Если iconOnly без children, но иконка - рендерим ее в центре */}
          {iconOnly && !children && !icon && null}
        </>
      )}
    </IonButton>
  );
};

export default FSButton;
