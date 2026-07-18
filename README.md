# ITACHI — A Life in the Shadows

A single-page scrollytelling tribute to Itachi Uchiha, told in black-and-white manga ink with one color reserved for blood, the Sharingan, and the moon.

Scroll through his life — from a child watching a war he didn't start, to the brother who carried a village's guilt alone — with pinned scenes, a horizontal timeline, a blood moon that grows as you scroll, and a story that fades from black to white as it ends.

## Live demo

[Visit the live website](https://itachi--uchiha.vercel.app/)

![Itachi Uchiha story website preview](assets/Itachi%20Uchiha.PNG)

You can also open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
```

## Tech

- Vanilla HTML / CSS / JS — no build step, no framework
- [GSAP](https://gsap.com/) + ScrollTrigger for every scroll-driven scene
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling
- All illustrations AI-generated (prompts included in `IMAGE_PROMPTS.md`)
- Hand-coded SVG for the Sharingan / Mangekyō / crow / feather motifs

## Structure

```
index.html          all 14 chapters
css/style.css        design system, placeholders, responsive + reduced-motion rules
js/main.js           GSAP ScrollTrigger scenes, loader, cursor, lightbox, particles
assets/img/          chapter illustrations
assets/svg/          (reserved — motifs are inlined in index.html)
assets/audio/        optional ambient track (bring your own, off by default)
IMAGE_PROMPTS.md      full prompt list used to generate every illustration
```

## Features

- Custom Sharingan cursor, 3D tilt on cards, click-to-fullscreen lightbox
- Scramble-in chapter titles, drifting ash/feather particles, a dim pulse at the story's darkest line
- A progress ring that morphs into the Mangekyō as the story turns
- Fully responsive, with a clean reduced-motion fallback for accessibility

## Disclaimer

Unofficial, non-commercial fan project. *Naruto* © Masashi Kishimoto / Shueisha / Studio Pierrot. No affiliation. Illustrations are AI-generated fan art, not official artwork.

---

If you like the website, be sure to follow me for more: **[github.com/fahimahmed420](https://github.com/fahimahmed420)**
