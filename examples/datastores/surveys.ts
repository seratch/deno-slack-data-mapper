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

// The types for attributes, which will be used by deno-slack-data-mapper.
// Yes, this part is so repetitive! However,
// I'm not sure about a way to generate this type under the hood.
// If you're a TS expert, can you help this project?
export type SurveyProps = {
  id?: string;
  title: string;
  question?: string;
  maxParticipants?: number;
};
