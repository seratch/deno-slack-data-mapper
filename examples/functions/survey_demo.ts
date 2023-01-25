import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
import { DataMapper, Operator } from "deno-slack-data-mapper/mod.ts";
import { SurveyProps, Surveys } from "../datastores/surveys.ts";

export const def = DefineFunction({
  callback_id: "datastore-demo",
  title: "Datastore demo",
  source_file: "functions/survey_demo.ts",
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
  console.log(`query result 1 (findById): ${JSON.stringify(results, null, 2)}`);
  if (results.error) {
    return { error: results.error };
  }

  const results2 = await mapper.findAllBy({
    where: { title: "Project ideas" },
  });
  console.log(
    `query result 2 (findAllBy + simple '=' query): ${
      JSON.stringify(results2, null, 2)
    }`,
  );
  if (results2.error) {
    return { error: results2.error };
  }

  const results3 = await mapper.findAllBy({
    where: {
      maxParticipants: {
        value: 100,
        operator: Operator.GreaterThan,
      },
    },
  });
  console.log(
    `query result 3 (findAllBy + '>' query): ${
      JSON.stringify(results3, null, 2)
    }`,
  );
  if (results2.error) {
    return { error: results2.error };
  }

  const results4 = await mapper.findAllBy({
    where: {
      maxParticipants: {
        value: [100, 300],
        operator: Operator.Between,
      },
    },
  });
  console.log(
    `query result 4 (findAllBy + 'between ? and ?' query): ${
      JSON.stringify(results4, null, 2)
    }`,
  );
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
