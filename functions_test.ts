import * as mf from "mock_fetch/mod.ts";
import { assertExists } from "https://deno.land/std@0.173.0/testing/asserts.ts";
import { SlackAPI } from "https://deno.land/x/deno_slack_api@1.5.0/mod.ts";
import { save } from "./mod.ts";
import {
  DefineDatastore,
  Schema,
} from "https://deno.land/x/deno_slack_sdk@1.4.4/mod.ts";

mf.install();

mf.mock("POST@/api/apps.datastore.put", () => {
  return new Response(
    JSON.stringify({
      "ok": true,
      "datastore": "suveys",
      "item": {
        "id": "123",
        "title": "Off-site event ideas",
        "question":
          "Can you share a fun idea for our off-site event in December?",
      },
    }),
    {
      status: 200,
    },
  );
});

export const Surveys = DefineDatastore(
  {
    name: "surveys",
    primary_key: "id",
    attributes: {
      id: { type: Schema.types.string, required: true },
      title: { type: Schema.types.string, required: true },
      questions: {
        type: Schema.types.array,
        items: { type: Schema.types.string },
        required: true,
      },
      maxParticipants: { type: Schema.types.number }, // optional
      closed: { type: Schema.types.boolean, required: true },
    },
  } as const,
);

Deno.test("Save a record", async () => {
  const client = SlackAPI("valid-token");
  const result = await save<typeof Surveys.definition>({
    client,
    datastore: "suveys",
    attributes: {
      title: "Off-site event ideas",
      questions: [
        "Can you share a fun idea for our off-site event in December?",
      ],
    },
  });
  assertExists(result.item);

  // Verify type-safety
  // deno-lint-ignore no-unused-vars
  const id: string = result.item.id;
  // deno-lint-ignore no-unused-vars
  const title: string = result.item.title;
  // deno-lint-ignore no-unused-vars
  const questions: string[] = result.item.questions;
  // deno-lint-ignore no-unused-vars
  const maxParticipants: number | undefined = result.item.maxParticipants;
  // deno-lint-ignore no-unused-vars
  const closed: boolean = result.item.closed;
});
