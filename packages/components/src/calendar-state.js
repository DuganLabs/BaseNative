/**
 * Signal-based state management for calendar and pipeline components.
 *
 * Provides reactive state using BaseNative signals: event management, collision detection,
 * and drag-drop orchestration. Works with or without DOM (testable on server).
 *
 * Usage:
 *   const cal = createCalendarState({ startDate: '2025-06-02' });
 *   cal.events() // -> [...]
 *   cal.addEvent({ id: '1', title: 'Meeting', start: '2025-06-02T09:00', ... })
 *   cal.moveEvent('1', '2025-06-03', 14) // move to June 3 at 2pm
 *   cal.onEventMove = ({ eventId, date, hour }) => { ... }
 */

/**
 * Check if two events collide in the calendar.
 * @param {object} event1 - Event with start/end ISO strings
 * @param {object} event2 - Event with start/end ISO strings
 * @returns {boolean}
 */
export function eventsCollide(event1, event2) {
  const s1 = new Date(event1.start).getTime();
  const e1 = new Date(event1.end).getTime();
  const s2 = new Date(event2.start).getTime();
  const e2 = new Date(event2.end).getTime();
  return s1 < e2 && e1 > s2;
}

/**
 * Create a new event object with merged properties.
 * @param {object} event - Base event
 * @param {object} overrides - Properties to override
 * @returns {object}
 */
export function updateEvent(event, overrides) {
  return { ...event, ...overrides };
}

/**
 * Calculate duration in minutes between ISO datetime strings.
 * @param {string} start - ISO datetime
 * @param {string} end - ISO datetime
 * @returns {number}
 */
