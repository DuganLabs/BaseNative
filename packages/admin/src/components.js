// Built with BaseNative — basenative.dev
/**
 * Server-rendered (or hydratable) building blocks for the admin surface.
 *
 * Returns plain HTML strings. Compatible with `@basenative/components` —
 * theming flows through CSS custom properties on the wrapping element. No
 * framework lock-in, no JSX, no hydration assumptions.
 *
 * Accessibility:
 *   - The queue list is a `role="list"` of `role="listitem"`s.
 *   - Each row has labelled action buttons.
 *   - The user list's search input is labelled and uses `type="search"`.
 *   - Role badges use both colour and text so colour-blind users aren't
 *     locked out.
 *
 * Theming:
 *   --bn-admin-bg, --bn-admin-fg, --bn-admin-muted, --bn-admin-accent
 *   --bn-admin-ok, --bn-admin-bad, --bn-admin-danger
 *
 * @module
 */

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * @typedef {object} QueueRow
 * @property {number|string} id
 * @property {string} category
 * @property {string} phrase
 * @property {string} submittedBy
 * @property {number} [created_at]
 */

/**
 * Render the moderation queue list.
 *
 * @param {{
 *   items: QueueRow[],
 *   approveLabel?: string,
 *   rejectLabel?: string,
 *   emptyLabel?: string,
 *   actionHandler?: string,
 * }} opts
 */
export function renderAdminQueueList({
  items,
  approveLabel = 'APPROVE',
  rejectLabel = 'REJECT',
  emptyLabel = 'queue empty.',
  actionHandler = 'bn-admin-decide',
} = {}) {
  if (!Array.isArray(items)) return '';
  if (items.length === 0) {
    return `<div class="bn-admin-empty" role="status">${esc(emptyLabel)}</div>`;
  }
  const rows = items.map((s) => `
    <li class="bn-admin-queue__item" role="listitem" data-id="${esc(s.id)}">
      <div class="bn-admin-queue__meta">
        <span class="bn-admin-queue__cat">${esc(s.category)}</span>
        <span class="bn-admin-queue__by">by ${esc(s.submittedBy)}</span>
      </div>
      <div class="bn-admin-queue__phrase">${esc(s.phrase)}</div>
      <div class="bn-admin-queue__actions">
        <button type="button" class="bn-admin-btn bn-admin-btn--ok"
                data-action="${esc(actionHandler)}"
                data-decision="approved" data-id="${esc(s.id)}"
                aria-label="Approve submission ${esc(s.id)}">${esc(approveLabel)}</button>
        <button type="button" class="bn-admin-btn bn-admin-btn--no"
                data-action="${esc(actionHandler)}"
                data-decision="rejected" data-id="${esc(s.id)}"
                aria-label="Reject submission ${esc(s.id)}">${esc(rejectLabel)}</button>
      </div>
    </li>`).join('');
  return `<ul class="bn-admin-queue" role="list" data-bn="admin-queue-list">${rows}</ul>`;
}

/**
 * @typedef {object} UserRow
 * @property {string} id
 * @property {string} handle
 * @property {string} role
 */

/**
 * Render the admin user-management list with search and per-row role
 * controls.
 *
 * @param {{
 *   users: UserRow[],
 *   results?: UserRow[]|null,
 *   query?: string,
 *   currentHandle?: string,
 *   roles?: string[],
 *   labels?: { search?: string, currentSection?: string, resultsSection?: string, none?: string },
 *   actionHandler?: string,
 *   searchHandler?: string,
 * }} opts
 */
export function renderAdminUserList({
  users,
  results = null,
  query = '',
  currentHandle = '',
  roles = ['user', 'moderator', 'admin'],
  labels = {},
  actionHandler = 'bn-admin-set-role',
  searchHandler = 'bn-admin-search',
} = {}) {
  const L = {
    search: 'Search users by handle…',
    currentSection: 'Moderators & admins',
    resultsSection: 'Search results',
    none: 'none yet.',
    ...labels,
  };
  const renderRow = (u) => {
    const isSelf = currentHandle && u.handle === currentHandle;
    const buttons = roles
      .filter((r) => r !== u.role)
      .map((r) => {
        const danger = r === roles[0]; // demote to lowest tier
        const cls = `bn-admin-btn ${danger ? 'bn-admin-btn--danger' : ''}`.trim();
        const verb = danger ? 'REMOVE' : `MAKE ${r.toUpperCase()}`;
        return `<button type="button" class="${cls}"
          data-action="${esc(actionHandler)}"
          data-user-id="${esc(u.id)}" data-handle="${esc(u.handle)}" data-role="${esc(r)}"
          aria-label="Set ${esc(u.handle)} to ${esc(r)}"
          ${isSelf && danger ? 'data-confirm="Demote yourself? You will lose access immediately."' : ''}>${esc(verb)}</button>`;
      }).join('');
    return `
    <div class="bn-admin-row" role="listitem">
      <span class="bn-admin-row__handle">${esc(u.handle)}${isSelf ? ' <small>(you)</small>' : ''}</span>
      <span class="bn-admin-role bn-admin-role--${esc(u.role)}" aria-label="role: ${esc(u.role)}">${esc(u.role)}</span>
      <div class="bn-admin-row__actions">${buttons}</div>
    </div>`;
  };

  const resultsBlock = results
    ? `<div class="bn-admin-section">${esc(L.resultsSection)}</div>` +
      (results.length === 0
        ? `<div class="bn-admin-empty">no matches.</div>`
        : `<div role="list">${results.map(renderRow).join('')}</div>`)
    : '';

  const currentBlock = `<div class="bn-admin-section">${esc(L.currentSection)}</div>` +
    (!users || users.length === 0
      ? `<div class="bn-admin-empty">${esc(L.none)}</div>`
      : `<div role="list">${users.map(renderRow).join('')}</div>`);

  return `<div class="bn-admin" data-bn="admin-user-list">
    <label class="bn-admin-search-wrap">
      <span class="bn-sr-only">${esc(L.search)}</span>
      <input type="search" class="bn-admin-search"
             data-action="${esc(searchHandler)}"
             value="${esc(query)}"
             placeholder="${esc(L.search)}"
             autocorrect="off" autocapitalize="off"
             aria-label="${esc(L.search)}" />
    </label>
    ${resultsBlock}
    ${currentBlock}
  </div>`;
}
