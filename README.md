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
- Type-safety for Queries
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

### Type-safety for Queries

The TypeScript compiler will validate your put operations and queries based on
your `DefineDatastore`'s metadata.

<img src="https://user-images.githubusercontent.com/19658/215000937-acad5f1f-ce83-4bd0-bff7-cbeceaffaadc.gif" width=500>

As of the latest version, `string`, `number`, `boolean`, `array[string]`,
`array[number]`, and `array[boolean]` types are supported. Others can be used as
`any`-typed values.

### Type-safe Response Data Access

The `item` / `items` in datastore operation responses provide type-safe access
to their attributes by leveraging your `DefineDatastore`'s metadata.

<img src="https://user-images.githubusercontent.com/19658/215002279-d0d1df01-eba4-4de4-9b40-361bf2dc44c2.gif" width=500>

As of the latest version, `string`, `number`, `boolean`, `array[string]`,
`array[number]`, and `array[boolean]` types are properly supported. Others can
be used as `any`-typed values. In addition, when an attribute has the
`required: true` constraint in the datastore definition, the attribute in item
data cannot be undefined.

## Getting Started

Once you define a datastore table and its list of properties, your code is ready
to use the data mapper.

The complete project is available under at
https://github.com/seratch/deno-slack-data-mapper-starter

With the Slack CLI, you can start a new project using the template:

```bash
slack create data-mapper-app -t seratch/deno-slack-data-mapper-starter
cd ./data-mapper-app
slack run
```

Refer to
[the template's README](https://github.com/seratch/deno-slack-data-mapper-starter)
for details.

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
  } as const, // `as const` here is necessary to pass `required` values to DataMapper
);
```

### functions/survey_demo.ts

In your custom function, you can instantiate `DataMapper` with the above
datastore table definition this way:
`new DataMapper<typeof Surveys.definition>(...)`.

```typescript
import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";

// Add the following to import_map.json
// "deno-slack-data-mapper/": "https://deno.land/x/deno_slack_data_mapper@2.6.0/",
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
  const mapper = new DataMapper<typeof Surveys.definition>({
    datastore: Surveys.definition,
    client,
    logLevel: "DEBUG",
  });

  const cultureSurvey = await mapper.save({
    attributes: {
      "id": "1",
      "title": "Good things in our company",
      "questions": [
        "Can you share the things you love about our corporate culture?",
        "Do you remember other members' behaviors representing our culture?",
      ],
      "tags": ["culture"],
      "maxParticipants": 10,
      "closed": false,
    },
  });
  console.log(`culture survey: ${JSON.stringify(cultureSurvey, null, 2)}`);
  if (cultureSurvey.error) {
    return { error: `Failed to create a record - ${cultureSurvey.error}` };
  }

  const productSurvey = await mapper.save({
    attributes: {
      "id": "2",
      "title": "Project ideas",
      "questions": [
        "Can you share interesting ideas for our future growth? Any crazy ideas are welcomed!",
      ],
      "tags": ["product", "future"],
      "maxParticipants": 150,
      "closed": false,
    },
  });
  console.log(`product survey: ${JSON.stringify(productSurvey, null, 2)}`);

  const findById = await mapper.findById({ id: "1" });
  console.log(`findById: ${JSON.stringify(findById, null, 2)}`);
  if (findById.error) {
    return { error: `Failed to find a record by ID - ${findById.error}` };
  }

  // Type-safe access to the item properties
  const id: string = findById.item.id;
  const title: string = findById.item.title;
  const questions: string[] = findById.item.questions;
  const tags: string[] | undefined = findById.item.tags;
  const maxParticipants: number | undefined = findById.item.maxParticipants;
  const closed: boolean = findById.item.closed;
  console.log(
    `id: ${id}, title: ${title}, questions: ${questions}, tags: ${tags}, maxParticipants: ${maxParticipants}, closed: ${closed}`,
  );

  const simpleQuery = await mapper.findAllBy({
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
    `findAllBy + simple '=' query: ${JSON.stringify(simpleQuery, null, 2)}`,
  );
  if (simpleQuery.error) {
    return { error: `Failed to find records - ${simpleQuery.error}` };
  }

  const greaterThanQuery = await mapper.findAllBy({
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
    `findAllBy + '>' query: ${JSON.stringify(greaterThanQuery, null, 2)}`,
  );
  if (greaterThanQuery.error) {
    return { error: `Failed to find records - ${greaterThanQuery.error}` };
  }

  const betweenQuery = await mapper.findAllBy({
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
    `findAllBy + 'between ? and ?' query: ${
      JSON.stringify(betweenQuery, null, 2)
    }`,
  );
  if (betweenQuery.error) {
    return { error: `Failed to find records - ${betweenQuery.error}` };
  }

  const complexQuery = await mapper.findAllBy({
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
    `findAllBy + '(between ? and ?) or (id = ?)' query: ${
      JSON.stringify(complexQuery, null, 2)
    }`,
  );
  if (complexQuery.error) {
    return { error: `Failed to find records - ${complexQuery.error}` };
  }

  const modification = await mapper.save({
    attributes: {
      "id": "1",
      "title": "Good things in our company",
      "maxParticipants": 20,
    },
  });
  console.log(`modification: ${JSON.stringify(modification, null, 2)}`);
  if (modification.error) {
    return { error: `Failed to update a record - ${modification.error}` };
  }

  const countAllResult = await mapper.countAll();
  console.log(countAllResult);

  const countResult = await mapper.countBy({
    where: {
      title: {
        operator: Operator.BeginsWith,
        value: "Good things",
      },
    },
  });
  console.log(countResult);

  const findByIdsResult = await mapper.findAllByIds({
    ids: ["1", "2", "3"],
  });
  console.log(findByIdsResult);

  const deletion1 = await mapper.deleteById({ id: "1" });
  console.log(`deletion 1: ${JSON.stringify(deletion1, null, 2)}`);
  if (deletion1.error) {
    return { error: `Failed to delete a record - ${deletion1.error}` };
  }
  const deletion2 = await mapper.deleteById({ id: "2" });
  console.log(`deletion 2: ${JSON.stringify(deletion1, null, 2)}`);
  if (deletion2.error) {
    return { error: `Failed to delete a record - ${deletion2.error}` };
  }

  const deleteAllByIdsResult = await mapper.deleteAllByIds({
    ids: ["1", "2", "3"],
  });
  console.log(deleteAllByIdsResult);

  const alreadyInserted = (await mapper.findById({ id: "100" })).item;
  if (!alreadyInserted) {
    for (let i = 0; i < 100; i += 1) {
      await mapper.save({
        attributes: {
          "id": `${i}`,
          "title": `Good ${i} things in our company`,
          "questions": [
            "Can you share the things you love about our corporate culture?",
          ],
          "tags": ["culture"],
          "maxParticipants": i * 10,
        },
      });
    }
  }
  const findFirstResults = await mapper.findFirstBy({
    where: {
      title: {
        operator: Operator.BeginsWith,
        value: "Good 1",
      },
    },
    limit: 5,
  });
  console.log(findFirstResults);

  const findAllResults = await mapper.findAllBy({
    where: {
      title: {
        operator: Operator.BeginsWith,
        value: "Good 1",
      },
    },
    limit: 5,
  });
  console.log(findAllResults);

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
