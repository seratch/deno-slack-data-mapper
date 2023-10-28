import * as mf from "mock_fetch/mod.ts";
import { assertEquals, assertExists } from "./dependencies/testing_asserts.ts";
import { SlackAPI } from "./dependencies/deno_slack_api.ts";
import { DefineDatastore, Schema } from "./dependencies/deno_slack_sdk.ts";
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
        "questions": [
          "Can you share a fun idea for our off-site event in December?",
        ],
        "closed": false,
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

mf.mock("POST@/api/apps.datastore.get", () => {
  return new Response(
    JSON.stringify({
      "ok": true,
      "datastore": "suveys",
      "item": {
        "id": "123",
        "title": "Off-site event ideas",
        "questions": [
          "Can you share a fun idea for our off-site event in December?",
        ],
        "closed": false,
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
  const dataMapper = new DataMapper<typeof Surveys.definition>({
    client,
    datastore: Surveys.definition,
    logLevel: "DEBUG",
  });
  const result = await dataMapper.save({
    datastore: Surveys.definition.name,
    attributes: {
      title: "Off-site event ideas",
      questions: [
        "Can you share a fun idea for our off-site event in December?",
      ],
      maxParticipants: 300,
      closed: false,
    },
  });
  assertExists(result.item);

  // Verify type-safety
  // deno-lint-ignore no-unused-vars
  const id: string = result.item.id;
  // deno-lint-ignore no-unused-vars
  const title: string = result.item.title;
  // deno-lint-ignore no-unused-vars
  const question: string[] = result.item.questions;
  // deno-lint-ignore no-unused-vars
  const maxParticipants: number | undefined = result.item.maxParticipants;
  // deno-lint-ignore no-unused-vars
  const closed: boolean = result.item.closed;
});

Deno.test("Run a query", async () => {
  const client = SlackAPI("valid-token");
  const dataMapper = new DataMapper<typeof Surveys.definition>({
    client,
    datastore: Surveys.definition,
    logLevel: "DEBUG",
  });

  await dataMapper.findById("123");
  await dataMapper.findById({ id: "123" });

  await dataMapper.findAll();

  await dataMapper.findAllBy({
    expression: {
      expression: "#title = :title",
      attributes: { "#title": "title" },
      values: { ":title": "Off-site event ideas" },
    },
  });

  await dataMapper.findAllBy({
    expression: "#title = :title",
    attributes: { "#title": "title" },
    values: { ":title": "Off-site event ideas" },
  });
});

Deno.test("Run a query with simple expressions", async () => {
  const client = SlackAPI("valid-token");
  const dataMapper = new DataMapper<typeof Surveys.definition>({
    client,
    datastore: Surveys.definition,
    logLevel: "DEBUG",
  });

  const results = await dataMapper.findAllBy({
    where: {
      title: {
        value: "Off-site event ideas",
        operator: Operator.Equal,
      },
    },
    cursor: "sdfsdfdsafsafdsafsdf",
    limit: 10,
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
    cursor: "sdfsdfdsafsafdsafsdf",
    limit: 10,
  });
});

Deno.test("Construct a simplest condition", () => {
  const result = compileExpression<typeof Surveys.definition>({
    where: { title: "Off-site event ideas" },
  });
  assertEquals(Object.keys(result.attributes).length, 1);
  assertEquals(Object.keys(result.values).length, 1);
  let expression = result.expression;
  for (const name of Object.keys(result.attributes)) {
    expression = expression.replaceAll(name, "ATTR");
  }
  for (const name of Object.keys(result.values)) {
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
  assertEquals(Object.keys(result.attributes).length, 1);
  assertEquals(Object.keys(result.values).length, 2);
  let expression = result.expression;
  for (const name of Object.keys(result.attributes)) {
    expression = expression.replaceAll(name, "ATTR");
  }
  for (const name of Object.keys(result.values)) {
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
  assertEquals(Object.keys(result.attributes).length, 4);
  assertEquals(Object.keys(result.values).length, 4);
  let expression = result.expression;
  for (const name of Object.keys(result.attributes)) {
    expression = expression.replaceAll(name, "ATTR");
  }
  for (const name of Object.keys(result.values)) {
    expression = expression.replaceAll(name, "VALUE");
  }
  assertEquals(
    expression,
    "((ATTR = VALUE) and (ATTR = VALUE)) or (ATTR = VALUE) or (ATTR = VALUE)",
  );
});

Deno.test("Two conditions in a single condition object", () => {
  const result = compileExpression<typeof Surveys.definition>({
    where: { title: "New project ideas", closed: false },
  });
  assertEquals(Object.keys(result.attributes).length, 2);
  assertEquals(Object.keys(result.values).length, 2);
  let expression = result.expression;
  for (const name of Object.keys(result.attributes)) {
    expression = expression.replaceAll(name, "ATTR");
  }
  for (const name of Object.keys(result.values)) {
    expression = expression.replaceAll(name, "VALUE");
  }
  assertEquals(
    expression,
    "(ATTR = VALUE) and (ATTR = VALUE)",
  );
});
