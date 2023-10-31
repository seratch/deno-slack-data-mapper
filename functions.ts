import * as log from "./dependencies/logger.ts";
import {
  DatastoreItem,
  DatastoreQueryArgs,
  DatastoreSchema,
} from "./dependencies/deno_slack_api_typed_method_types.ts";
import { DatastoreError } from "./errors.ts";
import {
  Definition,
  DeleteResponse,
  FindFirstRawExpressionQueryArgs,
  GetResponse,
  IdQueryArgs,
  PutResponse,
  QueryResponse,
  RawExpressionQueryArgs,
  SaveArgs,
} from "./types.ts";

export const defaultLogger = log.getLogger();
const logName = "[deno_slack_data_mapper]";

export async function save<Def extends Definition>({
  client,
  datastore,
  primaryKey,
  attributes,
  logger,
}: SaveArgs<Def>): Promise<PutResponse<Def>> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(`${logName} Saving a recored: ${JSON.stringify(attributes)}`);
  const item: DatastoreItem<DatastoreSchema> = {
    ...attributes,
  };
  const pkName = primaryKey ?? "id";
  item[pkName] = attributes[pkName] ?? crypto.randomUUID();
  const result = await client.apps.datastore.put({ datastore, item });
  _logger.debug(`${logName} Saved result: ${JSON.stringify(result)}`);
  if (result.error) {
    const error = `Failed to save a row due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result as PutResponse<Def>;
}

export async function findById<Def extends Definition>({
  client,
  datastore,
  id,
  logger,
}: IdQueryArgs): Promise<GetResponse<Def>> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(`${logName} Finding a record for PK: ${id}`);
  const result = await client.apps.datastore.get({ datastore, id });
  _logger.debug(`${logName} Found: ${JSON.stringify(result)}`);
  if (result.error) {
    const error = `Failed to fetch a row due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result as GetResponse<Def>;
}

export async function findFirstBy<Def extends Definition>({
  client,
  datastore,
  expression,
  logger,
}: FindFirstRawExpressionQueryArgs): Promise<QueryResponse<Def>> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(
    `${logName} Finding records by an expression: ${
      JSON.stringify(expression)
    }`,
  );
  const results = await client.apps.datastore.query({
    datastore,
    expression: expression.expression,
    expression_attributes: expression.attributes,
    expression_values: expression.values,
    limit: 1000,
  });
  _logger.debug(`${logName} Found: ${JSON.stringify(results)}`);
  if (results.error) {
    const error = `Failed to fetch rows due to ${results.error}`;
    throw new DatastoreError(error, results);
  }
  if (results.items.length > 0) {
    results.items = results.items.slice(0, 1);
    return results as QueryResponse<Def>;
  }
  let nextCursor = results.response_metadata?.next_cursor;
  while (nextCursor !== undefined && nextCursor !== "") {
    const pageResults = await client.apps.datastore.query({
      datastore,
      expression: expression.expression,
      expression_attributes: expression.attributes,
      expression_values: expression.values,
      cursor: nextCursor,
      limit: 1000,
    });
    if (pageResults.items.length > 0) {
      results.items = pageResults.items.slice(0, 1);
      return results as QueryResponse<Def>;
    }
    nextCursor = pageResults.response_metadata?.next_cursor;
  }
  return results as QueryResponse<Def>;
}

export async function findAllBy<Def extends Definition>({
  client,
  datastore,
  expression,
  cursor,
  limit,
  logger,
  autoPagination,
}: RawExpressionQueryArgs): Promise<QueryResponse<Def>> {
  const _autoPagination = autoPagination === undefined || autoPagination;
  const _logger = logger ?? defaultLogger;
  const _limit = limit ?? 1000;
  if (expression.expression) {
    _logger.debug(
      `${logName} Finding records by an expression: ${
        JSON.stringify(expression)
      }`,
    );
  } else {
    _logger.debug(`${logName} Finding all records`);
  }
  let queryArgs: DatastoreQueryArgs<Def> = {
    datastore,
    cursor,
    limit: _autoPagination ? 1000 : _limit,
  };
  if (expression.expression && expression.expression !== "") {
    queryArgs = {
      datastore,
      expression: expression.expression,
      expression_attributes: expression.attributes,
      expression_values: expression.values,
      cursor,
      limit: _autoPagination ? 1000 : _limit,
    };
  }
  const results = await client.apps.datastore.query(queryArgs);
  _logger.debug(`${logName} Found: ${JSON.stringify(results)}`);
  if (results.error) {
    const error = `Failed to fetch rows due to ${results.error}`;
    throw new DatastoreError(error, results);
  }
  if (results.items.length > _limit) {
    results.items = results.items.slice(0, _limit);
  }
  if (_autoPagination) {
    let nextCursor = results.response_metadata?.next_cursor;
    while (nextCursor !== undefined && nextCursor !== "") {
      const pageResults = await client.apps.datastore.query({
        datastore,
        expression: expression.expression,
        expression_attributes: expression.attributes,
        expression_values: expression.values,
        cursor: nextCursor,
        limit: 1000,
      });
      for (const item of pageResults.items) {
        if (results.items.length >= _limit) {
          break;
        }
        results.items.push(item);
      }
      nextCursor = pageResults.response_metadata?.next_cursor;
    }
  }
  return results as QueryResponse<Def>;
}

export async function deleteById({
  client,
  datastore,
  id,
  logger,
}: IdQueryArgs): Promise<DeleteResponse> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(`${logName} Deleting a record for PK: ${id}`);
  const result = await client.apps.datastore.delete({ datastore, id });
  _logger.debug(`${logName} Deletion result: ${JSON.stringify(result)}`);
  if (result.error) {
    const error = `${logName} Failed to delete a row due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result;
}
