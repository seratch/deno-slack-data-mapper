# deno-slack-data-mapper

[![deno module](https://shield.deno.dev/x/deno_slack_data_mapper)](https://deno.land/x/deno_slack_data_mapper)

The deno-slack-data-mapper is a Deno library, which provides a greatly handy way
to manage data using
[Slack's next-generation hosting platform datastores](https://api.slack.com/future/datastores).

While the underlying datastore APIs are easy enough to use, building a
DynamoDB-syntax query in your code can sometimes be bothersome (especially when
having many arguments).

This library brings the following benefits to developers:

- Intuitive Expression Builder
- Type-safety for Quries
- Type-safe Response Data Access

### Intuitive Expression Builder

No need to learn the DynamoDB syntax anymore! With this library, you can build a
complex query with and/or parts intuitively.

<img src="https://user-images.githubusercontent.com/19658/215002015-43ce3087-27c4-4697-ac3b-c90ba3802891.gif" width=500>

For the simple equal questions such `id = ?` or `title = ?`, just passing
`{ where: { id: "123" }}` works as you expect.

For other operators such as `<`, `>=`, `begins_with()`, `contains`, and
`between A and B`, you can pass something like
`{ where: { maxParticipants: { value: 100, operator: Operator.GreaterThan } } }`.

Also, even combining a few expressions in `and`/`or` arrays is feasible like you
can see in the above video.

### Type-safety for Quries

Your put operations and queries will be validated by the TypeScript compiler
based on your `DefineDatastore`'s metadata.

<img src="https://user-images.githubusercontent.com/19658/215000937-acad5f1f-ce83-4bd0-bff7-cbeceaffaadc.gif" width=500>

As of the currently latest version, only `string`, `number`, `boolean`, and
their `array[*]` types are supported. Others can be used as `any`-typed values.

### Type-safe Response Data Access

The `item` / `items` in datastore operation responses provide type-safe access
to their attributes by leveraging your `DefineDatastore`'s metadata.

<img src="https://user-images.githubusercontent.com/19658/215002279-d0d1df01-eba4-4de4-9b40-361bf2dc44c2.gif" width=500>

As of the currently latest version, only `string`, `number`, `boolean`, and
their `array[*]` types are properly supported. Others can be used as `any`-typed
values. In addition, when an attribute has the `required: true` constraint in
the datastore definition, the attribute in item data cannot be undefined.

## Getting Started

Once you define a datastore table and its list of properties, your code is ready
to use the data mapper. The complete project is available under ./examples
directory.

### datastores/surveys.ts

Here is a simple datastore definition:

```typescript
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const Surveys = DefineDatastore(
  {
    name: "surveys",
    // The primary key's type must be a string
    primary_key: "id",
    attributes: {
      id: { type: Schema.types.string, required: true },
      title: { type: Schema.types.string, required: true },
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
      maxParticipants: { type: Schema.types.number }, // optional
      closed: { type: Schema.types.boolean, required: true },
    },
  } as const, // `as const` here is necessary to pass `required` value to DataMapper
);
```

### functions/survey_demo.ts

In your custom function, you can instantiate `DataMapper` with the above
datastore table definition this way:
`new DataMapper<typeof Surveys.definition>(...)`.

```typescript
import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";

// Add the following to import_map.json
// "deno-slack-data-mapper/": "https://deno.land/x/deno_slack_data_mapper@0.7.0/",
import { DataMapper, Operator } from "deno-slack-data-mapper/mod.ts";

import { Surveys } from "../datastores/surveys.ts";

export const def = DefineFunction({
  callback_id: "datastore-demo",
  title: "Datastore demo",
  source_file: "functions/survey_demo.ts",
  input_parameters: { properties: {}, required: [] },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(def, async ({ client }) => {
  // Instantiate a DataMapper:
  const mapper = new DataMapper<typeof Surveys.definition>({
    datastore: Surveys.definition,
    client,
    logLevel: "DEBUG",
  });
  const creation = await mapper.save({
    attributes: {
      "id": "1",
      "title": "Good things in our company",
      "questions": [
        "Can you share the things you love about our corporate culture?",
      ],
      "maxParticipants": 10,
      "closed": false,
    },
  });
  console.log(`creation result 1: ${JSON.stringify(creation, null, 2)}`);
  if (creation.error) {
    return { error: `Failed to create a record - ${creation.error}` };
  }
  const creation2 = await mapper.save({
    attributes: {
      "id": "2",
      "title": "Project ideas",
      "questions": [
        "Can you share interesting ideas for our future growth? Any crazy ideas are welcomed!",
      ],
      "maxParticipants": 150,
    },
  });
  console.log(`creation result 2: ${JSON.stringify(creation2, null, 2)}`);

  const results = await mapper.findById({ id: "1" });
  console.log(`query result 1 (findById): ${JSON.stringify(results, null, 2)}`);
  if (results.error) {
    return { error: `Failed to find a record by ID - ${results.error}` };
  }

  // Type-safe access to the item properties
  const id: string = results.item.id;
  const title: string = results.item.title;
  const questions: string[] = results.item.questions;
  const tags: string[] | undefined = results.item.tags;
  const maxParticipants: number | undefined = results.item.maxParticipants;
  const closed: boolean = results.item.closed;
  console.log(
    `id: ${id}, title: ${title}, questions: ${questions}, maxParticipants: ${maxParticipants}, closed: ${closed}`,
  );

  const results2 = await mapper.findAllBy({
    where: { title: "Project ideas" },
  });
  // {
  //   "expression": "#tt0k11 = :tt0k11",
  //   "attributes": {
  //     "#tt0k11": "title"
  //   },
  //   "values": {
  //     ":tt0k11": "Project ideas"
  //   }
  // }
  console.log(
    `query result 2 (findAllBy + simple '=' query): ${
      JSON.stringify(results2, null, 2)
    }`,
  );
  if (results2.error) {
    return { error: `Failed to find records - ${results2.error}` };
  }

  const results3 = await mapper.findAllBy({
    where: {
      maxParticipants: {
        value: 100,
        operator: Operator.GreaterThan,
      },
    },
  });
  // {
  //   "expression": "#e3oad1 > :e3oad1",
  //   "attributes": {
  //     "#e3oad1": "maxParticipants"
  //   },
  //   "values": {
  //     ":e3oad1": 100
  //   }
  // }
  console.log(
    `query result 3 (findAllBy + '>' query): ${
      JSON.stringify(results3, null, 2)
    }`,
  );
  if (results3.error) {
    return { error: `Failed to find records - ${results3.error}` };
  }

  const results4 = await mapper.findAllBy({
    where: {
      maxParticipants: {
        value: [100, 300],
        operator: Operator.Between,
      },
    },
  });
  // {
  //   "expression": "#z5i0h1 between :z5i0h10 and :z5i0h11",
  //   "attributes": {
  //     "#z5i0h1": "maxParticipants"
  //   },
  //   "values": {
  //     ":z5i0h10": 100,
  //     ":z5i0h11": 300
  //   }
  // }
  console.log(
    `query result 4 (findAllBy + 'between ? and ?' query): ${
      JSON.stringify(results4, null, 2)
    }`,
  );
  if (results4.error) {
    return { error: `Failed to find records - ${results4.error}` };
  }

  const results5 = await mapper.findAllBy({
    where: {
      or: [
        { maxParticipants: { value: [100, 300], operator: Operator.Between } },
        {
          and: [
            { id: "1" },
            { title: { value: "Good things", operator: Operator.BeginsWith } },
          ],
        },
      ],
    },
  });
  // {
  //   "expression": "(#nrdak1 between :nrdak10 and :nrdak11) or ((#v1ec82 = :v1ec82) and (begins_with(#xu2ie3, :xu2ie3)))",
  //   "attributes": {
  //     "#nrdak1": "maxParticipants",
  //     "#v1ec82": "id",
  //     "#xu2ie3": "title"
  //   },
  //   "values": {
  //     ":nrdak10": 100,
  //     ":nrdak11": 300,
  //     ":v1ec82": "1",
  //     ":xu2ie3": "Good things"
  //   }
  // }
  console.log(
    `query result 5 (findAllBy + '(between ? and ?) or (id = ?)' query): ${
      JSON.stringify(results5, null, 2)
    }`,
  );
  if (results5.error) {
    return { error: `Failed to find records - ${results5.error}` };
  }

  const modification = await mapper.save({
    attributes: {
      "id": "1",
      "title": "Good things in our company",
      "maxParticipants": 20,
    },
  });
  console.log(`modification result: ${JSON.stringify(modification, null, 2)}`);
  if (modification.error) {
    return { error: `Failed to update a record - ${modification.error}` };
  }

  const deletion = await mapper.deleteById({ id: "1" });
  console.log(`deletion result 1: ${JSON.stringify(deletion, null, 2)}`);
  if (deletion.error) {
    return { error: `Failed to delete a record - ${deletion.error}` };
  }
  const deletion2 = await mapper.deleteById({ id: "2" });
  console.log(`deletion result 2: ${JSON.stringify(deletion, null, 2)}`);
  if (deletion2.error) {
    return { error: `Failed to delete a record - ${deletion2.error}` };
  }

  return { outputs: {} };
});
```

### workfllows/survey_demo.ts

This file is very straightforward. There is nothing specific to this data-mapper
library:

```typescript
import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { def as Demo } from "../functions/survey_demo.ts";

export const workflow = DefineWorkflow({
  callback_id: "data-mapper-demo-workflow",
  title: "Data Mapper Demo Workflow",
  input_parameters: { properties: {}, required: [] },
});

workflow.addStep(Demo, {});
```

### manifest.ts

The same as above, there is nothing specific to this data-mapper library:

```typescript
import { Manifest } from "deno-slack-sdk/mod.ts";
import { Surveys } from "./datastores/surveys.ts";
import { workflow as SurveyDemo } from "./workflows/survey_demo.ts";

export default Manifest({
  name: "data-mapper-examples",
  description: "Data Mapper Example App",
  icon: "assets/default_new_app_icon.png",
  datastores: [Surveys],
  workflows: [SurveyDemo],
  outgoingDomains: [],
  botScopes: [
    "commands",
    "datastore:read",
    "datastore:write",
  ],
});
```

## License

The MIT License
