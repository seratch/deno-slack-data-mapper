import {
  CursorPaginationArgs,
  SlackAPIClient,
} from "./dependencies/deno_slack_api_types.ts";
import * as log from "./dependencies/logger.ts";
import * as func from "./functions.ts";
import {
  Condition,
  Conditions,
  ConfigurationError,
  DeleteResponse,
  Expression,
  ExpressionValue,
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
  GetResponse,
  OrConditions,
  ParsedExpression,
  PutResponse,
  QueryResponse,
  RawExpression,
} from "./types.ts";

export class DataMapper<Def extends Definition> {
  #client: SlackAPIClient;
  #logger: log.Logger;
  #defaultDatastore?: string;
  #primaryKey: string;

  constructor(args: DataMapperInitArgs<Def>) {
    this.#client = args.client;
    if (args.logLevel) {
      const level = args.logLevel;
      log.setup({
        handlers: { console: new log.handlers.ConsoleHandler(level) },
        loggers: { default: { level, handlers: ["console"] } },
      });
    }
    this.#logger = args.logger ?? log.getLogger();
    this.#defaultDatastore = args.datastore.name;
    this.#primaryKey = args.datastore.primary_key;
  }

  async save(args: DataMapperSaveArgs<Def>): Promise<PutResponse<Def>> {
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

  async findById(args: DataMapperIdQueryArgs): Promise<GetResponse<Def>> {
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
      | RawExpression & CursorPaginationArgs
      | SimpleExpression<Def> & CursorPaginationArgs,
  ): Promise<QueryResponse<Def>> {
    const datastore = this.#defaultDatastore;
    if (!datastore) {
      throw new ConfigurationError(this.#datastoreMissingError);
    }
    let expression:
      | RawExpression
      | SimpleExpression<Def>
      | undefined = undefined;
    if (Object.keys(args).includes("expression")) {
      const expressionProperty = (args as
        | DataMapperExpressionQueryArgs<Def>
        | RawExpression).expression;
      if (typeof expressionProperty === "string") {
        expression = args as RawExpression;
      } else {
        expression = expressionProperty as
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
      cursor: args.cursor,
      limit: args.limit,
      logger: this.#logger,
    });
  }

  async deleteById(args: DataMapperIdQueryArgs): Promise<DeleteResponse> {
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
      attributes: parsedResult.attributes,
      values: parsedResult.values,
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
  attributes: Record<string, string>,
  values: Record<string, ExpressionValue>,
): ParsedExpression {
  const randomName = Math.random().toString(36).slice(2, 7) +
    // To make the key unqiue for sure
    (Object.keys(attributes).length + 1).toString();
  const keys = Object.keys(condition);
  const attributeName = keys[0];
  attributes[`#${randomName}`] = attributeName;
  let expression = "";
  // deno-lint-ignore no-explicit-any
  const attributeValue = (condition as Record<string, any>)[attributeName];
  if (typeof attributeValue === "string") {
    values[`:${randomName}`] = attributeValue;
    expression = `#${randomName} = :${randomName}`;
  } else {
    const { value, operator } = attributeValue;
    const valueNames: string[] = [];
    if (value === undefined || value === null) {
      throw new ConfigurationError(`Unexpected value: ${value}`);
    }
    if (typeof value === "string" || typeof value === "number") {
      valueNames.push(`:${randomName}`);
      values[`:${randomName}`] = value;
    } else {
      for (const [idx, v] of Object.entries(value)) {
        valueNames.push(`:${randomName}${(idx + 1)}`);
        values[`:${randomName}${(idx + 1)}`] = v as ExpressionValue;
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
    attributes,
    values,
  };
}

function parseConditions<Def extends Definition>(
  conditions: Condition<Def> | Conditions<Def>,
  currentExpression: Expression | undefined,
  currentAttributes: Record<string, string>,
  currentValues: Record<string, ExpressionValue>,
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
            const cc of c as (Condition<Def> | Conditions<Def>)[]
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
      attributes: currentAttributes,
      values: currentValues,
    };
  } else {
    return parseCondition(
      conditions as Condition<Def>,
      currentAttributes,
      currentValues,
    );
  }
}

function fromConditionToStringParts(conditions: Expression[]): string[] {
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
