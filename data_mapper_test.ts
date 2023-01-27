import * as mf from "mock_fetch/mod.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.173.0/testing/asserts.ts";
import { SlackAPI } from "https://deno.land/x/deno_slack_api@1.5.0/mod.ts";
import {
  DefineDatastore,
  Schema,
} from "https://deno.land/x/deno_slack_sdk@1.4.4/mod.ts";
import { DataMapper, Operator } from "./mod.ts";
import { compileExpression } from "./data_mapper.ts";

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
// export type SurveysProps = {
//   id?: string;
//   title: string;
//   question?: string;
//   due?: string;
//   maxParticipants?: number;
// };

Deno.test("Save a record", async () => {
  const client = SlackAPI("valid-token");
  const dataMapper = new DataMapper<typeof Surveys.definition>({
    client,
    logLevel: "DEBUG",
  });
  const result = await dataMapper.save({
    datastore: Surveys.definition.name,
    attributes: {
      title: "Off-site event ideas",
      question: "Can you share a fun idea for our off-site event in December?",
    },
  });
  assertExists(result.item);
});

Deno.test("Run a query", async () => {
  const client = SlackAPI("valid-token");
  const dataMapper = new DataMapper<typeof Surveys.definition>({
    client,
    datastore: Surveys.definition.name,
    logLevel: "DEBUG",
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
  const dataMapper = new DataMapper<typeof Surveys.definition>({
    client,
    datastore: Surveys.definition.name,
    logLevel: "DEBUG",
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

  await dataMapper.findAllBy({
    where: {
      and: [{
        maxParticipants: { value: [100, 200], operator: Operator.Between },
      }],
    },
  });
  await dataMapper.findAllBy({
    where: {
      or: [
        {
          and: [{ id: "1" }, { title: "Off-site event ideas" }],
        },
        { id: "1" },
        { title: "Off-site event ideas" },
      ],
    },
  });
});

Deno.test("Construct a simplest condition", () => {
  const result = compileExpression<typeof Surveys.definition>({
    where: { title: "Off-site event ideas" },
  });
  assertEquals(Object.keys(result.expressionAttributes).length, 1);
  assertEquals(Object.keys(result.expressionValues).length, 1);
  let expression = result.expression;
  for (const name of Object.keys(result.expressionAttributes)) {
    expression = expression.replaceAll(name, "ATTR");
  }
  for (const name of Object.keys(result.expressionValues)) {
    expression = expression.replaceAll(name, "VALUE");
  }
  assertEquals(expression, "ATTR = VALUE");
});

Deno.test("Construct a condition with an operator", () => {
  const result = compileExpression<typeof Surveys.definition>({
    where: {
      maxParticipants: { value: [100, 200], operator: Operator.Between },
    },
  });
  assertEquals(Object.keys(result.expressionAttributes).length, 1);
  assertEquals(Object.keys(result.expressionValues).length, 2);
  let expression = result.expression;
  for (const name of Object.keys(result.expressionAttributes)) {
    expression = expression.replaceAll(name, "ATTR");
  }
  for (const name of Object.keys(result.expressionValues)) {
    expression = expression.replaceAll(name, "VALUE");
  }
  assertEquals(expression, "ATTR between VALUE and VALUE");
});

Deno.test("Construct complex conditions", () => {
  const result = compileExpression<typeof Surveys.definition>({
    where: {
      or: [
        {
          and: [{ id: "1" }, { title: "Off-site event ideas" }],
        },
        { id: "2" },
        { title: "New project ideas" },
      ],
    },
  });
  assertEquals(Object.keys(result.expressionAttributes).length, 4);
  assertEquals(Object.keys(result.expressionValues).length, 4);
  let expression = result.expression;
  for (const name of Object.keys(result.expressionAttributes)) {
    expression = expression.replaceAll(name, "ATTR");
  }
  for (const name of Object.keys(result.expressionValues)) {
    expression = expression.replaceAll(name, "VALUE");
  }
  assertEquals(
    expression,
    "((ATTR = VALUE) and (ATTR = VALUE)) or (ATTR = VALUE) or (ATTR = VALUE)",
  );
});
