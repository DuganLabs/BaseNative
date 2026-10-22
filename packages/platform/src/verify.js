/**
 * Items the 1024×594 page screenshots could not settle. Shapes that the
 * shots did confirm (switch pill, split stepper, slider knob, sheet
 * grabber, rounded fields, tab bar, notification card, macOS bordered
 * and prominent buttons, macOS alert button row, joined macOS segments)
 * are implemented and are not listed here.
 */
export const VERIFY = [
  {
    id: 'pixel-fit',
    topic: 'Fit-to-page screenshots',
    detail:
      'Every unread page was checked as a 1024×594 fit of the whole Figma page. Dense pages (Keyboards, Sidebars, Toolbars, Lists and Tables, Windows, Menu Bar and Dock) do not yield reliable pixel measurements. Those controls use tokens.json plus the HIG.',
  },
  {
    id: 'macos-clicked',
    topic: 'macOS pressed fills',
    detail:
      'The Buttons page shows idle bordered gray and prominent blue, including capsule Large and XL. Clicked and disabled fills are not readable at this size, so pressed state is a brightness filter rather than a kit colour.',
  },
  {
    id: 'macos-segment-fill',
    topic: 'macOS selected segment fill',
    detail:
      'The segmented-control page shows a joined control. Whether the selected cell is accent blue or a darker gray is not measurable in the fit. The catalog uses Accents/Blue.',
  },
  {
    id: 'ios-switch-size',
    topic: 'iOS switch pixels',
    detail:
      'The Toggles page confirms a pill, gray off and green on, with a white knob. The 51×31 size is the HIG control, not a measurement from the screenshot.',
  },
  {
    id: 'material-blur',
    topic: 'Material blur radii',
    detail:
      'Materials pages were screenshotted, but the blur radius is not readable. macos.materials still supplies fill, opacity, and blend only. Frost-as-blur remains a mapping of the Liquid Glass frost number, not the kit GLASS effect.',
  },
  {
    id: 'macos-title-2-family',
    topic: 'macOS Title 2 Emphasized font',
    detail:
      'The text style is "Inter Bold" in the kit file. Weight 700 is emitted. The family token is --bn-plat-font-title-2-emphasized-family and is likely a Figma fallback.',
  },
  {
    id: 'corner-smoothing',
    topic: 'Corner smoothing',
    detail:
      'corner-shape: squircle does not reproduce Figma smoothing 0.6. Captured controls still use the kit radii (1000 capsule, 12 and 40 borderless, 34 alert, 100 segmented track).',
  },
  {
    id: 'motion',
    topic: 'Motion',
    detail: 'Neither kit defines motion variables. No spring curves were added.',
  },
  {
    id: 'increased-contrast',
    topic: 'Increased contrast',
    detail:
      'Derived. The kits have no increased-contrast mode. Labels raise alpha, fills and overlays lose transparency, non-opaque separators take Separators/Opaque, and opaque accents walk in lightness. See contrast.js.',
  },
  {
    id: 'symbols',
    topic: 'SF Symbols and app artwork',
    detail:
      'Not shipped. Icon slots are a text glyph or a monogram. Tab bar, toolbar, and share sheet use labels rather than Apple’s symbol set.',
  },
];
