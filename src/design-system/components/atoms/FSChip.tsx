/**
 * FSChip - Атом чипа FlightSim
 * Для фильтров, тегов авиакомпаний, аэропортов, типов ВС
 * Основан на IonChip + интерактивность
 */
import React from 'react';
import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { closeCircle } from 'ionicons/icons';
import { colors } from '../../tokens/colors';

export type FSChipVariant = 'default' | 'primary' | 'outline' | 'ghost' | 'selected';
export type FSChipSize = 'sm' | 'md' | 'lg';

export interface FSChipProps {
  /** Текст чипа */
  label: string;
  /** Вариант стиля */
  variant?: FSChipVariant;
  /** Размер */
  size?: FSChipSize;
  /** Иконка слева */
  icon?: string | React.ReactNode;
  /** Аватар URL или элемент */
  avatar?: string | React.ReactNode;
  /** Выбран ли чип (для фильтров) */
  selected?: boolean;
  /** Отключен */
  disabled?: boolean;
  /** Показывать крестик удаления */
  removable?: boolean;
  /** Колбэк удаления */
  onRemove?: () => void;
  /** Клик по чипу */
  onClick?: () => void;
  /** Дополнительный класс */
  className?: string;
  /** Стили */
  style?: React.CSSProperties;
  /** testId */
  testId?: string;
  /** Цвет кастомный */
  color?: string;
}

const variantBase: Record<FSChipVariant, React.CSSProperties> = {
  default: {
    '--background': colors.surface.primary,
    '--color': colors.text.secondary,
    border: `1px solid ${colors.border.primary}`,
  } as React.CSSProperties,
  primary: {
    '--background': colors.brand.primaryMuted,
    '--color': colors.brand.primary,
    border: `1px solid ${colors.brand.primaryBorder}`,
  } as React.CSSProperties,
  outline: {
    '--background': 'transparent',
    '--color': colors.text.secondary,
    border: `1px solid ${colors.border.primary}`,
  } as React.CSSProperties,
  ghost: {
    '--background': 'transparent',
    '--color': colors.text.tertiary,
    border: `1px solid transparent`,
  } as React.CSSProperties,
  selected: {
    '--background': colors.brand.primary,
    '--color': colors.text.onAccent,
    border: `1px solid ${colors.brand.primary}`,
  } as React.CSSProperties,
};

const sizeMap: Record<FSChipSize, React.CSSProperties> = {
  sm: { height: '24px', fontSize: '12px', '--padding-start': '8px', '--padding-end': '8px' },
  md: { height: '32px', fontSize: '13px', '--padding-start': '12px', '--padding-end': '12px' },
  lg: { height: '38px', fontSize: '14px', '--padding-start': '14px', '--padding-end': '14px' },
};

export const FSChip: React.FC<FSChipProps> = ({
  label,
  variant = 'default',
  size = 'md',
  icon,
  avatar,
  selected = false,
  disabled = false,
  removable = false,
  onRemove,
  onClick,
  className = '',
  style = {},
  testId,
  color,
}) => {
  // Если selected=true, форсим вариант selected
  const effectiveVariant = selected ? 'selected' : variant;

  const combinedStyle: React.CSSProperties = {
    ...variantBase[effectiveVariant],
    ...sizeMap[size],
    borderRadius: '999px',
    fontWeight: 500,
    letterSpacing: '0.01em',
    cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
    userSelect: 'none',
    ...(color ? { '--background': color } : {}),
    ...style,
  } as React.CSSProperties;

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onRemove?.();
  };

  return (
    <IonChip
      className={`fs-chip fs-chip--${effectiveVariant} fs-chip--${size} ${className}`.trim()}
      style={combinedStyle}
      onClick={handleClick}
      disabled={disabled}
      data-testid={testId}
      outline={effectiveVariant === 'outline'}
    >
      {/* Аватар */}
      {avatar &&
        (typeof avatar === 'string' ? (
          <img
            src={avatar}
            alt=""
            style={{ width: size === 'sm' ? '16px' : '20px', height: size === 'sm' ? '16px' : '20px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          avatar
        ))}

      {/* Иконка */}
      {icon && !avatar && (
        <span style={{ display: 'flex', fontSize: size === 'sm' ? '14px' : '16px' }}>
          {typeof icon === 'string' ? <IonIcon icon={icon} /> : icon}
        </span>
      )}

      <IonLabel style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</IonLabel>

      {/* Крестик удаления */}
      {removable && (
        <IonIcon
          icon={closeCircle}
          onClick={handleRemove as any}
          style={{
            fontSize: size === 'sm' ? '16px' : '18px',
            marginLeft: '2px',
            cursor: 'pointer',
            opacity: 0.7,
          }}
        />
      )}
    </IonChip>
  );
};

export default FSChip;
