/**
 * Design Tokens - Z-Index
 * Система слоев для правильного наложения элементов
 * От карты (самый низкий) до модалок и тултипов (самый высокий)
 */

export const zIndex = {
  // Базовые слои
  hide: -1,
  base: 0,
  docked: 10,

  // Карта - самый низкий интерактивный слой
  map: {
    base: 0,
    tiles: 0,
    airspace: 10,
    flightPath: 20,
    airport: 30,
    aircraft: 40,
    aircraftSelected: 45,
    controls: 50,
  },

  // Контент
  content: 100,
  grid: 100,
  card: 100,
  cardHover: 110,

  // Навигация
  navbar: 200,
  sidebar: 200,
  sidebarOverlay: 190,
  header: 210,
  subHeader: 205,

  // Overlay / Dropdown
  dropdown: 300,
  popover: 350,
  tooltip: 400,
  sticky: 500,

  // Панели
  panel: 600,
  bottomPanel: 600,
  sidePanel: 610,
  commandPalette: 700,

  // Модальные окна
  overlay: 800, // затемнение фона
  modal: 810,
  modalNested: 820,

  // Критичные уведомления
  toast: 900,
  notification: 900,
  alert: 910,

  // Максимальный - для дебага и skip links
  skipLink: 9999,
  debug: 10000,
} as const;

// Вспомогательная функция для получения z-index с проверкой
export function getZIndex(layer: keyof typeof zIndex): number {
  const value = zIndex[layer];
  if (typeof value === 'number') return value;
  throw new Error(`Layer "${String(layer)}" is not a simple zIndex, use nested path`);
}

// Тип для автодополнения
export type ZIndex = typeof zIndex;

export default zIndex;
