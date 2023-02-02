import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const Surveys = DefineDatastore(
  {
    name: "surveys",
    // The primary key's type must be a string
    primary_key: "id",
    attributes: {
      id: { type: Schema.types.string, required: true },
      title: { type: Schema.types.string, required: true },
      maxParticipants: { type: Schema.types.number }, // optional
      questions: {
        type: Schema.types.array,
        items: { type: Schema.types.string },
        required: true,
      },
      tags: {
        type: Schema.types.array,
        items: { type: Schema.types.string },
        required: false,
      }, // optional
      closed: { type: Schema.types.boolean, required: true },
    },
  } as const, // `as const` here is necessary to pass `required` values to DataMapper
);
