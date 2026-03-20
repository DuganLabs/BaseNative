/**
 * Create an in-app notification center.
 * @returns {NotificationCenter}
 */
export function createNotificationCenter() {
  /** @type {Array<Notification>} */
  let notifications = [];
  /** @type {Set<(notifications: Array<Notification>) => void>} */
  const subscribers = new Set();

  function emit() {
    for (const cb of subscribers) {
      cb([...notifications]);
    }
  }

  return {
    /**
     * Add a notification.
     * @param {Partial<Notification> & { title: string, message: string }} notification
     */
    notify(notification) {
      const entry = {
        id: notification.id || crypto.randomUUID(),
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        read: notification.read ?? false,
        createdAt: notification.createdAt || new Date().toISOString(),
      };
      notifications.push(entry);
      emit();
      return entry;
    },

    /** Get all notifications. */
    getAll() {
      return [...notifications];
    },

    /** Get unread notifications. */
    getUnread() {
      return notifications.filter((n) => !n.read);
    },

    /** Mark a notification as read. */
    markRead(id) {
      const n = notifications.find((n) => n.id === id);
      if (n) {
        n.read = true;
        emit();
      }
    },

    /** Mark all notifications as read. */
    markAllRead() {
      for (const n of notifications) {
        n.read = true;
      }
      emit();
    },

    /** Remove a notification by id. */
    remove(id) {
      notifications = notifications.filter((n) => n.id !== id);
      emit();
    },

    /** Clear all notifications. */
    clear() {
      notifications = [];
      emit();
    },

    /**
     * Subscribe to notification changes.
     * @param {(notifications: Array<Notification>) => void} callback
     * @returns {() => void} Unsubscribe function.
     */
    subscribe(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
}
