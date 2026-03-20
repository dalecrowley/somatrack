# Design System Specification

## 1. Overview & Creative North Star: "The Digital Atrium"

This design system is built upon the concept of **"The Digital Atrium"**—an expansive, light-filled environment designed for clarity, focus, and structural elegance. Moving away from the cluttered, grid-heavy density of traditional project management tools, this system prioritizes the "breath" between tasks. 

By leveraging intentional asymmetry, oversized whitespace, and a sophisticated tonal palette, we transform a utility tool into a high-end editorial experience. We reject the "boxed-in" feeling of standard Kanban boards in favor of fluid, layered surfaces that guide the eye through importance rather than through rigid containers.

---

## 2. Colors & Tonal Depth

The palette is rooted in a "High-Chroma Neutral" philosophy. We utilize varying shades of cool whites and slate grays to create depth without visual noise.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections, sidebars, or headers. Boundaries must be achieved through background shifts. For example, a `surface-container-low` navigation panel should sit directly against a `surface` main content area. The transition is the boundary.

### Surface Hierarchy & Nesting
Treat the interface as physical layers of fine paper.
*   **Base Layer:** `surface` (#f6fafe) – The vast canvas.
*   **Secondary Content:** `surface-container-low` (#f0f4f8) – For grouping secondary information.
*   **High-Priority Cards:** `surface-container-lowest` (#ffffff) – Used for Kanban cards to make them "pop" against the gray background.

### The "Glass & Gradient" Rule
To elevate the "out-of-the-box" feel, floating elements (modals, dropdowns) should utilize **Glassmorphism**.
*   **Token:** `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur.
*   **Signature Textures:** Use a subtle linear gradient for primary actions (e.g., `primary` to `primary_container`) to add "soul" and a tactile, premium finish.

---

## 3. Typography: Editorial Authority

We use **Inter** not as a system font, but as a brand anchor. The hierarchy relies on extreme contrast in scale to denote importance.

*   **Display (High-End Editorial):** Use `display-lg` (3.5rem) for dashboard empty states or welcome headers. It creates an authoritative, magazine-like feel.
*   **Headline & Title:** Use `headline-sm` (1.5rem) for column titles. Keep these at a higher weight (600-700) to anchor the fluid layout.
*   **The Body-Label Relationship:** Use `body-md` (0.875rem) for task descriptions. For metadata (dates, tags), use `label-sm` (0.6875rem) in `on_surface_variant` to keep the interface from feeling "heavy."

---

## 4. Elevation & Depth

### The Layering Principle
Hierarchy is achieved via **Tonal Layering**. Place a `surface-container-lowest` (#ffffff) card on a `surface-container-low` (#f0f4f8) background. This creates a natural, soft lift that is easier on the eyes than high-contrast shadows.

### Ambient Shadows
When an element must float (e.g., a dragged Kanban card):
*   **Shadow:** `0px 12px 32px rgba(9, 20, 38, 0.06)`. 
*   Note: The shadow is tinted with the `primary` color (#091426) at a very low opacity to mimic natural light refraction.

### The "Ghost Border" Fallback
If accessibility requires a border, use a **Ghost Border**: 
*   **Token:** `outline_variant` at 15% opacity. Never use 100% opaque lines.

---

## 5. Components

### Kanban Cards
*   **Background:** `surface-container-lowest` (#ffffff).
*   **Radius:** `md` (0.75rem).
*   **Constraint:** No borders. Use vertical whitespace `3` (1rem) between cards.
*   **Interaction:** On hover, shift background to `surface-bright`.

### Buttons
*   **Primary:** Background gradient (`primary` to `primary_container`), text `on_primary`. 
*   **Secondary:** Background `primary_fixed`, text `on_primary_fixed_variant`. No border.
*   **Tertiary:** Transparent background, text `secondary`. Use for low-emphasis actions like "Add Task."

### Status Chips (Indicators)
*   **Active/Success:** Background `tertiary_fixed`, text `on_tertiary_container`.
*   **Urgent:** Background `error_container`, text `on_error_container`.
*   **Shape:** `full` (9999px) for a modern, pill-shaped look.

### Input Fields
*   **Style:** Minimalist. `surface-container-high` background with a `2px` bottom-only highlight in `secondary` when focused. 
*   **Labels:** Always use `label-md` floating above the input to maintain vertical rhythm.

### Navigation Elements
*   **Active State:** Avoid "blocks" of color. Use a `4px` vertical "pill" of `secondary` color to the left of the nav item and shift the text to `primary` weight.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use generous whitespace (Spacing `8` to `12`) between major sections to emphasize the "Atrium" feel.
*   **Do** align text-heavy elements to a strong left-hand axis to maintain editorial structure.
*   **Do** use `backdrop-blur` on navigation sidebars to allow the colors of the Kanban board to softly bleed through.

### Don’t:
*   **Don’t** use black (#000000) for text. Use `on_surface` (#171c1f) for better readability and a more premium, "ink-like" feel.
*   **Don’t** use divider lines between list items. Use spacing `2.5` (0.85rem) to separate them.
*   **Don’t** use standard "drop shadows." If it doesn't look like ambient light, it's too heavy.
*   **Don’t** crowd the Kanban columns. If more than 5 columns are needed, implement a horizontal "peek" rather than shrinking the cards.