# Logo prompts for Taskgrid

> **Superseded.** The logo is settled — a checklist page, drawn as vector
> geometry and shipped from `../lib/` colours. See `README.md`. This file is
> kept only for the next time the mark is up for discussion; nothing here
> describes what the app currently ships. In particular the "one flat colour"
> rule below is no longer true of the shipped mark, whose themed-icon layer is
> handled by a punched-out silhouette instead.

Prompts written for ChatGPT's image generator. Keep them in English — image
models are trained on English captions and degrade noticeably on other input.

Brand constants, non-negotiable in every prompt:

| | |
| --- | --- |
| Brand purple | `#6544f5` |
| Darker / lighter | `#4f2fdd` / `#7b61ff` |
| Style | flat, single flat colour, no gradient, no shadow, no 3D |
| Canvas | 1024×1024, square, mark centred |
| Safe zone | mark inside the centre 66% — Android launchers crop to a circle |

The "no gradient, one flat colour" rule is not a taste call. Android's themed
icon layer throws colour away and tints the silhouette, so any mark that needs
two tones to read falls apart there.

---

## Prompt 1 — the current concept, refined

Use this to get a better-drawn version of the mark the app already ships.

```
A flat vector app icon for "Taskgrid", a team task-management app.

Design: a 2x2 grid of four rounded squares. Three of the squares are solid
filled. The fourth square, in the top-right position, is replaced by a bold
checkmark drawn as a thick stroke with rounded ends, tilted naturally, slightly
overshooting where that square would have been.

Style: flat vector, geometric, precise, single flat colour only. Pure white
mark on a solid #6544f5 purple background. No gradients, no drop shadows, no
3D, no bevels, no highlights, no outlines, no texture, no text or letters
anywhere.

Composition: square 1024x1024 canvas, the mark centred and occupying about 60%
of the width, generous even margin on all four sides.

Reference quality: modern SaaS product iconography, in the visual register of
Linear, Notion or Height. Crisp geometry, consistent corner radii, optically
balanced weight between the squares and the checkmark stroke.
```

## Prompt 2 — stacked lanes

A different direction: the board columns rather than the grid.

```
A flat vector app icon for "Taskgrid", a team task-management app.

Design: three vertical rounded bars of different heights standing side by side
on a shared invisible baseline, like columns on a task board. The centre bar is
the tallest and fully solid; the outer two are shorter. A small circular dot
sits above the tallest bar, suggesting an item moving up a lane.

Style: flat vector, geometric, single flat colour only. Pure white mark on a
solid #6544f5 purple background. No gradients, no shadows, no 3D, no outlines,
no text or letters.

Composition: square 1024x1024 canvas, mark centred at about 55% of the width,
even margin all around.

Reference quality: modern SaaS product iconography — Linear, Vercel, Height.
Clean geometry, uniform corner radii, optically even stroke weight.
```

## Prompt 3 — grid monogram

```
A flat vector app icon for "Taskgrid", a team task-management app.

Design: an abstract letter G built entirely out of a 3x3 arrangement of small
rounded squares — the squares that fall on the letterform are present, the rest
are absent. The shape should read as a G at a glance and as a pixel grid on
closer look.

Style: flat vector, geometric, modular, single flat colour only. Pure white
mark on a solid #6544f5 purple background. No gradients, no shadows, no 3D, no
outlines, no additional text.

Composition: square 1024x1024 canvas, mark centred at about 58% of the width,
even margin all around.

Reference quality: modern SaaS product iconography. Perfectly aligned modules,
identical corner radii on every square.
```

---

## Follow-ups worth having ready

Image models rarely land it first try. These are the corrections that actually
move the result:

```
Same icon, but make the checkmark stroke noticeably thicker so it holds the
same visual weight as the solid squares.
```

```
Same icon, but increase the margin — the mark is too close to the edges. Scale
the mark down to about 55% of the canvas width, keeping it perfectly centred.
```

```
Same icon, but remove every gradient and shadow. The mark must be one single
flat white, and the background one single flat #6544f5.
```

```
Show this same mark as a pure white silhouette on a plain black background,
with no background shape — I need it as a standalone symbol.
```

That last one is the useful one: it gives you the mark isolated, which is what
you actually need for the Android foreground and monochrome layers.

---

## After ChatGPT gives you something

Save the PNG somewhere in this repo and hand over the path. It becomes the new
`source-icon.png`, and every app icon plus both Play uploads is re-cropped from
it — see `README.md` for how the current set is derived.

Two things a generated image will not give you, and which are handled on this
side rather than in the prompt:

- **The frame.** These models return a product shot: the icon floating on white
  with a drop shadow. That margin has to be cropped off, or the artwork ends up
  inside a second rounded square once iOS and Play apply their own mask.
- **The Android monochrome layer.** A themed icon has its colour discarded and
  its alpha tinted, so any full-colour raster flattens into one featureless
  slab. That layer gets redrawn as a silhouette from measurements taken off the
  source.
