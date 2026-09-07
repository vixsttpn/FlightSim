/**
 * FSModal - Атом модального окна FlightSim
 * Темная модалка в стиле FR24 с акцентным бордером сверху
 * Обертка над IonModal
 */
import React from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonFooter } from '@ionic/react';
import { closeOutline } from 'ionicons/icons';
import { colors } from '../../tokens/colors';

export type FSModalSize = 'sm' | 'md' | 'lg' | 'full' | 'auto';
export type FSModalVariant = 'default' | 'centered' | 'bottomSheet' | 'fullscreen';

export interface FSModalProps {
  /** Открыто ли */
  isOpen: boolean;
  /** Закрытие */
  onDidDismiss?: () => void;
  /** Заголовок */
  title?: string;
  /** Подзаголовок */
  subtitle?: string;
  /** Контент */
  children: React.ReactNode;
  /** Размер */
  size?: FSModalSize;
  /** Вариант позиционирования */
  variant?: FSModalVariant;
  /** Показывать крестик закрытия */
  showClose?: boolean;
  /** Закрытие по клику на backdrop */
  backdropDismiss?: boolean;
  /** Футер (кнопки) */
  footer?: React.ReactNode;
  /** Дополнительный класс */
  className?: string;
  /** Стили */
  style?: React.CSSProperties;
  /** Начальный breakpoint для bottomSheet */
  initialBreakpoint?: number;
  /** breakpoints */
  breakpoints?: number[];
  /** testId */
  testId?: string;
  /** Не показывать header даже если есть title */
  hideHeader?: boolean;
}

const sizeStyles: Record<FSModalSize, React.CSSProperties> = {
  sm: { '--width': '360px', '--max-width': '90vw' },
  md: { '--width': '480px', '--max-width': '90vw' },
  lg: { '--width': '640px', '--max-width': '90vw' },
  full: { '--width': '100%', '--height': '100%', '--border-radius': '0' },
  auto: { '--width': 'auto', '--height': 'auto' },
} as any;

export const FSModal: React.FC<FSModalProps> = ({
  isOpen,
  onDidDismiss,
  title,
  subtitle,
  children,
  size = 'md',
  variant = 'centered',
  showClose = true,
  backdropDismiss = true,
  footer,
  className = '',
  style = {},
  initialBreakpoint = 0.6,
  breakpoints = [0, 0.6, 0.9],
  testId,
  hideHeader = false,
}) => {
  const isBottomSheet = variant === 'bottomSheet';

  const modalStyle: React.CSSProperties = {
    '--background': colors.background.secondary,
    '--border-radius': variant === 'centered' ? '16px' : variant === 'bottomSheet' ? '20px 20px 0 0' : '0',
    '--box-shadow': '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
    // Размер
    ...(size !== undefined ? sizeStyles[size] : {}),
    // Декоративный топ бордер брендовый
    ...style,
  } as React.CSSProperties;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDidDismiss}
      backdropDismiss={backdropDismiss}
      className={`fs-modal fs-modal--${variant} fs-modal--${size} ${className}`.trim()}
      style={modalStyle}
      initialBreakpoint={isBottomSheet ? initialBreakpoint : undefined}
      breakpoints={isBottomSheet ? breakpoints : undefined}
      handleBehavior={isBottomSheet ? 'cycle' : undefined}
      data-testid={testId}
    >
      {/* Кнопка закрытия */}
      {/* Header */}
      {!hideHeader && (title || subtitle || showClose) && (
        <IonHeader
          style={{
            background: colors.background.secondary,
            boxShadow: 'none',
            borderBottom: `1px solid ${colors.border.primary}`,
            position: 'relative',
          }}
        >
          {/* Акцентная линия сверху как в FR24 */}
          <div
            style={{
              height: '3px',
              width: '100%',
              background: `linear-gradient(90deg, ${colors.brand.primary} 0%, #9333EA 100%)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          />

          {/* Drag handle для bottomSheet */}
          {isBottomSheet && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: colors.border.primary }} />
            </div>
          )}

          <IonToolbar
            style={{
              '--background': colors.background.secondary,
              '--color': colors.text.primary,
              '--min-height': '56px',
              '--padding-start': '16px',
              '--padding-end': '8px',
            }}
          >
            <IonTitle
              style={{
                color: colors.text.primary,
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                paddingInline: '0',
              }}
            >
              {title}
              {subtitle && (
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 400,
                    color: colors.text.tertiary,
                    marginTop: '2px',
                    lineHeight: '16px',
                  }}
                >
                  {subtitle}
                </div>
              )}
            </IonTitle>

            {showClose && (
              <IonButtons slot="end">
                <IonButton
                  onClick={onDidDismiss}
                  style={{
                    '--color': colors.text.tertiary,
                    '--background-hover': colors.surface.hover,
                    '--border-radius': '8px',
                  }}
                >
                  <IonIcon icon={closeOutline} slot="icon-only" style={{ fontSize: '22px' }} />
                </IonButton>
              </IonButtons>
            )}
          </IonToolbar>
        </IonHeader>
      )}

      {/* Контент */}
      <IonContent
        style={{
          '--background': colors.background.secondary,
          '--color': colors.text.secondary,
          '--padding-start': '16px',
          '--padding-end': '16px',
          '--padding-top': '16px',
          '--padding-bottom': '16px',
        }}
        className="fs-modal__content"
      >
        <div
          style={{
            color: colors.text.secondary,
            fontSize: '14px',
            lineHeight: '20px',
          }}
        >
          {children}
        </div>
      </IonContent>

      {/* Footer */}
      {footer && (
        <IonFooter
          style={{
            background: colors.background.secondary,
            borderTop: `1px solid ${colors.border.primary}`,
          }}
        >
          <IonToolbar
            style={{
              '--background': colors.background.secondary,
              '--padding-start': '16px',
              '--padding-end': '16px',
              '--min-height': '64px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>{footer}</div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonModal>
  );
};

export default FSModal;
