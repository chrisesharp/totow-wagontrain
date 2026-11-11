/**
 * Data model for the Wagon Train actor subtype.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class WagonModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      name: new fields.StringField(),
      members: new fields.ArrayField(new fields.StringField({ required: true, blank: true })),
      biography: new fields.HTMLField()
    };
  }
}
