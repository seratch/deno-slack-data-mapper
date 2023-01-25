# deno-slack-data-mapper

deno-slack-data-mapper is a Deno library, which provides a greatly handy way to
manage data using
[Slack's next-generation hosting platform datastores](https://api.slack.com/future/datastores).

## Getting Started

```typescript
import { DataMapper } from "https://deno.land/x/deno_slack_data_mapper@0.0.1/mod.ts";
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

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
  title: string;
  question?: string;
  due?: string;
  maxParticipants?: number;
};

// Save a survey
export default SlackFunction(def, async ({ inputs, client }) => {
  const mapper = new DataMapper<SurveyProps>({
    client,
    datastore: Surveys.definition.name,
  });
  const creation = await mapper.save({
    props: {
      title: inputs.title,
      question: inputs.question,
    },
  });
  if (creation.error) {
    const error = `Failed to save a survey - ${creation.error}`;
    return { error };
  }
  const survey_id = creation.item.id;
  return { outputs: { survey_id } };
});

// Find surveys
export default SlackFunction(def, async ({ inputs, client }) => {
  const mapper = new DataMapper<SurveyProps>({
    client,
    datastore: Surveys.definition.name,
  });
  const results = await mapper.findAllBy({
    where: {
      title: {
        value: "Off-site event ideas",
        operator: Operator.Equal,
      },
    },
  });
  if (results.error) {
    const error = `Failed to find surveys - ${results.error}`;
    return { error };
  }
  const survey_ids = results.items.map((i) => i.id as string);
  return { outputs: { survey_ids } };
});
```

## License

The MIT License
