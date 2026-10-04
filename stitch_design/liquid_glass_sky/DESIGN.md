---
name: Liquid Glass Sky
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#707881'
  outline-variant: '#bfc7d2'
  surface-tint: '#006398'
  primary: '#006194'
  on-primary: '#ffffff'
  primary-container: '#007bb9'
  on-primary-container: '#fdfcff'
  inverse-primary: '#93ccff'
  secondary: '#00668a'
  on-secondary: '#ffffff'
  secondary-container: '#40c2fd'
  on-secondary-container: '#004d6a'
  tertiary: '#00628d'
  on-tertiary: '#ffffff'
  tertiary-container: '#007cb1'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cce5ff'
  primary-fixed-dim: '#93ccff'
  on-primary-fixed: '#001d31'
  on-primary-fixed-variant: '#004b73'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  code:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  none: 0rem
  2xs: 0.25rem
  xs: 0.5rem
  sm: 0.75rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  2xl: 2.5rem
  3xl: 3rem
  gutter: 1.25rem
  margin-screen: 2rem
---

## Brand & Style

This design system embodies an ultra-modern, serene travel experience. Built around the concept of "Liquid Glass," the aesthetic merges pure structural clarity with dynamic fluidity. Designed for travelers seeking frictionless flight search, price tracking, and rapid reservations, the visual tone evokes high-altitude tranquility, aerodynamic precision, and absolute transparency.

### Design Movement: Liquid Glassmorphism
The movement relies on translucent refractive surfaces, pill-shaped silhouettes, silky backdrops, and luminous specular highlights. By combining high-blur backdrops (`backdrop-filter: blur(24px)`) with crisp inner highlight borders (specular edge glows simulating refraction), the interface feels like suspended sheets of optical glass drifting over clear skies. The visual tone is light, uplifting, and premium—free from visual clutter.

## Colors

The palette draws directly from atmospheric strata—high-altitude daylight blues, cloud whites, and crisp deep-sky slate for pristine legibility.

### Core Roles & Ratios
- **Primary (`#0284C7`)**: The active sky anchor. Used for primary CTA surfaces, high-priority flight indicators, active tab pills, and focus rings.
- **Secondary (`#38BDF8`)**: Radiant cyan highlight. Applied to specular gradient ramps, glow stops, and subtle accents.
- **Tertiary (`#0EA5E9`)**: Vibrancy midpoint for interactive hover states and fluid gradient meshes.
- **Neutral (`#0F172A`)**: Deep oceanic midnight tone for typography and structural icons, delivering uncompromised WCAG AAA contrast over translucent panels.

### Glass Translucencies & Highlights
- **Glass Panel Surface**: `rgba(255, 255, 255, 0.62)` with `backdrop-filter: blur(24px) saturate(180%)`.
- **Glass Elevated Container**: `rgba(255, 255, 255, 0.82)` with `backdrop-filter: blur(32px)`.
- **Specular Border (Top/Leading Edge)**: `rgba(255, 255, 255, 0.85)`.
- **Specular Border (Bottom/Trailing Edge)**: `rgba(255, 255, 255, 0.25)`.
- **Background Atmosphere**: Linear diagonal wash from `#E0F2FE` (Light Sky) through `#F0F9FF` to `#FFFFFF`.

## Typography

The type system blends the aerodynamic, friendly geometric lines of **Plus Jakarta Sans** for prominent headers with the utilitarian, precision-crafted clarity of **Inter** for dense flight specifications, dates, prices, and itineraries.

- **Headlines & Metrics**: Display flight routes (e.g., `SFO → HND`), major pricing callouts, and section titles in Plus Jakarta Sans with snug letter spacing to convey sleek, modern luxury.
- **Flight Data & Data Tables**: Departure schedules, seat classes, and fare codes utilize Inter with standard or slightly widened spacing for instant scanability at glance speed.
- **Labels & Badges**: Small caps and uppercase badges are rendered with `label-sm` and high tracking to maintain crisp edge definitions over glassy, tinted backgrounds.

## Layout & Spacing

This design system is calibrated strictly for a **single-screen desktop application layout** (`100vh` / `100dvh` without vertical body scrolling). Every component sits within a viewport-locked cockpit interface designed for simultaneous search, flight filtering, route comparison, and booking overview.

