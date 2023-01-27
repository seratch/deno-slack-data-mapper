import { SlackAPIClient } from "https://deno.land/x/deno_slack_api@1.5.0/types.ts";
import {
  DatastoreDeleteResponse,
  DatastoreGetResponse,
  DatastorePutResponse,
  DatastoreQueryResponse,
  DatastoreSchema,
} from "https://deno.land/x/deno_slack_api@1.5.0/typed-method-types/apps.ts";
import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import * as func from "./functions.ts";
import {
  Condition,
  Conditions,
  ConfigurationError,
  Expression,
  InvalidExpressionError,
  Operator,
  SimpleExpression,
} from "./mod.ts";
import {
  AndConditions,
  DataMapperExpressionQueryArgs,
  DataMapperIdQueryArgs,
  DataMapperInitArgs,
  DataMapperSaveArgs,
  Definition,
  OrConditions,
  ParsedExpression,
  RawExpression,
  SavedAttributes,
} from "./types.ts";

export class DataMapper<Def extends Definition> {
  #client: SlackAPIClient;
  #logger: log.Logger;
  #defaultDatastore?: string;
  #primaryKey: string;

  constructor(args: DataMapperInitArgs) {
    this.#client = args.client;
    if (args.logLevel) {
      const level = args.logLevel;
      log.setup({
        handlers: { console: new log.handlers.ConsoleHandler(level) },
        loggers: { default: { level, handlers: ["console"] } },
      });
    }
    this.#logger = args.logger ?? log.getLogger();
    this.#defaultDatastore = args.datastore;
    this.#primaryKey = args.primaryKey ?? "id";
  }