export function getEventDuration(start, end) {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

/**
 * Create a calendar state container with signal-based reactive events.
 *
 * @param {object} options
 * @param {string} options.startDate - ISO date string (YYYY-MM-DD)
 * @param {Array} [options.initialEvents] - Array of event objects
 * @param {object} [options.hours] - { start: 7, end: 19 }
 * @returns {object} Calendar state with signal methods
 */
export function createCalendarState(options = {}) {
  const { startDate, initialEvents = [], hours = {} } = options;
  const hourStart = hours.start ?? 7;
  const hourEnd = hours.end ?? 19;

  // State signals would be injected by @basenative/runtime,
  // but for testability, we expose as a mock
  let eventsData = [...initialEvents];
  let selectedDateData = startDate;
  let dragStateData = null;

  const state = {
    events: () => [...eventsData],
    selectedDate: () => selectedDateData,
    dragState: () => dragStateData,

    getEvent: (id) => eventsData.find(e => e.id === id),

    addEvent: (event) => {
      const normalized = {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        status: event.status || 'scheduled',
        ...event,
      };
      eventsData = [...eventsData, normalized];
      state.onEventChange?.({ type: 'add', event: normalized });
      return normalized;
    },

    removeEvent: (id) => {
      const event = state.getEvent(id);
      if (!event) return false;
      eventsData = eventsData.filter(e => e.id !== id);
      state.onEventChange?.({ type: 'remove', event });
      return true;
    },

    /**
     * Move event to a new date/time slot. Checks for collisions.
     * @param {string} id - Event ID
     * @param {string} date - Target date (YYYY-MM-DD)
     * @param {number} hour - Target hour (0-23)
     * @param {number} [durationMinutes] - Keep original duration if not specified
     * @returns {object|null} Updated event or null if collision/not found
     */
    moveEvent: (id, date, hour, durationMinutes = null) => {
      const event = state.getEvent(id);
      if (!event) return null;

      const duration = durationMinutes ?? getEventDuration(event.start, event.end);
      const newStart = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`);
      const newEnd = new Date(newStart.getTime() + duration * 60000);

      const proposed = {
        ...event,
        start: newStart.toISOString(),
        end: newEnd.toISOString(),
      };

      // Check for collisions with other events
      const collision = eventsData.some(
        e => e.id !== id && eventsCollide(e, proposed)
      );

      if (collision) {
        state.onError?.({
          type: 'collision',
          eventId: id,
          targetDate: date,
          targetHour: hour,
        });
        return null;
      }

      eventsData = eventsData.map(e => (e.id === id ? proposed : e));
      state.onEventChange?.({ type: 'move', event: proposed });
      state.onEventMove?.({ eventId: id, date, hour });
      return proposed;
    },

    /**
     * Update event properties (status, color, etc) without moving.
     * @param {string} id - Event ID
     * @param {object} overrides - Properties to update
     * @returns {object|null} Updated event or null if not found
     */
    updateEventProperties: (id, overrides) => {
      const event = state.getEvent(id);
      if (!event) return null;
      const updated = updateEvent(event, overrides);
      eventsData = eventsData.map(e => (e.id === id ? updated : e));
      state.onEventChange?.({ type: 'update', event: updated });
      return updated;
    },

    /**
     * Set drag state for UI feedback.
     * @param {string|null} id - Event being dragged, or null
     */
    setDragState: (id) => {
      dragStateData = id;
      state.onDragStateChange?.(id);
    },

    /**
     * Clear all events.
     */
    clearEvents: () => {
      eventsData = [];
      state.onEventChange?.({ type: 'clear' });
    },

    /**
     * Get events within a time range.
     * @param {string} startDate - ISO date (YYYY-MM-DD)
     * @param {string} [endDate] - ISO date, defaults to startDate
     * @returns {Array}
     */
    getEventsInRange: (startDate, endDate = startDate) => {
      const sd = new Date(`${startDate}T00:00:00`).getTime();
      const ed = new Date(`${endDate}T23:59:59`).getTime();
      return eventsData.filter(e => {
        const es = new Date(e.start).getTime();
        const ee = new Date(e.end).getTime();
        return es <= ed && ee >= sd;
      });
    },

    /**
     * Get events for a specific day.
     * @param {string} date - ISO date (YYYY-MM-DD)
     * @returns {Array}
     */
    getEventsForDay: (date) => state.getEventsInRange(date, date),

    // Callbacks (can be set by user)
    onEventChange: null,
    onEventMove: null,
    onError: null,
    onDragStateChange: null,
  };

  return state;
}

/**
 * Create a pipeline state container for kanban-style workflow.
 *
 * @param {object} options
 * @param {Array} [options.columns] - Column definitions: [{ id: 'new', title: 'New' }, ...]
 * @param {Array} [options.initialCards] - Card definitions: [{ id: 'c1', columnId: 'new', title: 'Card', ... }, ...]
 * @returns {object} Pipeline state with signal-like methods
 */
export function createPipelineState(options = {}) {
  const { columns = [], initialCards = [] } = options;

  let columnsData = [...columns];
  let cardsData = [...initialCards];
  let dragStateData = null;

  const state = {
    columns: () => [...columnsData],
    cards: () => [...cardsData],
    dragState: () => dragStateData,

    getCard: (id) => cardsData.find(c => c.id === id),
    getColumn: (id) => columnsData.find(c => c.id === id),

    /**
     * Add a new card to a column.
     * @param {object} card - Card properties (must include id, columnId, title)
     * @returns {object} Added card
     */
    addCard: (card) => {
      const normalized = {
        id: card.id,
        columnId: card.columnId,
        title: card.title,
        ...card,
      };
      cardsData = [...cardsData, normalized];
      state.onCardChange?.({ type: 'add', card: normalized });
      return normalized;
    },

    /**
     * Remove a card.
     * @param {string} id - Card ID
     * @returns {boolean}
     */
    removeCard: (id) => {
      const card = state.getCard(id);
      if (!card) return false;
      cardsData = cardsData.filter(c => c.id !== id);
      state.onCardChange?.({ type: 'remove', card });
      return true;
    },

    /**
     * Move a card to a new column.
     * @param {string} id - Card ID
     * @param {string} targetColumnId - Target column ID
     * @param {number} [position] - Position within column (append if not specified)
     * @returns {object|null} Updated card or null if not found
     */
    moveCard: (id, targetColumnId, position = null) => {
      const card = state.getCard(id);
      if (!card) return null;

      const column = state.getColumn(targetColumnId);
      if (!column) return null;

      const updated = { ...card, columnId: targetColumnId };
      cardsData = cardsData.map(c => (c.id === id ? updated : c));

      state.onCardChange?.({ type: 'move', card: updated });
      state.onCardMove?.({ cardId: id, targetColumnId, position });
      return updated;
    },

    /**
     * Reorder cards within a column.
     * @param {string} columnId - Column ID
     * @param {Array<string>} cardOrder - Array of card IDs in desired order
     */
    reorderCards: (columnId, cardOrder) => {
      const columnCards = cardsData.filter(c => c.columnId === columnId);
      const orderMap = new Map(cardOrder.map((id, idx) => [id, idx]));

      cardsData = cardsData.sort((a, b) => {
        if (a.columnId !== columnId || b.columnId !== columnId) {
          return cardsData.indexOf(a) - cardsData.indexOf(b);
        }
        return (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999);
      });

      state.onCardChange?.({ type: 'reorder', columnId, cardOrder });
    },

    /**
     * Update card properties.
     * @param {string} id - Card ID
     * @param {object} overrides - Properties to update
     * @returns {object|null}
     */
    updateCard: (id, overrides) => {
      const card = state.getCard(id);
      if (!card) return null;
      const updated = { ...card, ...overrides };
      cardsData = cardsData.map(c => (c.id === id ? updated : c));
      state.onCardChange?.({ type: 'update', card: updated });
      return updated;
    },

    /**
     * Get cards in a column.
     * @param {string} columnId
     * @returns {Array}
     */
    getCardsInColumn: (columnId) => cardsData.filter(c => c.columnId === columnId),

    /**
     * Set drag state for UI feedback.
     * @param {string|null} id - Card being dragged
     */
    setDragState: (id) => {
      dragStateData = id;
      state.onDragStateChange?.(id);
    },

    // Callbacks
    onCardChange: null,
    onCardMove: null,
    onDragStateChange: null,
  };

  return state;
}
