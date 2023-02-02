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