  async save(args: DataMapperSaveArgs<Def>): Promise<
    & Omit<DatastorePutResponse<DatastoreSchema>, "item">
    & { item: SavedAttributes<Def> }
  > {
    const datastore = args.datastore ?? this.#defaultDatastore;
    if (!datastore) {
      throw new ConfigurationError(this.#datastoreMissingError);
    }
    return await func.save<Def>({
      client: this.#client,
      datastore,
      attributes: args.attributes,
      primaryKey: this.#primaryKey,
      logger: this.#logger,
    });
  }

  async findById(
    args: DataMapperIdQueryArgs,
  ): Promise<
    & Omit<DatastoreGetResponse<DatastoreSchema>, "item">
    & { item: SavedAttributes<Def> }
  > {
    const datastore = args.datastore ?? this.#defaultDatastore;
    if (!datastore) {
      throw new ConfigurationError(this.#datastoreMissingError);
    }
    return await func.findById<Def>({
      client: this.#client,
      datastore,
      id: args.id,
      logger: this.#logger,
    });
  }

  async findAllBy(
    args:
      | DataMapperExpressionQueryArgs<Def>
      | RawExpression
      | SimpleExpression<Def>,
  ): Promise<
    & DatastoreQueryResponse<DatastoreSchema>
    & { items: SavedAttributes<Def>[] }
  > {
    const datastore = this.#defaultDatastore;
    if (!datastore) {
      throw new ConfigurationError(this.#datastoreMissingError);
    }
    let expression:
      | RawExpression
      | SimpleExpression<Def>
      | undefined = undefined;
    if (Object.keys(args).includes("expression")) {
      const exp = (args as
        | DataMapperExpressionQueryArgs<Def>
        | RawExpression)
        .expression;
      if (typeof exp === "string") {
        expression = args as RawExpression;
      } else {
        expression = exp as
          | SimpleExpression<Def>
          | RawExpression;
      }
    } else if (Object.keys(args).includes("where")) {
      expression = args as SimpleExpression<Def>;
    } else {
      throw new ConfigurationError(`An unknown argument is passed: ${args}`);
    }
    return await func.findAllBy<Def>({
      client: this.#client,
      datastore,
      expression: compileExpression<Def>(expression),
      logger: this.#logger,
    });
  }

  async deleteById(
    args: DataMapperIdQueryArgs,
  ): Promise<DatastoreDeleteResponse<DatastoreSchema>> {
    const datastore = args.datastore ?? this.#defaultDatastore;
    if (!datastore) {
      throw new ConfigurationError(this.#datastoreMissingError);
    }
    return await func.deleteById({
      client: this.#client,
      datastore,
      id: args.id,
      logger: this.#logger,
    });
  }

  #datastoreMissingError = "`datastore` needs to be passed";
}

export function compileExpression<Def extends Definition>(
  given: RawExpression | SimpleExpression<Def>,
): RawExpression {
  const givenKeys = Object.keys(given);
  if (givenKeys.includes("expression")) {
    return given as RawExpression;
  } else if (givenKeys.includes("where")) {
    const where = (given as SimpleExpression<Def>).where;
    const parsedResult = parseConditions(where, undefined, {}, {});
    const expression: string = (typeof parsedResult.expression !== "string")
      ? fromExpressionToString(parsedResult.expression)
      : parsedResult.expression;
    return {
      expression,
      expressionAttributes: parsedResult.expressionAttributes,
      expressionValues: parsedResult.expressionValues,
    };
  } else {
    throw new InvalidExpressionError(`Unexpected condition detected: ${given}`);
  }
}

export function buildExpression(
  operator: Operator,
  attribute: string,
  value: string[],
): string {
  switch (operator) {
    case Operator.Equal:
      return `${attribute} = ${value}`;
    case Operator.GreaterThan:
      return `${attribute} > ${value}`;
    case Operator.GreaterThanEqual:
      return `${attribute} >= ${value}`;
    case Operator.LessThan:
      return `${attribute} < ${value}`;
    case Operator.LessThanEqual:
      return `${attribute} <= ${value}`;
    case Operator.Contains:
      return `${attribute} contains ${value}`;
    case Operator.BeginsWith:
      return `begins_with(${attribute}, ${value})`;
    case Operator.Between:
      if (value.length !== 2) {
        throw new InvalidExpressionError(
          "You need to pass two numbers for between Props",
        );
      }
      return `${attribute} between ${value[0]} and ${value[1]}`;
    default:
      throw new InvalidExpressionError(
        `Unknown expression - operator: ${operator}, attribute: ${attribute}, value: ${value}`,
      );
  }
}

// --------------------
// Internal functions
// --------------------

function isConditions<Def extends Definition>(
  value: Condition<Def> | Conditions<Def>,
): boolean {
  const keys = Object.keys(value);
  return keys.includes("and") || keys.includes("or");
}

function parseCondition<Def extends Definition>(
  condition: Condition<Def>,
  expressionAttributes: Record<string, string>,
  expressionValues: Record<string, string | number>,
): ParsedExpression {
  const randomName = Math.random().toString(36).slice(2, 7) +
    // To make the key unqiue for sure
    (Object.keys(expressionAttributes).length + 1).toString();
  const keys = Object.keys(condition);
  const attributeName = keys[0];
  expressionAttributes[`#${randomName}`] = attributeName;
  let expression = "";
  // deno-lint-ignore no-explicit-any
  const attributeValue = (condition as Record<string, any>)[attributeName];
  if (typeof attributeValue === "string") {
    expressionValues[`:${randomName}`] = attributeValue;
    expression = `#${randomName} = :${randomName}`;
  } else {
    const { value, operator } = attributeValue;
    const valueNames: string[] = [];
    if (value === undefined || value === null) {
      throw new ConfigurationError(`Unexpected value: ${value}`);
    }
    if (typeof value === "string" || typeof value === "number") {
      valueNames.push(`:${randomName}`);
      expressionValues[`:${randomName}`] = value;
    } else {
      for (const [idx, v] of Object.entries(value)) {
        valueNames.push(`:${randomName}${idx}`);
        expressionValues[`:${randomName}${idx}`] = v as string | number;
      }
    }
    expression = buildExpression(
      operator || Operator.Equal,
      `#${randomName}`,
      valueNames,
    );
  }
  return {
    expression,
    expressionAttributes,
    expressionValues,
  };
}

function parseConditions<Def extends Definition>(
  conditions: Condition<Def> | Conditions<Def>,
  currentExpression: Expression | undefined,
  currentAttributes: Record<string, string>,
  currentValues: Record<string, string | number>,
): ParsedExpression {
  if (isConditions(conditions)) {
    let expression: { and: Expression[] } | { or: Expression[] } | undefined =
      undefined;
    if (currentExpression && typeof currentExpression !== "string") {
      expression = currentExpression;
    }
    const _conditions = conditions as Conditions<Def>;
    if (Object.keys(_conditions).includes("and")) {
      const andConditions = _conditions as AndConditions<Def>;
      if (!expression || !Object.keys(expression).includes("and")) {
        expression = { and: [] };
      }
      const andExpression = expression as { and: Expression[] };
      for (const c of andConditions.and) {
        if (isConditions(c)) {
          const result = parseConditions(
            c,
            undefined,
            currentAttributes,
            currentValues,
          );
          andExpression.and.push(result.expression);
        } else if (Array.isArray(c)) {
          for (
            const cc of c as (
              | Condition<Def>
              | Conditions<Def>
            )[]
          ) {
            const result = parseCondition(
              cc as Condition<Def>,
              currentAttributes,
              currentValues,
            );
            andExpression.and.push(result.expression);
          }
        } else {
          const result = parseCondition(
            c as Condition<Def>,
            currentAttributes,
            currentValues,
          );
          andExpression.and.push(result.expression);
        }
      }
    }
    if (Object.keys(_conditions).includes("or")) {
      const orConditions = _conditions as OrConditions<Def>;
      if (!expression || !Object.keys(expression).includes("or")) {
        expression = { or: [] };
      }
      const orExpression = expression as { or: Expression[] };
      for (const c of orConditions.or) {
        if (isConditions(c)) {
          const result = parseConditions(
            c,
            undefined,
            currentAttributes,
            currentValues,
          );
          orExpression.or.push(result.expression);
        } else if (Array.isArray(c)) {
          for (
            const cc of c as (
              | Condition<Def>
              | Conditions<Def>
            )[]
          ) {
            const result = parseCondition(
              cc as Condition<Def>,
              currentAttributes,
              currentValues,
            );
            orExpression.or.push(result.expression);
          }
        } else {
          const result = parseCondition(
            c as Condition<Def>,
            currentAttributes,
            currentValues,
          );
          orExpression.or.push(result.expression);
        }
      }
    }
    return {
      expression: fromExpressionToString(
        expression as { and: Expression[] } | { or: Expression[] },
      ),
      expressionAttributes: currentAttributes,
      expressionValues: currentValues,
    };
  } else {
    return parseCondition(
      conditions as Condition<Def>,
      currentAttributes,
      currentValues,
    );
  }
}

function fromConditionToStringParts(conditions: Expression[]) {
  const result: string[] = [];
  for (const c of conditions) {
    if (typeof c === "string") result.push(c);
    else result.push(fromExpressionToString(c));
  }
  return result;
}

function fromExpressionToString(
  expression: { and: Expression[] } | { or: Expression[] },
): string {
  if (Object.keys(expression).includes("and")) {
    return fromConditionToStringParts((expression as { and: Expression[] }).and)
      .map((s) => `(${s})`).join(" and ");
  }
  if (Object.keys(expression).includes("or")) {
    return fromConditionToStringParts((expression as { or: Expression[] }).or)
      .map((s) => `(${s})`).join(" or ");
  }
  throw new InvalidExpressionError(`Unexpected data detected: ${expression}`);
}
