import * as log from "std/log/mod.ts";
import { SlackAPIClient } from "deno_slack_api/types.ts";

export interface CommonSaveProps {
  id?: string;
}

// https://stackoverflow.com/questions/68257379/how-to-omit-optional-properties-from-type
type RequiredFieldsOnly<T> = {
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

export enum Operator {
  Equal,
  LessThan,
  LessThanEqual,
  GreaterThan,
  GreaterThanEqual,
  Between, // two args
  BeginsWith,
  Contains,
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
