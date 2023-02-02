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

  return { outputs: {} };
});
