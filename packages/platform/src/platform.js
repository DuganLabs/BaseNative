/**
 * Choose iOS or macOS and write the attributes the token sheet reads.
 * Existing attributes are left alone, so an explicit choice wins.
 */
import { bindPlatform } from './behavior.js';

/**
 * @param {Navigator} [nav]
 * @param {{matches?: (q: string) => boolean}} [matchMedia]
 */
export function detectPlatform(nav = globalThis.navigator, matchMedia = globalThis.matchMedia) {
  const ua = nav?.userAgent || '';
  const matches = (query) => {
    try {
      return typeof matchMedia === 'function' && matchMedia(query).matches;
    } catch {
      return false;
    }
  };
  const coarse = (nav?.maxTouchPoints || 0) > 1 || matches('(pointer: coarse)');
  const noHover = matches('(hover: none)');
  if (/iPhone|iPod/.test(ua)) return { platform: 'ios', device: 'iphone' };
  if (/iPad/.test(ua)) return { platform: 'ios', device: 'ipad' };
  if (/Macintosh/.test(ua) && coarse) return { platform: 'ios', device: 'ipad' };
  if (/Macintosh/.test(ua)) return { platform: 'macos', control: 'medium' };
  if (coarse || noHover) return { platform: 'ios', device: 'iphone' };
  return { platform: 'macos', control: 'medium' };
}

/**
 * Set `data-bn-platform`, and device or control size, only where absent.
 * @param {Element} root
 * @param {{platform:string, device?:string, control?:string}} [detected]
 */
export function applyPlatform(root, detected = detectPlatform()) {
  if (!root) return detected;
  if (!root.hasAttribute('data-bn-platform'))
    root.setAttribute('data-bn-platform', detected.platform);
  if (detected.device && !root.hasAttribute('data-bn-device'))
    root.setAttribute('data-bn-device', detected.device);
  if (detected.control && !root.hasAttribute('data-bn-control'))
    root.setAttribute('data-bn-control', detected.control);
  return detected;
}

/**
 * Apply the platform and bind keyboard behaviour.
 * @param {Element} [root]
 * @param {{document?: Document}} [env]
 */
export function initPlatform(root, env = {}) {
  const doc = env.document || globalThis.document;
  if (!doc) return null;
  const host = root || doc.documentElement;
  const detected = applyPlatform(host);
  bindPlatform(host);
  return detected;
}
