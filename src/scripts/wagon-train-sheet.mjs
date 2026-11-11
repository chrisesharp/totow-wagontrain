import { MODULE_ID, MAX_COWBOYS, MAX_SCOUTS, MAX_WAGONS } from "./constants.mjs";

/**
 * Build the Wagon Train sheet class on top of the system's actor sheet.
 *
 * This is a factory rather than a plain `class ... extends` so that the base class is
 * resolved at `init` time, once the system's scripts are guaranteed to have loaded.
 *
 * @param {typeof foundry.applications.sheets.ActorSheetV2} BaseSheet  The system's `totowActorSheet`.
 * @returns {typeof foundry.applications.sheets.ActorSheetV2}
 */
export function defineWagonTrainSheet(BaseSheet) {
  return class WagonTrainSheet extends BaseSheet {
    /** @override */
    static DEFAULT_OPTIONS = {
      actions: {
        changeMorale: { handler: this._changeMorale, buttons: [0, 2] },
        changeResource: { handler: this._changeResource, buttons: [0, 2] },
        roleView: { handler: this._onRoleView, buttons: [0, 2] },
        roleRemove: { handler: this._onRoleRemove, buttons: [0, 2] },
        roll: { handler: this._onRoll, buttons: [0, 2] },
      },
    };

    /** @override */
    static PARTS = {
      ...BaseSheet.PARTS,
      wagontrain: {
        template: `modules/${MODULE_ID}/templates/wagontrain.hbs`,
        scrollable: [""],
      },
      wagons: {
        template: `modules/${MODULE_ID}/templates/wagontrain-wagons.hbs`,
        scrollable: [""],
      },
    };

    /* -------------------------------------------- */

    /** @override */
    _configureRenderOptions(options) {
      super._configureRenderOptions(options);
      // Limited view keeps the base header and tabs only
      if (this.document.limited) return;
      options.parts = ["tcheader", "tabs", "wagontrain", "wagons"];
    }

    /* -------------------------------------------- */

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      if (this.document.img === "icons/svg/mystery-man.svg" && this.document.img !== this.img) {
        this.document.update({ img: "icons/svg/barrel.svg" });
      }
      return context;
    }

    /** @override */
    async _preparePartContext(partId, context) {
      context = await super._preparePartContext(partId, context);
      context.tab = context.tabs[partId];
      if (partId === "wagontrain") {
        context.wagonRoles = this.#prepareRoles();
      } else {
        context.wagons = await this.#prepareWagons();
      }
      return context;
    }

    /** @override */
    async _onRender(context, options) {
      await super._onRender(context, options);
      const root = this.element.querySelector("section.wagons");
      if (!root) return;
      const cards = root.querySelectorAll(".wagon-preview-card");
      const show = (actorId) => {
        for (const card of cards) card.classList.toggle("active", card.dataset.actorId === actorId);
      };
      for (const slot of root.querySelectorAll(".role-slot[data-actor-id]")) {
        slot.addEventListener("mouseenter", () => show(slot.dataset.actorId));
        slot.addEventListener("mouseleave", () => show(null));
      }
    }

    #toSlots(ids, capacity) {
      const resolveActor = (id) => (id ? game.actors.get(id) : null);
      const slots = (ids ?? []).filter(Boolean).map((id, index) => ({ index, id, actor: resolveActor(id) }));
      if (slots.length < capacity) slots.push({ index: slots.length, id: "", actor: null });
      return slots;
    }
    /**
     * Resolve the actors assigned to each trail role, padding the cowboy and
     * scout lists with one empty slot while there is capacity left.
     * @returns {object}
     */
    #prepareRoles() {
      const roles = this.actor.system.roles ?? {};
      const resolveActor = (id) => (id ? game.actors.get(id) : null);

      return {
        leads: {
          trailboss: { id: roles.trailboss, actor: resolveActor(roles.trailboss) },
          quartermaster: { id: roles.quartermaster, actor: resolveActor(roles.quartermaster) },
          wrangler: { id: roles.wrangler, actor: resolveActor(roles.wrangler) },
          agent: { id: roles.agent, actor: resolveActor(roles.agent) },
        },
        cowboys: this.#toSlots(roles.cowboys, MAX_COWBOYS),
        scouts: this.#toSlots(roles.scouts, MAX_SCOUTS),
      };
    }

    async #prepareWagons() {
      const wagons = this.actor.system.wagons ?? [];
      const slots = this.#toSlots(wagons, MAX_WAGONS);
      await Promise.all(
        slots.map(async (slot) => {
          if (slot.actor) slot.summary = await this.#prepareSummary(slot.actor);
        }),
      );
      return slots;
    }

    /**
     * Build the data shown in the hover preview for a single actor.
     * @param {Actor} actor
     * @returns {Promise<object>}
     */
    async #prepareSummary(actor) {
      const biography = actor.system.biography;
      const typeKey = CONFIG.Actor.typeLabels?.[actor.type] ?? `TYPES.Actor.${actor.type}`;
      return {
        name: actor.name,
        img: actor.img,
        typeLabel: game.i18n.localize(typeKey),
        members: (actor.system.members ?? []).map((id) => game.actors.get(id)?.name).filter(Boolean),
        biography: biography
          ? await foundry.applications.ux.TextEditor.enrichHTML(biography, {
              secrets: actor.isOwner,
              relativeTo: actor,
            })
          : "",
      };
    }

    /* -------------------------------------------- */

    /** @override */
    _getTabs(parts) {
      // Default to this sheet's own tab the first time it renders
      this.tabGroups.primary ??= "wagontrain";
      const tabs = super._getTabs(parts);
      // The base sheet has no case for this part, so describe the tab here
      if (tabs.wagontrain) {
        Object.assign(tabs.wagontrain, {
          id: "wagontrain",
          label: "TOTOWWAGONTRAIN.tabs.WagonTrain",
          cssClass: this.tabGroups.primary === "wagontrain" ? "active" : "",
        });
      }
      
      if (tabs.wagons) {
        Object.assign(tabs.wagons, {
          id: "wagons",
          label: "TOTOWWAGONTRAIN.tabs.Wagons",
          cssClass: this.tabGroups.primary === "wagons" ? "active" : "",
        });
      }
      return tabs;
    }

    async addMember(actorId, group, field, maxCapacity) {
      const currentList = Array.from(group ?? []).filter(Boolean);
      // An Actor can only appear once in a given list. If already present or full, silently ignore.
      if (currentList.includes(actorId) || currentList.length >= maxCapacity) return;
      currentList.push(actorId);
      return await this.actor.update({ [field]: currentList });
    }

    async removeMember(index, group, field, capacity) {
        const idx = Number.parseInt(index, capacity);
        if (Number.isNaN(idx)) return;

        const currentList = Array.from(group ?? []).filter(Boolean);
        currentList.splice(idx, 1);

        return await this.actor.update({ [field]: currentList });
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    static async _changeMorale(event, target) {
      return this._changeValue(event, "system.moralepoints");
    }

    static async _changeResource(event, target) {
      return this._changeValue(event, `system.resources.${target.dataset.resource}`);
    }

    static async _onRoleView(event, target) {
      event.preventDefault();
      const actor = game.actors.get(target.dataset.actorId);
      return actor?.sheet?.render({ force: true });
    }

    static async _onRoleRemove(event, target) {
      event.preventDefault();
      const { role, index } = target.dataset;
      if (!role) return;

      switch (role) {
        case "cowboys":
          return await this.removeMember(index, this.actor.system.roles[role], 'system.roles.cowboys', MAX_COWBOYS);
        case "scouts":
          return await this.removeMember(index, this.actor.system.roles[role], 'system.roles.scouts', MAX_SCOUTS);
        case "wagons":
          return await this.removeMember(index, this.actor.system.wagons, 'system.wagons', MAX_WAGONS);
        default:
        return await this.actor.update({ [`system.roles.${role}`]: "" });
      }
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
      if (!(crew?.type === "pc" || crew?.type === "npc" || crew?.type === `${MODULE_ID}.wagon`)) return;

      const dropTarget = event.target.closest("[data-role]");
      if (!dropTarget) return;

      const { role } = dropTarget.dataset;
      if (!role) return;

      switch (role) {
        case "cowboys":
          return await this.addMember(actorId, this.actor.system.roles[role], 'system.roles.cowboys', MAX_COWBOYS);
        case "scouts":
          return await this.addMember(actorId, this.actor.system.roles[role], 'system.roles.scouts', MAX_SCOUTS);
        case "wagons":
          return await this.addMember(actorId, this.actor.system.wagons, 'system.wagons', MAX_WAGONS);
        default:
        return await this.actor.update({ [`system.roles.${role}`]: actorId });
      }
    }

    /**
     * A wagon train holds no items. The base sheet looks up allowed item types by actor type
     * and would throw for a type it does not know about, so reject drops here.
     * @override
     */
    async _onDropItemCreate(itemData, event) {
      ui.notifications.warn(game.i18n.localize("TOTOWWAGONTRAIN.noItems"));
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
