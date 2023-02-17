import * as mf from "mock_fetch/mod.ts";
import { assertExists } from "./dependencies/testing_asserts.ts";
import { SlackAPI } from "./dependencies/deno_slack_api.ts";
import { save } from "./mod.ts";
import { DefineDatastore, Schema } from "./dependencies/deno_slack_sdk.ts";
import { findAllBy } from "./functions.ts";

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
mf.mock("POST@/api/apps.datastore.query", () => {
  return new Response(
    JSON.stringify({
      "ok": true,
      "datastore": "suveys",
      "items": [
        {
          "id": "123",
          "title": "Off-site event ideas",
          "questions": [
            "Can you share a fun idea for our off-site event in December?",
          ],
          "closed": false,
        },
      ],
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

Deno.test("Run a query", async () => {
  const client = SlackAPI("valid-token");
  const result = await findAllBy<typeof Surveys.definition>({
    client,
    datastore: "suveys",
    expression: {
      expression: "#id = :id",
      attributes: { "#id": "id" },
      values: { ":id": "123" },
    },
    cursor: "sdfdsfdasfasfafdsa",
    limit: 10,
  });
  assertExists(result.items);
});
