/**
 * FSInput - Атом поля ввода FlightSim
 * Темная тема FR24, поддержка ошибок, иконок, моноширного для кодов
 * Основан на IonInput / IonTextarea
 */
import React from 'react';
import { IonInput, IonTextarea, IonItem, IonLabel, IonIcon, IonNote } from '@ionic/react';
import { colors } from '../../tokens/colors';

export type FSInputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url';
export type FSInputSize = 'sm' | 'md' | 'lg';
export type FSInputVariant = 'default' | 'filled' | 'outline' | 'ghost';

export interface FSInputProps {
  /** Лейбл поля */
  label?: string;
  /** Плейсхолдер */
  placeholder?: string;
  /** Тип инпута */
  type?: FSInputType;
  /** Значение */
  value?: string | number;
  /** Дефолтное значение */
  defaultValue?: string | number;
  /** Изменение значения */
  onChange?: (value: string) => void;
  /** Фокус / блюр */
  onFocus?: () => void;
  onBlur?: () => void;
  /** Вариант стиля */
  variant?: FSInputVariant;
  /** Размер */
  size?: FSInputSize;
  /** Ошибка */
  error?: string;
  /** Подсказка */
  helperText?: string;
  /** Иконка слева */
  icon?: string | React.ReactNode;
  /** Иконка справа (действие) */
  actionIcon?: string | React.ReactNode;
  /** Клик по иконке действия */
  onActionClick?: () => void;
  /** Отключен */
  disabled?: boolean;
  /** Только чтение */
  readonly?: boolean;
  /** Обязательное */
  required?: boolean;
  /** Очищаемое (крестик) */
  clearable?: boolean;
  /** Моноширный шрифт (для ICAO, flight numbers) */
  mono?: boolean;
  /** Многострочный */
  multiline?: boolean;
  /** Количество строк для textarea */
  rows?: number;
  /** Макс длина */
  maxLength?: number;
  /** Автофокус */
  autoFocus?: boolean;
  /** Имя поля */
  name?: string;
  /** Дополнительный класс */
  className?: string;
  /** Стили контейнера */
  style?: React.CSSProperties;
  /** testId */
  testId?: string;
}

export const FSInput: React.FC<FSInputProps> = ({
  label,
  placeholder,
  type = 'text',
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  variant = 'default',
  size = 'md',
  error,
  helperText,
  icon,
  actionIcon,
  onActionClick,
  disabled = false,
  readonly = false,
  required = false,
  clearable = false,
  mono = false,
  multiline = false,
  rows = 3,
  maxLength,
  autoFocus = false,
  name,
  className = '',
  style = {},
  testId,
}) => {
  const hasError = !!error;

  // Стили контейнера IonItem
  const itemStyle: React.CSSProperties = {
    '--background': variant === 'filled' ? colors.surface.secondary : colors.background.secondary,
    '--border-color': hasError ? colors.semantic.error : colors.border.primary,
    '--border-width': '1px',
    '--border-style': 'solid',
    '--border-radius': '8px',
    '--padding-start': '12px',
    '--inner-padding-end': '12px',
    '--min-height': size === 'sm' ? '36px' : size === 'lg' ? '52px' : '44px',
    marginBottom: '4px',
    ...(hasError ? { '--background': colors.semantic.errorBg } : {}),
    ...style,
  } as React.CSSProperties;

  const inputStyle: React.CSSProperties = {
    color: colors.text.primary,
    fontSize: size === 'sm' ? '13px' : size === 'lg' ? '16px' : '15px',
    fontFamily: mono ? 'JetBrains Mono, SFMono-Regular, Menlo, monospace' : undefined,
    fontWeight: mono ? 500 : 400,
  };

  const handleIonChange = (e: CustomEvent) => {
    const val = e.detail.value ?? '';
    onChange?.(val);
  };

  // Ионная иконка старта
  const startSlot = icon ? <span slot="start" style={{ display: 'flex', marginRight: '8px', color: colors.text.tertiary }}>{typeof icon === 'string' ? <IonIcon icon={icon} /> : icon}</span> : null;

  const endSlot = actionIcon ? (
    <span slot="end" style={{ display: 'flex', marginLeft: '8px', cursor: 'pointer', color: colors.text.tertiary }} onClick={onActionClick}>
      {typeof actionIcon === 'string' ? <IonIcon icon={actionIcon} /> : actionIcon}
    </span>
  ) : null;

  return (
    <div className={`fs-input-wrapper fs-input-wrapper--${size} ${className}`.trim()} style={{ width: '100%' }}>
      {/* Лейбл вынесен наружу IonItem для кастомизации */}
      {label && (
        <IonLabel
          style={{
            display: 'block',
            marginBottom: '6px',
            color: hasError ? colors.semantic.error : colors.text.secondary,
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.02em',
          }}
        >
          {label} {required && <span style={{ color: colors.semantic.error }}>*</span>}
        </IonLabel>
      )}

      <IonItem
        lines="none"
        style={itemStyle}
        disabled={disabled}
        className={`fs-input fs-input--${variant} fs-input--${size} ${hasError ? 'fs-input--error' : ''}`.trim()}
        data-testid={testId}
      >
        {startSlot}

        {multiline ? (
          <IonTextarea
            placeholder={placeholder}
            value={value as any}
            defaultValue={defaultValue as any}
            onIonChange={handleIonChange}
            onIonFocus={onFocus}
            onIonBlur={onBlur}
            disabled={disabled}
            readonly={readonly}
            autoGrow={false}
            rows={rows}
            maxlength={maxLength}
            autoFocus={autoFocus}
            name={name}
            style={inputStyle}
            clearOnEdit={false}
          />
        ) : (
          <IonInput
            placeholder={placeholder}
            type={type}
            value={value as any}
            defaultValue={defaultValue as any}
            onIonChange={handleIonChange}
            onIonFocus={onFocus}
            onIonBlur={onBlur}
            disabled={disabled}
            readonly={readonly}
            maxlength={maxLength}
            autofocus={autoFocus}
            name={name}
            style={inputStyle}
            clearInput={clearable}
          />
        )}

        {endSlot}
      </IonItem>

      {/* Helper / Error */}
      {(error || helperText) && (
        <IonNote
          style={{
            display: 'block',
            marginTop: '6px',
            paddingLeft: '4px',
            fontSize: '12px',
            color: hasError ? colors.semantic.error : colors.text.tertiary,
            lineHeight: '16px',
          }}
        >
          {error || helperText}
        </IonNote>
      )}
    </div>
  );
};

export default FSInput;
