---
'@basenative/components': patch
---

App nav clearance now reserves the bar's full footprint: the phone-class page padding and the new scroll-padding include the bar's top border alongside its height token and the safe-area inset (the border was previously unreserved, leaving the last pixel row of a page under the bar), the More sheet's offset accounts for the same border, and at the unfolded class fragment targets clear the rail through scroll-padding-inline-start instead of the block-end reservation.
