import { MODULE_ID, ACTOR_TYPE_WAGON, ACTOR_TYPE_WAGON_TRAIN } from "./constants.mjs";
import { WagonTrainModel } from "./wagon-train-model.mjs";
import { WagonModel } from "./wagon-model.mjs";
import { defineWagonTrainSheet } from "./wagon-train-sheet.mjs";
import { defineWagonSheet } from "./wagon-sheet.mjs";

Hooks.once("init", () => {
  const BaseSheet = globalThis.talesoftheoldwest?.applications?.totowActorSheet;
  if (!BaseSheet) {
    ui.notifications?.error(`${MODULE_ID} requires the Tales of The Old West system.`);
    console.error(`${MODULE_ID} | globalThis.talesoftheoldwest.applications.totowActorSheet was not found.`);
    return;
  }

  // Register the data model for the subtype declared in module.json
  CONFIG.Actor.dataModels[ACTOR_TYPE_WAGON_TRAIN] = WagonTrainModel;
  CONFIG.Actor.dataModels[ACTOR_TYPE_WAGON] = WagonModel;

  // Register the sheet for that subtype only, and make it the default
  const WagonTrainSheet = defineWagonTrainSheet(BaseSheet);
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, WagonTrainSheet, {
    types: [ACTOR_TYPE_WAGON_TRAIN],
    makeDefault: true,
    label: "TOTOWWAGONTRAIN.sheetLabel",
  });

  const WagonSheet = defineWagonSheet(BaseSheet);
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, WagonSheet, {
    types: [ACTOR_TYPE_WAGON],
    makeDefault: true,
    label: "TOTOWWAGON.sheetLabel",
  });
});
