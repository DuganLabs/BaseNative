// @ts-check
/* Shared open/close behavior for the native-<dialog> components
   (dialog, drawer). showModal supplies the focus trap, Escape-to-
   close and focus return to the invoker natively; this adds the
   parts the platform leaves to the component: resolving the dialog
   element from an event or the component's id, backdrop-click
   dismissal, and an onChange report. Client-only by nature — every
   entry point no-ops where there is no document (server render). */

/**
 * @param {object} props
 * @param {string} [props.id] The dialog element's id.
 * @param {(open: boolean) => void} [props.onChange]
 */
export function createDialogBehavior(props) {
  const idAttr = () => props.id ?? false;

  /** @param {Event | Element | null | undefined} from */
  function resolveDialog(from) {
    if (from && typeof from === 'object' && 'closest' in from && typeof from.closest === 'function') {
      return (from).closest('dialog');
    }
    if (from && typeof from === 'object' && 'currentTarget' in from) {
      return (from.currentTarget)?.closest?.('dialog') ?? null;
    }
    if (props.id && typeof document !== 'undefined') return document.getElementById(props.id);
    return null;
  }

  /** @param {Event | Element} [from] An event (trigger click) or the dialog element. */
  function show(from) {
    const dialog = resolveDialog(from);
    if (!dialog || dialog.open) return;
    dialog.showModal();
    props.onChange?.(true);
  }

  /** @param {Event | Element} [from] */
  function close(from) {
    const dialog = resolveDialog(from);
    if (!dialog || !dialog.open) return;
    dialog.close();
    props.onChange?.(false);
  }

  /** @param {Event | Element} [from] */
  function isOpen(from) {
    return Boolean(resolveDialog(from)?.open);
  }

  /* A click that lands on the dialog element itself is a backdrop
     click — the content is inside it, so target === currentTarget
     only for the backdrop. */
  /** @param {MouseEvent} event */
  function onBackdropClick(event) {
    if (event.target === event.currentTarget) close(event);
  }

  return { idAttr, show, close, isOpen, onBackdropClick };
}
