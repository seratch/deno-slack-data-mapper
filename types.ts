import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import { SlackAPIClient } from "https://deno.land/x/deno_slack_api@1.5.0/types.ts";
import { Operator } from "./enums.ts";

export interface CommonSaveProps {
  id?: string;
}

// https://stackoverflow.com/questions/68257379/how-to-omit-optional-properties-from-type
export type RequiredFieldsOnly<T> = {
  [K in keyof T as T[K] extends Required<T>[K] ? K : never]: T[K];
};

export interface SimpleExpression<Props> {
  where: {
    [attribute in keyof Props]?:
      | {
        value: string | number | number[];
        operator: Operator | undefined;
      }
      | string;
  };
}

export interface RawExpression {
  expression: string;
  expressionAttributes: Record<string, string>;
  expressionValues: Record<string, string>;
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
