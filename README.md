# deno-slack-data-mapper

deno-slack-data-mapper is a Deno library, which provides a greatly handy way to
manage data using
[Slack's next-generation hosting platform datastores](https://api.slack.com/future/datastores).

## Getting Started

Once you define a datastore table and its list of properties, your code is ready
to use the data mapper.

### datastores/surveys.ts

```typescript
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

export type SurveyProps = {
  id?: string;
  title: string;
  question?: string;
  maxParticipants?: number;
};
```

### functions/demo.ts

```typescript
import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
import { FunctionSourceFile } from "https://deno.land/x/deno_slack_source_file_resolver@0.1.5/mod.ts";
import {
  DataMapper,
  Operator,
} from "https://deno.land/x/deno_slack_data_mapper@0.0.7/mod.ts";
import { SurveyProps, Surveys } from "../datastores/surveys.ts";

export const def = DefineFunction({
  callback_id: "datastore-demo",
  title: "Datastore demo",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: { properties: {}, required: [] },
  output_parameters: { properties: {}, required: [] },
});

export default SlackFunction(def, async ({ client }) => {
  const mapper = new DataMapper<SurveyProps>({
    client,
    datastore: Surveys.definition.name,
  });
  const creation = await mapper.save({
    props: {
      "id": "1",
      "title": "Good things in our company",
      "question":
        "Can you share the things you love about our corporate culture?",
      "maxParticipants": 10,
    },
  });
  console.log(`creation result 1: ${JSON.stringify(creation, null, 2)}`);
  if (creation.error) {
    return { error: creation.error };
  }
  const creation2 = await mapper.save({
    props: {
      "id": "2",
      "title": "Project ideas",
      "question":
        "Can you share interesting ideas for our future growth? Any crazy ideas are welcomed!",
      "maxParticipants": 150,
    },
  });
  console.log(`creation result 2: ${JSON.stringify(creation2, null, 2)}`);

  const results = await mapper.findAllBy({ where: { id: "1" } });
  console.log(`query result 1: ${JSON.stringify(results, null, 2)}`);
  if (results.error) {
    return { error: results.error };
  }

  const results2 = await mapper.findAllBy({
    where: {
      maxParticipants: {
        value: 100,
        operator: Operator.GreaterThan,
      },
    },
  });
  console.log(`query result 2: ${JSON.stringify(results2, null, 2)}`);
  if (results2.error) {
    return { error: results2.error };
  }

  const results3 = await mapper.findAllBy({
    where: {
      maxParticipants: {
        value: [100, 300],
        operator: Operator.Between,
      },
    },
  });
  console.log(`query result 3: ${JSON.stringify(results3, null, 2)}`);
  if (results3.error) {
    return { error: results3.error };
  }

  const modification = await mapper.save({
    props: {
      "id": "1",
      "title": "Good things in our company",
      "maxParticipants": 20,
    },
  });
  console.log(`modification result: ${JSON.stringify(modification, null, 2)}`);
  if (modification.error) {
    return { error: modification.error };
  }

  const deletion = await mapper.deleteById({ id: "1" });
  console.log(`deletion result 1: ${JSON.stringify(deletion, null, 2)}`);
  if (deletion.error) {
    return { error: deletion.error };
  }
  const deletion2 = await mapper.deleteById({ id: "2" });
  console.log(`deletion result 2: ${JSON.stringify(deletion, null, 2)}`);
  if (deletion2.error) {
    return { error: deletion2.error };
  }

  return { outputs: {} };
});
```

## License

The MIT License
