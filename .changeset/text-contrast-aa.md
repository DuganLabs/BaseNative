---
'@basenative/components': patch
---

Text holds WCAG AA in light mode. The ghost button and info badge paint the strong tint. The light `-strong` status colors are deepened so they clear 4.5:1 on their own fills. The destructive button paints the new `--color-danger-solid` / `--color-danger-solid-pressed`, so its white label clears 4.5:1 in both schemes. The completed stepper disc uses `--color-text-on-tint`, and a multiselect chip's remove action takes the chip label color.
