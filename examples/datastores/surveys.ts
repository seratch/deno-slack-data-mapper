import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const Surveys = DefineDatastore({
  name: "surveys",
  // The primary key's type must be a string
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string, required: true },
    title: { type: Schema.types.string, required: true },
    question: { type: Schema.types.string }, // optional
    maxParticipants: { type: Schema.types.number }, // optional
  },
});
