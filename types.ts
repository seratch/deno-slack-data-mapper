import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import {
  DatastoreDeleteResponse,
  DatastoreGetResponse,
  DatastorePutResponse,
  DatastoreQueryResponse,
  DatastoreSchema,
} from "https://deno.land/x/deno_slack_api@1.5.0/typed-method-types/apps.ts";
import { SlackAPIClient } from "https://deno.land/x/deno_slack_api@1.5.0/types.ts";
import { Operator } from "./enums.ts";

export type Definition = {
  name: string;
  primary_key: string;
  attributes: {
    [name: string]: {
      type: string;
      // TODO: when false is passed here, SavedAttributes does not work as expected
      required?: boolean;
    };
  };
};

type attributes = "attributes";
type type = "type";
type required = "required";

// TODO: Add more type supports
export type Attributes<Def extends Definition> = {
  [k in keyof Def[attributes]]?:
    (Def[attributes][k][type] extends "string" ? string
      : (Def[attributes][k][type] extends "number" ? number
        : (Def[attributes][k][type] extends "integer" ? number
          : (Def[attributes][k][type] extends "boolean" ? boolean
            // deno-lint-ignore no-explicit-any
            : any))));
};

// TODO: Add more type supports
// TODO: The type detection does not work with `required: false`
export type SavedAttributes<Def extends Definition> = {
  [k in keyof Def[attributes]]: (
    // string
    Def[attributes][k][type] extends "string"
      // TODO: extends true does not work as of Jan 2023
      ? (Def[attributes][k][required] extends boolean ? string
        : string | undefined)
      // number
      : Def[attributes][k][type] extends "number"
      // TODO: extends true does not work as of Jan 2023
        ? (Def[attributes][k][required] extends boolean ? number
          : number | undefined)
      // integer
      : Def[attributes][k][type] extends "integer"
      // TODO: extends true does not work as of Jan 2023
        ? (Def[attributes][k][required] extends boolean ? number
          : number | undefined)
      // boolean
      : Def[attributes][k][type] extends "boolean"
      // TODO: extends true does not work as of Jan 2023
        ? (Def[attributes][k][required] extends boolean ? boolean
          : boolean | undefined)
      // deno-lint-ignore no-explicit-any
      : any
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
        // TODO: value validation based on the given operator
        // e.g., number[] can be accepted for Operator.Between
        //       number can be accpeted GreaterThan etc.
        value: string | number | boolean | number[];
        operator: Operator;
      }
      // simple "=" condition
      // TODO: value validation based on the attribute definition
      | string
      | number
      | boolean;
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
  attributes: Record<string, string>;
  values: Record<string, string | number>;
}

export interface RawExpression {
  expression: string;
  attributes: Record<string, string>;
  values: Record<string, string | number | boolean>;
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

export interface RawExpressionQueryArgs {
  client: SlackAPIClient;
  datastore: string;
  expression: RawExpression;
  logger?: log.Logger;
}

export type PutResponse<Def extends Definition> =
  & Omit<DatastorePutResponse<DatastoreSchema>, "item">
  & { item: SavedAttributes<Def> };

export type QueryResponse<Def extends Definition> =
  & Omit<DatastoreQueryResponse<DatastoreSchema>, "items">
  & { items: SavedAttributes<Def>[] };

export type GetResponse<Def extends Definition> =
  & Omit<DatastoreGetResponse<DatastoreSchema>, "item">
  & { item: SavedAttributes<Def> };

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
