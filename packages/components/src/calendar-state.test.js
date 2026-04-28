import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createCalendarState,
  createPipelineState,
  eventsCollide,
  updateEvent,
  getEventDuration,
} from './calendar-state.js';

describe('Calendar State Management', () => {
  describe('eventsCollide', () => {
    it('detects overlapping events', () => {
      const e1 = { start: '2025-06-02T09:00', end: '2025-06-02T11:00' };
      const e2 = { start: '2025-06-02T10:00', end: '2025-06-02T12:00' };
      assert.ok(eventsCollide(e1, e2));
    });

    it('returns false for non-overlapping events', () => {
      const e1 = { start: '2025-06-02T09:00', end: '2025-06-02T10:00' };
      const e2 = { start: '2025-06-02T10:00', end: '2025-06-02T11:00' };
      assert.ok(!eventsCollide(e1, e2));
    });

    it('detects collision when second event starts before first ends', () => {
      const e1 = { start: '2025-06-02T09:00', end: '2025-06-02T11:00' };
      const e2 = { start: '2025-06-02T08:00', end: '2025-06-02T10:00' };
      assert.ok(eventsCollide(e1, e2));
    });

    it('handles events on different days', () => {
      const e1 = { start: '2025-06-02T09:00', end: '2025-06-02T11:00' };
      const e2 = { start: '2025-06-03T09:00', end: '2025-06-03T11:00' };
      assert.ok(!eventsCollide(e1, e2));
    });
  });

  describe('updateEvent', () => {
    it('merges event properties', () => {
      const event = { id: '1', title: 'Meeting', status: 'scheduled' };
      const updated = updateEvent(event, { status: 'completed' });
      assert.equal(updated.id, '1');
      assert.equal(updated.title, 'Meeting');
      assert.equal(updated.status, 'completed');
    });

    it('does not mutate original event', () => {
      const event = { id: '1', title: 'Meeting' };
      updateEvent(event, { title: 'Updated' });
      assert.equal(event.title, 'Meeting');
    });
  });

  describe('getEventDuration', () => {
    it('calculates duration in minutes', () => {
      const duration = getEventDuration('2025-06-02T09:00', '2025-06-02T10:30');
      assert.equal(duration, 90);
    });

    it('handles duration across hours', () => {
      const duration = getEventDuration('2025-06-02T14:00', '2025-06-02T16:30');
      assert.equal(duration, 150);
    });

    it('returns zero for same time', () => {
      const duration = getEventDuration('2025-06-02T10:00', '2025-06-02T10:00');
      assert.equal(duration, 0);
    });
  });

  describe('createCalendarState', () => {
    it('initializes with empty events', () => {
      const cal = createCalendarState({ startDate: '2025-06-02' });
      assert.deepEqual(cal.events(), []);
    });

    it('initializes with provided events', () => {
      const event = { id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00' };
      const cal = createCalendarState({ startDate: '2025-06-02', initialEvents: [event] });
      assert.equal(cal.events().length, 1);
      assert.equal(cal.events()[0].title, 'Meeting');
    });

    it('returns current selected date', () => {
      const cal = createCalendarState({ startDate: '2025-06-02' });
      assert.equal(cal.selectedDate(), '2025-06-02');
    });

    it('adds a new event', () => {
      const cal = createCalendarState({ startDate: '2025-06-02' });
      const event = {
        id: 'e1',
        title: 'Job',
        start: '2025-06-02T09:00',
        end: '2025-06-02T11:00',
      };
      cal.addEvent(event);
      assert.equal(cal.events().length, 1);
      assert.equal(cal.getEvent('e1').title, 'Job');
    });

    it('normalizes event status to "scheduled" by default', () => {
      const cal = createCalendarState({ startDate: '2025-06-02' });
      const event = {
        id: 'e1',
        title: 'Job',
        start: '2025-06-02T09:00',
        end: '2025-06-02T11:00',
      };
      const added = cal.addEvent(event);
      assert.equal(added.status, 'scheduled');
    });

    it('removes an event', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [{ id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00' }],
      });
      assert.ok(cal.removeEvent('1'));
      assert.equal(cal.events().length, 0);
    });

    it('returns false when removing non-existent event', () => {
      const cal = createCalendarState({ startDate: '2025-06-02' });
      assert.ok(!cal.removeEvent('nonexistent'));
    });

    it('moves event to a new date/time', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [{ id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00' }],
      });

      const moved = cal.moveEvent('1', '2025-06-03', 14);
      assert.ok(moved);
      assert.ok(moved.start.includes('2025-06-03'));
      assert.ok(moved.end.includes('2025-06-03'));
      const duration = getEventDuration(moved.start, moved.end);
      assert.equal(duration, 60); // Should preserve 1 hour duration
    });

    it('detects collision when moving event', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [
          { id: '1', title: 'Meeting A', start: '2025-06-02T09:00', end: '2025-06-02T11:00' },
          { id: '2', title: 'Meeting B', start: '2025-06-03T14:00', end: '2025-06-03T16:00' },
        ],
      });

      const moved = cal.moveEvent('1', '2025-06-03', 14);
      assert.ok(!moved, 'Should return null when collision detected');
    });

    it('calls onError callback on collision', () => {
      let errorCalled = false;
      let errorData = null;
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [
          { id: '1', title: 'A', start: '2025-06-02T09:00', end: '2025-06-02T11:00' },
          { id: '2', title: 'B', start: '2025-06-03T14:00', end: '2025-06-03T16:00' },
        ],
      });

      cal.onError = (err) => {
        errorCalled = true;
        errorData = err;
      };

      cal.moveEvent('1', '2025-06-03', 14);
      assert.ok(errorCalled);
      assert.equal(errorData.type, 'collision');
      assert.equal(errorData.eventId, '1');
    });

    it('calls onEventMove callback on successful move', () => {
      let moveCalled = false;
      let moveData = null;
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [{ id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00' }],
      });

      cal.onEventMove = (data) => {
        moveCalled = true;
        moveData = data;
      };

      cal.moveEvent('1', '2025-06-03', 14);
      assert.ok(moveCalled);
      assert.equal(moveData.eventId, '1');
      assert.equal(moveData.date, '2025-06-03');
      assert.equal(moveData.hour, 14);
    });

    it('preserves event duration when moving', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [{ id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T11:30' }],
      });

      const moved = cal.moveEvent('1', '2025-06-03', 10);
      const duration = getEventDuration(moved.start, moved.end);
      assert.equal(duration, 150); // 2.5 hours = 150 minutes
    });

    it('allows custom duration when moving', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [{ id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00' }],
      });

      const moved = cal.moveEvent('1', '2025-06-03', 14, 120);
      const duration = getEventDuration(moved.start, moved.end);
      assert.equal(duration, 120);
    });

    it('updates event properties without moving', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [
          { id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00', status: 'scheduled' },
        ],
      });

      const updated = cal.updateEventProperties('1', { status: 'completed' });
      assert.equal(updated.status, 'completed');
      assert.equal(updated.start, '2025-06-02T09:00');
    });

    it('returns null when updating non-existent event', () => {
      const cal = createCalendarState({ startDate: '2025-06-02' });
      const updated = cal.updateEventProperties('nonexistent', { status: 'completed' });
      assert.ok(!updated);
    });

    it('clears all events', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [
          { id: '1', title: 'A', start: '2025-06-02T09:00', end: '2025-06-02T10:00' },
          { id: '2', title: 'B', start: '2025-06-02T14:00', end: '2025-06-02T15:00' },
        ],
      });

      cal.clearEvents();
      assert.equal(cal.events().length, 0);
    });

    it('gets events in a date range', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [
          { id: '1', title: 'A', start: '2025-06-02T09:00', end: '2025-06-02T10:00' },
          { id: '2', title: 'B', start: '2025-06-03T14:00', end: '2025-06-03T15:00' },
          { id: '3', title: 'C', start: '2025-06-05T10:00', end: '2025-06-05T11:00' },
        ],
      });

      const range = cal.getEventsInRange('2025-06-02', '2025-06-03');
      assert.equal(range.length, 2);
    });

    it('gets events for a specific day', () => {
      const cal = createCalendarState({
        startDate: '2025-06-02',
        initialEvents: [
          { id: '1', title: 'A', start: '2025-06-02T09:00', end: '2025-06-02T10:00' },
          { id: '2', title: 'B', start: '2025-06-02T14:00', end: '2025-06-02T15:00' },
          { id: '3', title: 'C', start: '2025-06-03T10:00', end: '2025-06-03T11:00' },
        ],
      });

      const day = cal.getEventsForDay('2025-06-02');
      assert.equal(day.length, 2);
      assert.ok(day.every(e => e.start.startsWith('2025-06-02')));
    });

    it('manages drag state', () => {
      const cal = createCalendarState({ startDate: '2025-06-02' });
      assert.equal(cal.dragState(), null);

      cal.setDragState('event-1');
      assert.equal(cal.dragState(), 'event-1');

      cal.setDragState(null);
      assert.equal(cal.dragState(), null);
    });

    it('calls onDragStateChange callback', () => {
      let dragStateChanged = false;
      let dragStateValue = null;
      const cal = createCalendarState({ startDate: '2025-06-02' });

      cal.onDragStateChange = (state) => {
        dragStateChanged = true;
        dragStateValue = state;
      };

      cal.setDragState('event-1');
      assert.ok(dragStateChanged);
      assert.equal(dragStateValue, 'event-1');
    });

    it('calls onEventChange callback on add', () => {
      let changeCalled = false;
      let changeData = null;
      const cal = createCalendarState({ startDate: '2025-06-02' });

      cal.onEventChange = (data) => {
        changeCalled = true;
        changeData = data;
      };

      cal.addEvent({ id: '1', title: 'Meeting', start: '2025-06-02T09:00', end: '2025-06-02T10:00' });
      assert.ok(changeCalled);
      assert.equal(changeData.type, 'add');
      assert.equal(changeData.event.id, '1');
    });
  });
});

