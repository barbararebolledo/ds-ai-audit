# Component Index

**Version:** 0.1.0
**System:** ds-ai-poc — Banking CTA button POC

This is the authoritative list of all components in this design system.
Check this file before creating or referencing any component.
Do not assume a component exists if it is not listed here.

---

## Defined components

### Button

| Field       | Value                                              |
|-------------|----------------------------------------------------|
| Status      | `defined`                                          |
| Category    | action                                             |
| Figma node  | `10:3` in file `J6PCrb0xiyDTPxnB5hTfP3`           |
| Contract    | `contracts/button.contract.json`                   |
| Docs        | `docs/button.md`                                   |

**Props:**
- `size`: `Small` | `Medium` | `Large` — default `Small`
- `state`: `Default` | `Hover` | `Active` | `Disabled` — default `Default`

**Token files:** `tokens/component.json` → `tokens/semantic.json` → `tokens/primitives.json`

**One-line rule:** Primary CTA only. One per screen. Full-width. No secondary or icon variant exists yet.

---

## Not yet defined

These components were identified as gaps during Button documentation.
They do not exist in the Figma file. Do not implement them until they are defined and added to this index.

| Component           | Why it is not here                                                  |
|---------------------|---------------------------------------------------------------------|
| Button (Secondary)  | No secondary variant in the Figma file.                             |
| Button (Icon)       | No icon button variant in the Figma file.                           |
| Link / Text Action  | No link or text-action component in the Figma file.                 |

---

## How to add a component

1. Define the component in Figma with named variables and variants.
2. Pull variables via the Figma REST API (`/v1/files/:key/variables/local`).
3. Add component tokens to `tokens/component.json`.
4. Write the contract to `contracts/<name>.contract.json`.
5. Write the docs to `docs/<name>.md`.
6. Add an entry to `index/components.index.json` with `status: "defined"`.
7. Add a row to this file.
8. Update `manifest.json` with the new component entry.
