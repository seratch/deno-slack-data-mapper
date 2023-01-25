import * as mf from "mock_fetch/mod.ts";
import { assertExists } from "std/testing/asserts.ts";
import { SlackAPI } from "deno_slack_api/mod.ts";
import { DefineDatastore, Schema } from "deno_slack_sdk/mod.ts";
import { DataMapper, Operator } from "./mod.ts";

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
          "question":
            "Can you share a fun idea for our off-site event in December?",
        },
      ],
    }),
    {
      status: 200,
    },
  );
});

export const Surveys = DefineDatastore({
  name: "surveys",
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string, required: true },
    title: { type: Schema.types.string, required: true },
    question: { type: Schema.types.string }, // optional
    due: { type: Schema.types.string }, // optional
    maxParticipants: { type: Schema.types.number }, // optional
  },
});
export type SurveysProps = {
  id?: string;
  title: string;
  question?: string;
  due?: string;
  maxParticipants?: number;
};

Deno.test("Save a record", async () => {
  const client = SlackAPI("valid-token");
  const dataMapper = new DataMapper<SurveysProps>({ client });
  const result = await dataMapper.save({
    datastore: Surveys.definition.name,
    props: {
      title: "Off-site event ideas",
      question: "Can you share a fun idea for our off-site event in December?",
    },
  });
  assertExists(result.item);
});

Deno.test("Run a query", async () => {
  const client = SlackAPI("valid-token");
  const dataMapper = new DataMapper<SurveysProps>({
    client,
    datastore: Surveys.definition.name,
  });

  await dataMapper.findAllBy({
    expression: {
      expression: "#title = :title",
      expressionAttributes: { "#title": "title" },
      expressionValues: { ":title": "Off-site event ideas" },
    },
  });

  await dataMapper.findAllBy({
    expression: "#title = :title",
    expressionAttributes: { "#title": "title" },
    expressionValues: { ":title": "Off-site event ideas" },
  });
});

Deno.test("Run a query with simple expressions", async () => {
  const client = SlackAPI("valid-token");
  const dataMapper = new DataMapper<SurveysProps>({
    client,
    datastore: Surveys.definition.name,
  });

  const results = await dataMapper.findAllBy({
    where: {
      title: {
        value: "Off-site event ideas",
        operator: Operator.Equal,
      },
    },
  });
  const r = results.items[0];
  assertExists(r.title);

  await dataMapper.findAllBy({
    where: {
      maxParticipants: {
        value: 123,
        operator: Operator.GreaterThan,
      },
    },
  });

  await dataMapper.findAllBy({
    where: {
      maxParticipants: {
        value: [100, 200],
        operator: Operator.Between,
      },
    },
  });

  await dataMapper.findAllBy({ where: { title: "Off-site event ideas" } });

  await dataMapper.findAllBy({
    where: {
      maxParticipants: {
        value: [100, 200],
        operator: Operator.Between,
      },
    },
  });

  await dataMapper.findAllBy({
    where: {
      maxParticipants: {
        value: [100, 200],
        operator: Operator.Between,
      },
    },
  });
});
