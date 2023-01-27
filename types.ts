import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import { SlackAPIClient } from "https://deno.land/x/deno_slack_api@1.5.0/types.ts";
import { Operator } from "./enums.ts";

export type Definition = {
  primary_key: string;
  attributes: {
    [name: string]: {
      type: string;
      required?: boolean | never;
    };
  };
};

export type Attributes<Def extends Definition> = {
  [k in keyof Def["attributes"]]?:
    (Def["attributes"][k]["type"] extends "string" ? string
      : (Def["attributes"][k]["type"] extends "number" ? number
        : (Def["attributes"][k]["type"] extends "integer" ? number
          : (Def["attributes"][k]["type"] extends "boolean" ? boolean
            // deno-lint-ignore no-explicit-any
            : any))));
};

export type SavedAttributes<Def extends Definition> = {
  [k in keyof Def["attributes"]]: (
    // string
    Def["attributes"][k]["type"] & Def["attributes"][k]["required"] extends
      ("string" | true) ? string
      : Def["attributes"][k]["type"] extends "string" ? string | undefined
      // number
      : 
        & Def["attributes"][k]["type"]
        & Def["attributes"][k]["required"] extends ("number" & true) ? number
      : (
        Def["attributes"][k]["type"] extends "number" ? number | undefined
          // integer
          : 
            & Def["attributes"][k]["type"]
            & Def["attributes"][k]["required"] extends ("integer" & true)
            ? number
          : Def["attributes"][k]["type"] extends "integer" ? number | undefined
          // boolean
          : 
            & Def["attributes"][k]["type"]
            & Def["attributes"][k]["required"] extends ("boolean" & true)
            ? boolean
          : Def["attributes"][k]["type"] extends "boolean" ? boolean | undefined
          // deno-lint-ignore no-explicit-any
          : any
      )
  );
};

// -----------------------
// Expression types
// -----------------------

export interface SimpleExpression<Def extends Definition> {
  where: Condition<Def> | Conditions<Def>;
}

export type Condition<Def extends Definition, MyAttributes = Attributes<Def>> =
  {
    [attribute in keyof MyAttributes]?:
      | {
        value: string | number | number[];
        operator: Operator | undefined;
      }
      | string // simple "=" condition
    ;
  };

export type Conditions<Def extends Definition> =
  | AndConditions<Def>
  | OrConditions<Def>;

export interface AndConditions<Def extends Definition> {
  and: (Condition<Def> | Conditions<Def>)[];
  or?: never;
}

export interface OrConditions<Def extends Definition> {
  and?: never;
  or: (Condition<Def> | Conditions<Def>)[];
}

export type Expression =
  | string
  | { and: Expression[]; or?: never }
  | { or: Expression[]; and?: never };

export interface ParsedExpression {
  expression: Expression;
  expressionAttributes: Record<string, string>;
  expressionValues: Record<string, string | number>;
}

export interface RawExpression {
  expression: string;
  expressionAttributes: Record<string, string>;
  expressionValues: Record<string, string | number | boolean>;
}

// -----------------------
// Functions' types
// -----------------------

export interface SaveArgs<
  Def extends Definition,
  SaveAttributes = Attributes<Def>,
> {
  client: SlackAPIClient;
  datastore: string;
  primaryKey?: string;
  attributes: SaveAttributes;
  logger?: log.Logger;
}

export interface IdQueryArgs {
  client: SlackAPIClient;
  datastore: string;
  id: string;
  logger?: log.Logger;
}

export interface ExpressionQueryArgs {
  client: SlackAPIClient;
  datastore: string;
  expression: RawExpression;
  logger?: log.Logger;
}

// -----------------------
// DataMapper's types
// -----------------------

export interface DataMapperInitArgs {
  client: SlackAPIClient;
  logger?: log.Logger;
  logLevel?: log.LevelName;
  datastore?: string;
  primaryKey?: string;
}

export interface DataMapperSaveArgs<
  Def extends Definition,
  MyAttributes = Attributes<Def>,
> {
  attributes: MyAttributes;
  datastore?: string;
}

export interface DataMapperIdQueryArgs {
  id: string;
  datastore?: string;
}

export interface DataMapperExpressionQueryArgs<Def extends Definition> {
  expression: SimpleExpression<Def> | RawExpression;
  datastore?: string;
}
