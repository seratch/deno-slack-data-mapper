import { Trigger } from "deno-slack-api/types.ts";
import { workflow } from "../workflows/survey_demo.ts";

const trigger: Trigger<typeof workflow.definition> = {
  type: "webhook",
  name: "Datastore Demo Trigger",
  workflow: `#/workflows/${workflow.definition.callback_id}`,
  inputs: {},
};
export default trigger;