### Cockpit Layout Grid
- **Global Viewport Lock**: `height: 100vh; overflow: hidden; display: flex; flex-direction: column`.
- **Top Glass Bar**: `h-16` (64px) holding navigation, passenger profile, currency switcher, and rapid alerts.
- **Main Workspace**: A 3-column cockpit grid:
  1. **Control Pane (Left, 320px fixed)**: Search parameters, multi-city pills, date range selector, fare class toggles.
  2. **Results Stream (Center, 1fr flexible)**: Refined card list of flight alternatives with self-contained internal scroll if overflows occur.
  3. **Itinerary & Fare Breakdown (Right, 360px fixed)**: Live trip summary, seat preview, and instant checkout trigger.
- **Spacing Rhythm**: Governed by an 8px modular cadence (`xs: 8px`, `md: 16px`, `lg: 24px`, `xl: 32px`). Element padding inside glass cards is consistently `1.25rem` to `1.5rem` to maintain airy breathing room.

## Elevation & Depth

Depth is established through physical light refraction, multi-layered backdrop blurs, and luminous white specular rims rather than opaque heavy drop shadows.

### Glassmorphic Layers
1. **Base Atmosphere (Level 0)**: Soft radial gradients of sky blues (`#BAE6FD`, `#E0F2FE`) moving behind the interface.
2. **Glass Shell (Level 1)**: Primary application pods. `background: rgba(255, 255, 255, 0.55)`, `backdrop-filter: blur(24px) saturate(190%)`, wrapped in a crisp 1px border gradient: `linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.2))`.
3. **Elevated Floating Card (Level 2)**: Selected flight card or modal drawer. `background: rgba(255, 255, 255, 0.85)`, `box-shadow: 0 16px 36px -10px rgba(2, 132, 199, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8) inset`.
4. **Specular Gloss Highlight**: An ambient top-edge pseudo-element (`height: 1px`, `background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8) 50%, transparent)`) simulating overhead cockpit cabin lights reflecting off curved crystal glass.

## Shapes

With `roundedness: 3` (Pill-shaped), the interface embraces cylindrical, organic, and ultra-smooth silhouettes that mirror modern aerospace fuselage architecture and liquid droplet tension.

- **Primary Cards & Panels**: Heavy rounding with `2rem` (`rounded-2xl` to `rounded-3xl`), eliminating rigid box corners in favor of seamless aerodynamic containers.
- **Pill Buttons & Chips**: Fully continuous capsules (`border-radius: 9999px`) for inputs, flight filters, search bars, and tags.
- **Icon Capsules**: Embedded inside circular or squircle containers with `backdrop-filter: blur(12px)` and matching luminous strokes.

## Components

### Buttons
- **Primary Pill**: Radiant Sky gradient (`linear-gradient(135deg, #0284C7, #0EA5E9)`) with white text, `border-radius: 9999px`, inner specular glow (`box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.4)`), and hover lift.
- **Glass Pill (Secondary)**: `background: rgba(255, 255, 255, 0.65)`, `border: 1px solid rgba(255, 255, 255, 0.8)`, text in `#0F172A`. Hover transitions to `background: rgba(255, 255, 255, 0.9)`.
- **Ghost Action**: Transparent background with active sky text `#0284C7` and pill focus ring on tab.

### Chips & Filter Pills
- Interactive toggles (e.g., "Non-stop only", "Carry-on included", "Morning Departure").
- Inactive: Frosted semi-translucent capsule (`rgba(255, 255, 255, 0.4)`) with subtle border.
- Active: Filled with primary sky tint (`rgba(2, 132, 199, 0.12)`), solid sky border `#0284C7`, text `#0284C7`, accompanied by a check or close indicator.

### Flight Search Input Bar
- Pill-shaped unified bar spanning origin, destination, dates, and traveler count.
- Frosted glass substrate with inset field dividers.
- Active input states trigger an ethereal cyan glow (`box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.35)`).

### Flight Cards (Liquid Glass Tiles)
- Horizontal flight summary modules displaying airline badge, departure/arrival timestamps, duration path (with an aerodynamic flight curve icon), and price lock button.
- Surface: Multi-layered glass with `backdrop-filter: blur(20px)`.
- Hover Effect: The card subtly scales (`transform: translateY(-2px)`) while the top specular highlight brightens from 50% to 90% opacity.

### Selection & Radio Elements
- Custom circular glass toggles: `20px` ring with a `2px` frosted glass rim. When checked, drops a glossy `#0284C7` liquid bead inside.