describe('Pipeline State Management', () => {
  describe('createPipelineState', () => {
    it('initializes with columns and cards', () => {
      const pipeline = createPipelineState({
        columns: [
          { id: 'new', title: 'New' },
          { id: 'qualified', title: 'Qualified' },
        ],
        initialCards: [
          { id: 'c1', columnId: 'new', title: 'Lead 1' },
        ],
      });

      assert.equal(pipeline.columns().length, 2);
      assert.equal(pipeline.cards().length, 1);
    });

    it('adds a new card to a column', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
      });

      pipeline.addCard({ id: 'c1', columnId: 'new', title: 'Lead 1' });
      assert.equal(pipeline.cards().length, 1);
      assert.equal(pipeline.getCard('c1').title, 'Lead 1');
    });

    it('removes a card', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
        initialCards: [{ id: 'c1', columnId: 'new', title: 'Lead 1' }],
      });

      assert.ok(pipeline.removeCard('c1'));
      assert.equal(pipeline.cards().length, 0);
    });

    it('returns false when removing non-existent card', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
      });

      assert.ok(!pipeline.removeCard('nonexistent'));
    });

    it('moves a card to another column', () => {
      const pipeline = createPipelineState({
        columns: [
          { id: 'new', title: 'New' },
          { id: 'qualified', title: 'Qualified' },
        ],
        initialCards: [{ id: 'c1', columnId: 'new', title: 'Lead 1' }],
      });

      const moved = pipeline.moveCard('c1', 'qualified');
      assert.ok(moved);
      assert.equal(moved.columnId, 'qualified');
      assert.equal(pipeline.getCard('c1').columnId, 'qualified');
    });

    it('returns null when moving non-existent card', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
      });

      const moved = pipeline.moveCard('nonexistent', 'new');
      assert.ok(!moved);
    });

    it('returns null when moving to non-existent column', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
        initialCards: [{ id: 'c1', columnId: 'new', title: 'Lead 1' }],
      });

      const moved = pipeline.moveCard('c1', 'nonexistent');
      assert.ok(!moved);
    });

    it('calls onCardMove callback', () => {
      let moveCalledData = null;
      const pipeline = createPipelineState({
        columns: [
          { id: 'new', title: 'New' },
          { id: 'qualified', title: 'Qualified' },
        ],
        initialCards: [{ id: 'c1', columnId: 'new', title: 'Lead 1' }],
      });

      pipeline.onCardMove = (data) => {
        moveCalledData = data;
      };

      pipeline.moveCard('c1', 'qualified');
      assert.ok(moveCalledData);
      assert.equal(moveCalledData.cardId, 'c1');
      assert.equal(moveCalledData.targetColumnId, 'qualified');
    });

    it('reorders cards within a column', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
        initialCards: [
          { id: 'c1', columnId: 'new', title: 'Lead 1' },
          { id: 'c2', columnId: 'new', title: 'Lead 2' },
          { id: 'c3', columnId: 'new', title: 'Lead 3' },
        ],
      });

      pipeline.reorderCards('new', ['c3', 'c1', 'c2']);
      const cards = pipeline.getCardsInColumn('new');
      assert.equal(cards[0].id, 'c3');
      assert.equal(cards[1].id, 'c1');
      assert.equal(cards[2].id, 'c2');
    });

    it('updates a card', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
        initialCards: [{ id: 'c1', columnId: 'new', title: 'Lead 1', status: 'hot' }],
      });

      const updated = pipeline.updateCard('c1', { status: 'cold' });
      assert.equal(updated.status, 'cold');
      assert.equal(updated.title, 'Lead 1');
      assert.equal(updated.columnId, 'new');
    });

    it('returns null when updating non-existent card', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
      });

      const updated = pipeline.updateCard('nonexistent', { status: 'cold' });
      assert.ok(!updated);
    });

    it('gets cards in a column', () => {
      const pipeline = createPipelineState({
        columns: [
          { id: 'new', title: 'New' },
          { id: 'qualified', title: 'Qualified' },
        ],
        initialCards: [
          { id: 'c1', columnId: 'new', title: 'Lead 1' },
          { id: 'c2', columnId: 'qualified', title: 'Lead 2' },
          { id: 'c3', columnId: 'new', title: 'Lead 3' },
        ],
      });

      const newCards = pipeline.getCardsInColumn('new');
      assert.equal(newCards.length, 2);
      assert.ok(newCards.every(c => c.columnId === 'new'));
    });

    it('manages drag state', () => {
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
      });

      assert.equal(pipeline.dragState(), null);

      pipeline.setDragState('card-1');
      assert.equal(pipeline.dragState(), 'card-1');

      pipeline.setDragState(null);
      assert.equal(pipeline.dragState(), null);
    });

    it('calls onDragStateChange callback', () => {
      let dragStateChanged = false;
      let dragStateValue = null;
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
      });

      pipeline.onDragStateChange = (state) => {
        dragStateChanged = true;
        dragStateValue = state;
      };

      pipeline.setDragState('card-1');
      assert.ok(dragStateChanged);
      assert.equal(dragStateValue, 'card-1');
    });

    it('calls onCardChange callback on add', () => {
      let changeCalled = false;
      let changeData = null;
      const pipeline = createPipelineState({
        columns: [{ id: 'new', title: 'New' }],
      });

      pipeline.onCardChange = (data) => {
        changeCalled = true;
        changeData = data;
      };

      pipeline.addCard({ id: 'c1', columnId: 'new', title: 'Lead 1' });
      assert.ok(changeCalled);
      assert.equal(changeData.type, 'add');
      assert.equal(changeData.card.id, 'c1');
    });

    it('calls onCardChange callback on move', () => {
      let changeCalled = false;
      let changeData = null;
      const pipeline = createPipelineState({
        columns: [
          { id: 'new', title: 'New' },
          { id: 'qualified', title: 'Qualified' },
        ],
        initialCards: [{ id: 'c1', columnId: 'new', title: 'Lead 1' }],
      });

      pipeline.onCardChange = (data) => {
        changeCalled = true;
        changeData = data;
      };

      pipeline.moveCard('c1', 'qualified');
      assert.ok(changeCalled);
      assert.equal(changeData.type, 'move');
      assert.equal(changeData.card.columnId, 'qualified');
    });
  });
});
