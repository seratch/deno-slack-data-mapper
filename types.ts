import * as log from "./dependencies/logger.ts";
import {
  DatastoreDeleteResponse,
  DatastoreGetResponse,
  DatastorePutResponse,
  DatastoreQueryResponse,
  DatastoreSchema,
} from "./dependencies/deno_slack_api_typed_method_types.ts";
import {
  CursorPaginationArgs,
  SlackAPIClient,
} from "./dependencies/deno_slack_api_types.ts";
import { Operator } from "./enums.ts";

export type Definition = {
  name: string;
  primary_key: string;
  attributes: {
    [name: string]: {
      type: string;
      required?: boolean;
      items?: { type: string };
    };
  };
};

type attributes = "attributes";
type type = "type";
type required = "required";
type items = "items";

// TODO: Add more type supports
export type Attributes<Def extends Definition> = {
  [k in keyof Def[attributes]]?:
    // array
    Def[attributes][k][type] extends "array" ? (
        Def[attributes][k][items] extends { type: "string" } ? string[]
          : Def[attributes][k][items] extends { type: "number" } ? number[]
          : Def[attributes][k][items] extends { type: "integer" } ? number[]
          : Def[attributes][k][items] extends { type: "boolean" } ? boolean[]
          // deno-lint-ignore no-explicit-any
          : any[]
      )
      // string
      : Def[attributes][k][type] extends "string" ? string
      // number
      : (Def[attributes][k][type] extends "number" ? number
        // integer
        : (Def[attributes][k][type] extends "integer" ? number
          // boolean
          : (Def[attributes][k][type] extends "boolean" ? boolean
            // deno-lint-ignore no-explicit-any
            : any)));
};

// TODO: Add more type supports
export type SavedAttributes<Def extends Definition> = {
  [k in keyof Def[attributes]]:
    // array[*]
    Def[attributes][k][type] extends "array" ? (
        // string
        Def[attributes][k][items] extends { type: "string" }
          ? (Def[attributes][k][required] extends true ? string[]
            : string[] | undefined)
          // number
          : Def[attributes][k][items] extends { type: "number" }
            ? (Def[attributes][k][required] extends true ? number[]
              : number[] | undefined)
          // integer
          : Def[attributes][k][items] extends { type: "integer" }
            ? (Def[attributes][k][required] extends true ? number[]
              : number[] | undefined)
          // boolean
          : Def[attributes][k][items] extends { type: "boolean" }
            ? (Def[attributes][k][required] extends true ? boolean[]
              : boolean[] | undefined)
          // deno-lint-ignore no-explicit-any
          : any[]
      )
      // string
      : Def[attributes][k][type] extends "string"
        ? (Def[attributes][k][required] extends true ? string
          : string | undefined)
      // number
      : Def[attributes][k][type] extends "number"
        ? (Def[attributes][k][required] extends true ? number
          : number | undefined)
      // integer
      : Def[attributes][k][type] extends "integer"
        ? (Def[attributes][k][required] extends true ? number
          : number | undefined)
      // boolean
      : Def[attributes][k][type] extends "boolean"
        ? (Def[attributes][k][required] extends true ? boolean
          : boolean | undefined)
      // deno-lint-ignore no-explicit-any
      : any;
};

// -----------------------
// Expression types
// -----------------------

export interface SimpleExpression<Def extends Definition> {
  where: Condition<Def> | Conditions<Def>;
}

export type Condition<Def extends Definition> = {
  [k in keyof Attributes<Def>]?:
    | {
      // TODO: value validation based on the given operator
      // e.g., number[] can be accepted for Operator.Between
      //       number can be accpeted GreaterThan etc.
      value: ExpressionValue | [number, number];
      operator: Operator;
    }
    // simple "=" condition
    // TODO: value validation based on the attribute definition
    | ExpressionValue;
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

export type ExpressionValue = string | number | boolean;

export interface ParsedExpression {
  expression: Expression;
  attributes: Record<string, string>;
  values: Record<string, ExpressionValue>;
}

export interface RawExpression {
  expression: string;
  attributes: Record<string, string>;
  values: Record<string, ExpressionValue>;
}

// -----------------------
// Functions' types
// -----------------------

export interface SaveArgs<Def extends Definition> {
  client: SlackAPIClient;
  datastore: string;
  primaryKey?: string;
  attributes: Attributes<Def>;
  logger?: log.Logger;
}

export interface IdQueryArgs {
  client: SlackAPIClient;
  datastore: string;
  id: string;
  logger?: log.Logger;
}

export type RawExpressionQueryArgs = CursorPaginationArgs & {
  client: SlackAPIClient;
  datastore: string;
  expression: RawExpression;
  logger?: log.Logger;
};

export type PutResponse<Def extends Definition> =
  & Omit<DatastorePutResponse<DatastoreSchema>, "item">
  & { item: SavedAttributes<Def> };

export type GetResponse<Def extends Definition> =
  & Omit<DatastoreGetResponse<DatastoreSchema>, "item">
  & { item: SavedAttributes<Def> };

export type QueryResponse<Def extends Definition> =
  & Omit<DatastoreQueryResponse<DatastoreSchema>, "items">
  & { items: SavedAttributes<Def>[] };

export type DeleteResponse = DatastoreDeleteResponse<DatastoreSchema>;

// -----------------------
// DataMapper's types
// -----------------------

export interface DataMapperInitArgs<Def extends Definition> {
  datastore: Def;
  client: SlackAPIClient;
  logger?: log.Logger;
  logLevel?: log.LevelName;
}

export interface DataMapperSaveArgs<Def extends Definition> {
  attributes: Attributes<Def>;
  datastore?: string;
}

export interface DataMapperIdQueryArgs {
  id: string;
  datastore?: string;
}

export type DataMapperExpressionQueryArgs<Def extends Definition> =
  & CursorPaginationArgs
  & {
    expression: SimpleExpression<Def> | RawExpression;
    datastore?: string;
  };
