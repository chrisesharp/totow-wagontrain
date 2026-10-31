import { MODULE_ID, ACTOR_TYPE } from "./constants.mjs";
import { WagonTrainModel } from "./wagon-train-model.mjs";
import { defineWagonTrainSheet } from "./wagon-train-sheet.mjs";

Hooks.once("init", () => {
  const BaseSheet = globalThis.talesoftheoldwest?.applications?.totowActorSheet;
  if (!BaseSheet) {
    ui.notifications?.error(`${MODULE_ID} requires the Tales of The Old West system.`);
    console.error(`${MODULE_ID} | globalThis.talesoftheoldwest.applications.totowActorSheet was not found.`);
    return;
  }

  // Register the data model for the subtype declared in module.json
  CONFIG.Actor.dataModels[ACTOR_TYPE] = WagonTrainModel;

  // Register the sheet for that subtype only, and make it the default
  const WagonTrainSheet = defineWagonTrainSheet(BaseSheet);
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, WagonTrainSheet, {
    types: [ACTOR_TYPE],
    makeDefault: true,
    label: "TOTOWWAGONTRAIN.sheetLabel",
  });
});
