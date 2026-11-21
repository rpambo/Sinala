# Media assets

Stock media in this directory is used under the [Pexels License](https://www.pexels.com/license/) (free to use, no attribution required). Source details are recorded here for maintenance. The SINALA logo is the project's own brand asset.

## Video

| File | Source | Description |
| --- | --- | --- |
| `videos/hero-antenna.mp4` | [Pexels #6756503](https://www.pexels.com/video/aerial-shot-of-a-antenna-tower-6756503/) — K | Aerial footage of a telecommunications antenna at sunset. 1920×1080 H.264, ~7 MB. Hero background (desktop/tablet). |
| `videos/hero-antenna-mobile.mp4` | Same source, SD 640×360 render | Lightweight hero variant selected on screens up to 640 px. |
| `videos/network-cables.mp4` | [Pexels #1085656](https://www.pexels.com/video/blue-colored-cables-1085656/) — Dima Krivoy | Network cables with indicator lights in a server room. 1920×1080 H.264, ~15 MB. Infrastructure section (desktop/tablet); loaded only when in view. |
| `videos/network-cables-mobile.mp4` | Same source, SD 960×540 render | Lightweight infrastructure variant for small screens. |

## Posters

The matching poster images are resized Pexels thumbnails for the same clips:

- `images/hero-antenna-poster.jpg`
- `images/network-cables-poster.jpg`

## Purpose section

Three portrait photographs (900×1200 crops) fill the full height of the three columns in the "01 / PROPÓSITO" section:

| File | Source | Used for |
| --- | --- | --- |
| `images/purpose-listen.jpg` | [Pexels #4314674](https://www.pexels.com/photo/kids-sitting-near-the-laptop-4314674/) | "Escutar primeiro" — a community using a laptop together. |
| `images/purpose-protect.jpg` | [Pexels #8828591](https://www.pexels.com/photo/pins-on-map-8828591/) | "Proteger as pessoas" — approximate, non-identifying locations on a map. |
| `images/purpose-transparency.jpg` | [Pexels #8205064](https://www.pexels.com/photo/person-holding-a-pen-and-a-clipboard-8205064/) | "Ser transparente" — a reported experience recorded in a form. |

## Process carousel

Four Pexels photographs illustrate the steps in the "Como funciona" section:

| File | Source | Used for |
| --- | --- | --- |
| `images/step-1-report.jpg` | [Pexels #6589010](https://www.pexels.com/photo/anonymous-woman-typing-on-laptop-while-working-online-from-home-6589010/) | "Conte o que acontece" |
| `images/step-2-location.jpg` | [Pexels #7663519](https://www.pexels.com/photo/hand-placing-pin-on-map-7663519/) | "Indique a zona" |
| `images/step-3-track.jpg` | [Pexels #6169648](https://www.pexels.com/photo/a-person-filling-up-a-form-on-a-clipboard-6169648/) | "Acompanhe o registo" |
| `images/step-4-context.jpg` | [Pexels #3869639](https://www.pexels.com/photo/women-in-ankara-dresses-using-macbook-3869639/) | "Veja o contexto" |

## Closing CTA

| File | Source | Used for |
| --- | --- | --- |
| `images/closing-community.jpg` | [Pexels #7688668](https://www.pexels.com/photo/people-using-smartphone-7688668/) | Background of the "06 / PARTICIPE" call to action — a group of people using smartphones outdoors. |

## Map boundary

`src/app/core/data/angola-boundary.ts` contains Angola's national outline simplified to a ~1 km tolerance from [Natural Earth 10m Admin-0 Countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/) (public domain), extracted from [datasets/geo-countries](https://github.com/datasets/geo-countries). It draws the single silhouette used by every map and constrains the view to Angola; it is not incident data.

## Brand

| File | Source | Used for |
| --- | --- | --- |
| `images/sinala-logo.png` | Cropped from the project's existing `public/logo.png` | Public header, public footer, login page and admin sidebar. |

Palette sampled from the logo and applied across the UI: navy `#00163F` / `#002866`, primary blue `#0090F0`, bright blue `#00A8F0` / `#00C0F0`, deep blue `#003090` / `#0060C0`.

## Fonts

Space Grotesk and Manrope are distributed under the SIL Open Font License 1.1 and are served locally from `fonts/` to avoid third-party requests.

## Existing project imagery

`public/images/sinala-community.webp` is the original SINALA community photograph and remains available to the project.
