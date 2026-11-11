import { MODULE_ID, MAX_WAGON_MEMBERS } from "./constants.mjs";
/**
 * Build the Wagon sheet class on top of the system's actor sheet.
 *
 * This is a factory rather than a plain `class ... extends` so that the base class is
 * resolved at `init` time, once the system's scripts are guaranteed to have loaded.
 *
 * @param {typeof foundry.applications.sheets.ActorSheetV2} BaseSheet  The system's `totowActorSheet`.
 * @returns {typeof foundry.applications.sheets.ActorSheetV2}
 */
export function defineWagonSheet(BaseSheet) {
  return class WagonSheet extends BaseSheet {
    /** @override */
    static DEFAULT_OPTIONS = {
      classes: ["actor", "talesoftheoldwest"],
      actions: {
        roleView: { handler: this._onRoleView, buttons: [0, 2] },
        roleRemove: { handler: this._onRoleRemove, buttons: [0, 2] },
        roll: { handler: this._onRoll, buttons: [0, 2] },
      },
    };

    /** @override */
    static PARTS = {
      ...BaseSheet.PARTS,
      wagon: {
        template: `modules/${MODULE_ID}/templates/wagon.hbs`,
        scrollable: [""],
      },
    };

    /* -------------------------------------------- */

    /** @override */
    _configureRenderOptions(options) {
      super._configureRenderOptions(options);
      // Limited view keeps the base header and tabs only
      if (this.document.limited) return;
      options.parts = ["header", "tabs", "wagon"];
    }

    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      if (this.document.img === "icons/svg/mystery-man.svg" && this.document.img !== this.img) {
        this.document.update({ img: "modules/totow-wagontrain/assets/wagon-icon-white.svg" });
      }
      return context;
    }

    /** @override */
    async _preparePartContext(partId, context) {
      context = await super._preparePartContext(partId, context);
      const options = {
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      };
      if (partId === "wagon") {
        context.tab = context.tabs[partId];
        context.wagonMembers = this.#prepareMembers();
        context.enrichedBiography = await foundry.applications.ux.TextEditor.enrichHTML(this.actor.system.biography, options);
      }
      return context;
    }

    /**
     * Resolve the actors assigned to the wagon, padding the member
     * list with one empty slot while there is capacity left.
     * @returns {Array<object>}
     */
    #prepareMembers() {
      const members = this.actor.system.members ?? [];
      const resolveActor = (id) => (id ? game.actors.get(id) : null);

      const toSlots = (ids, capacity) => {
        const slots = (ids ?? []).filter(Boolean).map((id, index) => ({ index, id, actor: resolveActor(id) }));
        if (slots.length < capacity) slots.push({ index: slots.length, id: "", actor: null });
        return slots;
      };

      return toSlots(members, MAX_WAGON_MEMBERS);
    }

    /* -------------------------------------------- */

    /** @override */
    _getTabs(parts) {
      // Default to this sheet's own tab the first time it renders
      this.tabGroups.primary ??= "wagon";
      const tabs = super._getTabs(parts);
      // The base sheet has no case for this part, so describe the tab here
      if (tabs.wagon) {
        Object.assign(tabs.wagon, {
          id: "wagon",
          label: "TOTOWWAGON.tab",
          cssClass: this.tabGroups.primary === "wagon" ? "active" : "",
        });
      }
      return tabs;
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static async _onRoleView(event, target) {
      event.preventDefault();
      const actor = game.actors.get(target.dataset.actorId);
      return actor?.sheet?.render({ force: true });
    }

    static async _onRoleRemove(event, target) {
      event.preventDefault();
      const { role, index } = target.dataset;
      if (!role) return;

      const idx = Number.parseInt(index, 10);
      if (Number.isNaN(idx)) return;

      const currentList = Array.from(this.actor.system.members ?? []).filter(Boolean);
      currentList.splice(idx, 1);

      return await this.actor.update({ "system.members": currentList });

    }

    /* -------------------------------------------- */
    /*  Drag and Drop                               */
    /* -------------------------------------------- */

    /**
     * Dropped actors are assigned to the trail role under the drop target.
     * @override
     */
    async _onDropActor(event, data) {
      if (!this.actor.isOwner) return false;
      const actor = await fromUuid(data.uuid);
      if (!actor) return;
      return await this.#dropTrailMember(event, actor.id);
    }

    async #dropTrailMember(event, actorId) {
      const crew = game.actors.get(actorId);
      if (!(crew?.type === "pc" || crew?.type === "npc")) return;

      const dropTarget = event.target.closest("[data-role]");
      if (!dropTarget) return;

      const { role } = dropTarget.dataset;
      if (role !== "members") return;

      const currentList = Array.from(this.actor.system.members ?? []).filter(Boolean);

      // An Actor can only appear once in a given list. If already present or full, silently ignore.
      if (currentList.includes(actorId) || currentList.length >= MAX_WAGON_MEMBERS) return;

      currentList.push(actorId);
      return await this.actor.update({ "system.members": currentList });
    }

    /**
     * A wagon holds no items. The base sheet looks up allowed item types by actor type
     * and would throw for a type it does not know about, so reject drops here.
     * @override
     */
    async _onDropItemCreate(itemData, event) {
      ui.notifications.warn(game.i18n.localize("TOTOWWAGON.noItems"));
      return false;
    }

    static async _onRoll(event, target) {
      event.preventDefault(); // Don't open context menu
      event.stopPropagation(); // Don't trigger other events
      if (event.detail > 1) return; // Ignore repeated clicks
      const isModifiable = ["attribute"].includes(target.dataset.rollType);
      if (isModifiable && event.button !== 0) {
        await this.actor.modRoll(this.actor, event, target);
      } else {
        await this.actor.diceRoll(this.actor, event, target);
      }
    }
  };
}
