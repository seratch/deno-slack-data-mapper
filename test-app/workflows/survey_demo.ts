import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { def as Demo } from "../functions/survey_demo.ts";

export const workflow = DefineWorkflow({
  callback_id: "data-mapper-demo-workflow",
  title: "Data Mapper Demo Workflow",
  input_parameters: { properties: {}, required: [] },
});

workflow.addStep(Demo, {});
