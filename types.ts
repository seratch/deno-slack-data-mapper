import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import { SlackAPIClient } from "https://deno.land/x/deno_slack_api@1.5.0/types.ts";
import { Operator } from "./enums.ts";

export interface CommonSaveProps {
  id?: string;
}

export interface SimpleExpression<Props> {
  where: Condition<Props> | Conditions<Props>;
}

export type Condition<Props> = {
  [attribute in keyof Props]?:
    | {
      value: string | number | number[];
      operator: Operator | undefined;
    }
    | string // simple "=" condition
  ;
};

export type Conditions<Props> = AndConditions<Props> | OrConditions<Props>;

export interface AndConditions<Props> {
  and: (Condition<Props> | Conditions<Props>)[];
  or?: never;
}

export interface OrConditions<Props> {
  and?: never;
  or: (Condition<Props> | Conditions<Props>)[];
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
  expressionValues: Record<string, string | number>;
}

// -----------------------
// Functions' types
// -----------------------

export interface SaveArgs<Props> {
  client: SlackAPIClient;
  datastore: string;
  props: CommonSaveProps & Props;
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
}

export interface DataMapperSaveArgs<Props> {
  props: CommonSaveProps & Props;
  datastore?: string;
}

export interface DataMapperIdQueryArgs {
  id: string;
  datastore?: string;
}

export interface DataMapperExpressionQueryArgs<Props> {
  expression: SimpleExpression<Props> | RawExpression;
  datastore?: string;
}
