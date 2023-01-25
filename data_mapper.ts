import { SlackAPIClient } from "https://deno.land/x/deno_slack_api@1.5.0/types.ts";
import {
  DatastoreGetResponse,
  DatastorePutResponse,
  DatastoreQueryResponse,
  DatastoreSchema,
} from "https://deno.land/x/deno_slack_api@1.5.0/typed-method-types/apps.ts";
import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import * as func from "./functions.ts";
import { Operator } from "./mod.ts";
import {
  DataMapperExpressionQueryArgs,
  DataMapperIdQueryArgs,
  DataMapperInitArgs,
  DataMapperSaveArgs,
  RawExpression,
  SimpleExpression,
} from "./types.ts";

export class DataMapper<Props> {
  #client: SlackAPIClient;
  #logger: log.Logger;
  #defaultDatastore?: string;

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
  }

  async save(
    args: DataMapperSaveArgs<Props>,
  ): Promise<
    DatastorePutResponse<DatastoreSchema & { [k in keyof Props]: string }>
  > {
    const datastore = args.datastore ?? this.#defaultDatastore;
    if (!datastore) {
      throw new Error(this.#datastoreMissingError);
    }
    return await func.save<Props>({
      client: this.#client,
      datastore,
      props: args.props,
      logger: this.#logger,
    });
  }

  async findById(
    args: DataMapperIdQueryArgs,
  ): Promise<
    DatastoreGetResponse<DatastoreSchema & { [k in keyof Props]: string }>
  > {
    const datastore = args.datastore ?? this.#defaultDatastore;
    if (!datastore) {
      throw new Error(this.#datastoreMissingError);
    }
    return await func.findById<{ [k in keyof Props]: string }>({
      client: this.#client,
      datastore,
      id: args.id,
      logger: this.#logger,
    });
  }

  async findAllBy(
    args:
      | DataMapperExpressionQueryArgs<Props>
      | RawExpression
      | SimpleExpression<Props>,
  ): Promise<
    DatastoreQueryResponse<
      DatastoreSchema
    > & { items: { [k in keyof Props]: string }[] }
  > {
    const datastore = this.#defaultDatastore;
    if (!datastore) {
      throw new Error(this.#datastoreMissingError);
    }
    if (
      this.#instanceOf<RawExpression>(args) ||
      this.#instanceOf<SimpleExpression<Props>>(args)
    ) {
      return await func.findAllBy<Props>({
        client: this.#client,
        datastore,
        expression: this.#toRawExpression(args),
        logger: this.#logger,
      });
    }
    return await func.findAllBy<Props>({
      client: this.#client,
      datastore,
      expression: this.#toRawExpression(args.expression),
      logger: this.#logger,
    });
  }

  async deleteById(args: DataMapperIdQueryArgs) {
    const datastore = args.datastore ?? this.#defaultDatastore;
    if (!datastore) {
      throw new Error(this.#datastoreMissingError);
    }
    return await func.deleteById({
      client: this.#client,
      datastore,
      id: args.id,
      logger: this.#logger,
    });
  }

  // -----------------------
  // Private utilities and constants
  // -----------------------

  // deno-lint-ignore no-explicit-any
  #instanceOf<A>(object: any): object is A {
    return object;
  }

  #toRawExpression(
    given: RawExpression | SimpleExpression<Props>,
  ): RawExpression {
    const givenKeys = Object.keys(given);
    if (givenKeys.includes("expression")) {
      return given as RawExpression;
    } else if (givenKeys.includes("where")) {
      const randomName = Math.random().toString(36).slice(2, 7);
      const where = (given as SimpleExpression<Props>).where;
      const keys = Object.keys(where);

      const attributeName = keys[0];
      const expressionAttributes: Record<string, string> = {};
      expressionAttributes[`#${randomName}`] = attributeName;

      let expression = "";
      // deno-lint-ignore no-explicit-any
      const attributeValue = (where as Record<string, any>)[attributeName];
      const expressionValues: Record<string, string> = {};
      if (typeof attributeValue === "string") {
        expressionValues[`:${randomName}`] = attributeValue;
        expression = `#${randomName} = :${randomName}`;
      } else {
        const { value, operator } = attributeValue;
        const valueNames: string[] = [];
        if (typeof value === "string" || typeof value === "number") {
          valueNames.push(`:${randomName}`);
          expressionValues[`:${randomName}`] = value.toString();
        } else {
          for (const [idx, v] of Object.entries(value)) {
            valueNames.push(`:${randomName}${idx}`);
            // deno-lint-ignore no-explicit-any
            expressionValues[`:${randomName}${idx}`] = (v as any).toString();
          }
        }
        expression = this.#buildExpression(
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
    } else {
      throw new Error(`Unexpected condition: ${given}`);
    }
  }

  #buildExpression(
    operator: Operator,
    attribute: string,
    value: string[],
  ) {
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
          throw new Error("You need to pass two numbers for between query");
        }
        return `${attribute} between ${value[0]} and ${value[1]}`;
      default:
        throw new Error(
          `Unknown expression - operator: ${operator}, attribute: ${attribute}, value: ${value}`,
        );
    }
  }

  #datastoreMissingError = "datastore needs to be passed";
}
