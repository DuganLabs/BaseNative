---
'@basenative/components': minor
---

Add `renderAppNav`: one primary nav that is a fixed bottom bar at phone class and a fixed side rail at the unfolded class — spanning a vertical fold (the iPhone Duo opened flat) or any viewport at least 939px wide. The adaptation is CSS alone, so a fold mid-task loses nothing: no second markup variant, no init, focus/scroll/aria-current untouched. Includes the `--bn-size-app-nav-bar` / `--bn-size-nav-rail` footprint tokens and the clearance rules that reserve exactly the bar's space for pages rendering it inside the page shell.
