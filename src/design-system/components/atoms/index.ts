/**
 * Индекс атомов дизайн-системы FlightSim
 * Экспорт всех атомарных компонентов
 * Используются как базовые building blocks для молекул и организмов
 */

// Button
export { FSButton, default as FSButtonDefault } from './FSButton';
export type { FSButtonProps, FSButtonVariant, FSButtonSize, FSButtonFill } from './FSButton';

// Text
export { FSText } from './FSText';
export type { FSTextProps, FSTextVariant, FSTextColor, FSTextWeight, FSTextAlign } from './FSText';

// Badge
export { FSBadge } from './FSBadge';
export type { FSBadgeProps, FSBadgeVariant, FSBadgeSize, FSBadgeShape } from './FSBadge';

// Chip
export { FSChip } from './FSChip';
export type { FSChipProps, FSChipVariant, FSChipSize } from './FSChip';

// Card
export { FSCard } from './FSCard';
export type { FSCardProps, FSCardElevation, FSCardPadding } from './FSCard';

// Icon
export { FSIcon } from './FSIcon';
export type { FSIconProps, FSIconSize, FSIconColor } from './FSIcon';

// Input
export { FSInput } from './FSInput';
export type { FSInputProps, FSInputType, FSInputSize, FSInputVariant } from './FSInput';

// Modal
export { FSModal } from './FSModal';
export type { FSModalProps, FSModalSize, FSModalVariant } from './FSModal';
