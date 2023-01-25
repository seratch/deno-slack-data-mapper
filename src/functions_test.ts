import * as mf from "mock_fetch/mod.ts";
import { assertExists } from "std/testing/asserts.ts";
import { SlackAPI } from "deno_slack_api/mod.ts";
import { save } from "./mod.ts";

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

Deno.test("Save a record", async () => {
  const client = SlackAPI("valid-token");
  const result = await save({
    client,
    datastore: "suveys",
    props: {
      title: "Off-site event ideas",
      question: "Can you share a fun idea for our off-site event in December?",
    },
  });
  assertExists(result.item);
});
