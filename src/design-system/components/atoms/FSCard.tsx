/**
 * FSCard - Атом карточки FlightSim
 * Базовая карточка для самолетов, аэропортов, полетов
 * Тема темная FR24, поддерживает elevation, интерактивность
 */
import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent } from '@ionic/react';
import { colors } from '../../tokens/colors';

export type FSCardElevation = 'flat' | 'low' | 'medium' | 'high';
export type FSCardPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg';

export interface FSCardProps {
  /** Контент карточки */
  children: React.ReactNode;
  /** Тень / возвышение */
  elevation?: FSCardElevation;
  /** Интерактивная (hover эффекты) */
  interactive?: boolean;
  /** Внутренние отступы */
  padding?: FSCardPadding;
  /** Заголовок */
  title?: string;
  /** Подзаголовок */
  subtitle?: string;
  /** Картинка шапки */
  image?: string;
  /** Высота картинки */
  imageHeight?: string;
  /** Выбранное состояние (бордер акцентный) */
  selected?: boolean;
  /** Отключена */
  disabled?: boolean;
  /** На всю ширину */
  fullWidth?: boolean;
  /** Дополнительный класс */
  className?: string;
  /** Стили */
  style?: React.CSSProperties;
  /** Клик */
  onClick?: () => void;
  /** ID теста */
  testId?: string;
  /** Скругление */
  rounded?: 'sm' | 'md' | 'lg' | 'xl';
}

const elevationMap: Record<FSCardElevation, string> = {
  flat: 'none',
  low: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
  medium: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
  high: '0 12px 24px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.4)',
};

const paddingMap: Record<FSCardPadding, string> = {
  none: '0',
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '20px',
};

const roundedMap = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
};

export const FSCard: React.FC<FSCardProps> = ({
  children,
  elevation = 'low',
  interactive = false,
  padding = 'md',
  title,
  subtitle,
  image,
  imageHeight = '160px',
  selected = false,
  disabled = false,
  fullWidth = false,
  className = '',
  style = {},
  onClick,
  testId,
  rounded = 'lg',
}) => {
  const combinedStyle: React.CSSProperties = {
    background: colors.surface.primary,
    border: `1px solid ${selected ? colors.brand.primary : colors.border.primary}`,
    borderRadius: roundedMap[rounded],
    boxShadow: elevationMap[elevation],
    overflow: 'hidden',
    margin: '0',
    marginInline: '0',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.6 : 1,
    cursor: interactive && !disabled ? 'pointer' : undefined,
    transition: 'all 0.2s ease',
    ...style,
  };

  return (
    <>
      <IonCard
        className={`fs-card fs-card--${elevation} ${selected ? 'fs-card--selected' : ''} ${interactive ? 'fs-card--interactive' : ''} ${className}`.trim()}
        style={combinedStyle}
        onClick={disabled ? undefined : onClick}
        data-testid={testId}
        disabled={disabled as any}
      >
        {image && (
          <div
            style={{
              width: '100%',
              height: imageHeight,
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
            }}
          >
            {(title || subtitle) && !children ? (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '16px',
                  background: 'linear-gradient(transparent, rgba(15,23,42,0.9))',
                }}
              >
                {subtitle && (
                  <div style={{ color: colors.text.secondary, fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                    {subtitle}
                  </div>
                )}
                {title && (
                  <div style={{ color: colors.text.primary, fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>{title}</div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {(title || subtitle) && (children || !image) && (
          <IonCardHeader
            style={{
              padding: paddingMap[padding],
              paddingBottom: children ? '8px' : paddingMap[padding],
              borderBottom: children && (title || subtitle) ? `1px solid ${colors.border.primary}` : 'none',
            }}
          >
            {subtitle && (
              <IonCardSubtitle
                style={{
                  color: colors.text.tertiary,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                {subtitle}
              </IonCardSubtitle>
            )}
            {title && (
              <IonCardTitle
                style={{
                  color: colors.text.primary,
                  fontSize: '16px',
                  fontWeight: 600,
                  lineHeight: '20px',
                }}
              >
                {title}
              </IonCardTitle>
            )}
          </IonCardHeader>
        )}

        <IonCardContent
          style={{
            padding: paddingMap[padding],
            color: colors.text.secondary,
            fontSize: '14px',
            lineHeight: '20px',
          }}
        >
          {children}
        </IonCardContent>
      </IonCard>

      {interactive && (
        <style>
          {`
            .fs-card--interactive:hover {
              transform: translateY(-1px);
              border-color: ${selected ? colors.brand.primary : colors.border.hover} !important;
              box-shadow: ${elevation === 'flat' ? elevationMap.low : elevationMap.high} !important;
              background: ${colors.surface.hover} !important;
            }
            .fs-card--interactive:active {
              transform: translateY(0);
              background: ${colors.surface.active} !important;
            }
          `}
        </style>
      )}
    </>
  );
};

export default FSCard;
