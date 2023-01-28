import { DefineFunction, SlackFunction } from "deno-slack-sdk/mod.ts";
import { DataMapper, Operator } from "../../mod.ts";
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
