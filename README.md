# Tales of The Old West: Wagon Train

A Foundry VTT module that adds a **Wagon Train** actor type to the
[Tales of The Old West](https://github.com/pwatson100/talesoftheoldwest) system.

A Wagon Train tracks:

- **Trail leads**: Trail Boss, Quartermaster, Wrangler and Agent
- **Cowboys** (up to 10) and **Scouts** (up to 2)
- **Morale**
- **Supplies**: food, water, medicine and ammunition
- **Money** and **cattle**, each with a current and an initial amount

Drag a PC or NPC from the Actors directory onto a role slot to assign them.

## Requirements

- Foundry VTT v13 or later (verified on v14)
- The `talesoftheoldwest` system, v1.0.0 or later

This module only works in worlds that use that system.

## How it fits together

| File | Purpose |
|---|---|
| `module.json` | Declares the `wagontrain` Actor subtype. Foundry prefixes it with the module id, so the stored type is `totow-wagontrain.wagontrain`. |
| `scripts/main.mjs` | On `init`, registers the data model and the sheet. |
| `scripts/wagon-train-model.mjs` | `TypeDataModel` for roles, morale and resources. |
| `scripts/wagon-train-sheet.mjs` | Sheet built on the system's `totowActorSheet`. |
| `templates/wagontrain.hbs` | The sheet's main tab. |
| `styles/wagontrain.css` | Styles for the sheet. |
| `lang/en.json` | Strings, including the `TYPES.Actor` label. |

### What it takes from the system

The module extends `globalThis.talesoftheoldwest.applications.totowActorSheet`, so
the system must keep exposing it. The template also relies on the system for:

- the `tcheader` sheet part (the name header)
- the Handlebars helpers `toUpperCase` and `times`
- the CSS classes `grid-aspect`, `GA2label`, `GA21`, `newdots-town-charter` and `resource-label`
- the base sheet's `_changeValue` method, used by the morale and resource dot actions
- the `.talesoftheoldwest` class on the sheet root, which scopes this module's styles

If the system renames or removes any of these, this module needs a matching update.

## Things to know

- **Deactivating the module hides every Wagon Train actor** in the world. They return
  when the module is re-enabled. Foundry warns before deactivating a module that
  provides document subtypes.
- **Actors created before this was a module** (when `wagontrain` was a system type) have
  the type `wagontrain`, not `totow-wagontrain.wagontrain`. They are not migrated
  automatically. Re-create them, or write a one-off migration.
- A Wagon Train cannot hold items. Dropping an item on the sheet shows a warning.

## Installation

Use the manifest URL from the latest release:

```
https://github.com/<owner>/<repo>/releases/latest/download/module.json
```

For local development, copy or symlink this folder to
`<Foundry data>/Data/modules/totow-wagontrain`, then enable it in a world that uses
the Tales of The Old West system.

## Releasing

Publish a GitHub release with a tag such as `v0.1.0`. The workflow in
`.github/workflows/release.yml` sets the version and manifest links in `module.json`,
builds `module.zip`, and attaches both to the release.

## License

Mozilla Public License Version 2.0. See `LICENSE.txt`.
