/**
 * Data model for the Wagon Train actor subtype.
 * @extends {foundry.abstract.TypeDataModel}
 */
export class WagonTrainModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };

    // A pair of fields for a "dot track": `value` is the number of filled dots,
    // `max` is derived in prepareDerivedData as the number of empty dots left.
    const dotTrack = (limit) =>
      new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: limit }),
        max: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0, max: limit }),
      });

    // A pair of fields for a counted resource with a starting amount.
    const counter = () =>
      new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
        initial: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
      });

    return {
      roles: new fields.SchemaField({
        trailboss: new fields.StringField({ required: true, blank: true }),
        quartermaster: new fields.StringField({ required: true, blank: true }),
        wrangler: new fields.StringField({ required: true, blank: true }),
        agent: new fields.StringField({ required: true, blank: true }),
        cowboys: new fields.ArrayField(new fields.StringField({ required: true, blank: true })),
        scouts: new fields.ArrayField(new fields.StringField({ required: true, blank: true })),
      }),

      moralepoints: dotTrack(10),

      resources: new fields.SchemaField({
        food: dotTrack(30),
        water: dotTrack(30),
        medicine: dotTrack(30),
        ammunition: dotTrack(30),
        money: counter(),
        cattle: counter(),
      }),
    };
  }

  /** @override */
  prepareDerivedData() {
    for (const key of ["food", "water", "medicine", "ammunition"]) {
      this.resources[key].max = 30 - this.resources[key].value;
    }
    this.moralepoints.max = 10 - this.moralepoints.value;
  }
}
