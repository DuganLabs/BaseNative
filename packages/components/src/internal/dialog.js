// @ts-check
/* Shared open/close behavior for the native-<dialog> components
   (dialog, drawer). showModal supplies the focus trap, Escape-to-
   close and focus return to the invoker natively; this adds the
   parts the platform leaves to the component: resolving the dialog
   element from an event or the component's id, backdrop-click
   dismissal, the header close control's dismissal, Escape for a
   dialog staged open outside showModal (where the platform gives
   no cancel), and an onChange report. Client-only by nature —
   every entry point no-ops where there is no document (server
   render). */

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

  /* The dialog's own click contract, delegated at its root: a
     backdrop click dismisses (above), and so does the header's
     close control — the one button the component itself composes
     a place for. Footer actions belong to the app and never close
     from here. */
  /** @param {MouseEvent} event */
  function onClick(event) {
    if (event.target === event.currentTarget) {
      close(event);
      return;
    }
    const button = (event.target)?.closest?.('button');
    if (!button) return;
    const header = (event.currentTarget)?.querySelector?.('header');
    if (header?.contains(button)) close(event);
  }

  /* Escape dismisses an open dialog. A modal dialog gets this from
     the platform (cancel); a dialog staged open in flow does not,
     so the component carries it — the same key, the same result. */
  /** @param {KeyboardEvent} event */
  function onKeydown(event) {
    if (event.key !== 'Escape') return;
    const dialog = resolveDialog(event);
    if (!dialog?.open) return;
    event.preventDefault();
    close(event);
  }

  return { idAttr, show, close, isOpen, onBackdropClick, onClick, onKeydown };
}
