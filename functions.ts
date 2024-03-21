import * as log from "./dependencies/logger.ts";
import {
  DatastoreItem,
  DatastoreQueryArgs,
  DatastoreSchema,
} from "./dependencies/deno_slack_api_typed_method_types.ts";
import { DatastoreError } from "./errors.ts";
import {
  BulkDeleteResponse,
  BulkGetResponse,
  CountResponse,
  Definition,
  DeleteResponse,
  FindFirstRawExpressionQueryArgs,
  GetResponse,
  IdQueryArgs,
  IdsQueryArgs,
  PutResponse,
  QueryResponse,
  RawExpressionQueryArgs,
  SaveArgs,
} from "./types.ts";
import { RawExpressionCountArgs } from "./types.ts";
import { DatastoreCountArgs } from "./dependencies/deno_slack_api_typed_method_types.ts";

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
  if (_logger.level === log.LogLevels.DEBUG) {
    const data = JSON.stringify(attributes);
    _logger.debug(
      `${logName} Saving a record: (datastore: ${datastore}, attributes: ${data})`,
    );
  }
  const item: DatastoreItem<DatastoreSchema> = {
    ...attributes,
  };
  const pkName = primaryKey ?? "id";
  item[pkName] = attributes[pkName] ?? crypto.randomUUID();
  const result = await client.apps.datastore.put({ datastore, item });
  if (_logger.level === log.LogLevels.DEBUG) {
    const response = JSON.stringify(result);
    _logger.debug(
      `${logName} Saved result: (datastore: ${datastore}, response: ${response})`,
    );
  }
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
  if (_logger.level === log.LogLevels.DEBUG) {
    _logger.debug(
      `${logName} Finding a record (datastore: ${datastore}, PK: ${id})`,
    );
  }
  const result = await client.apps.datastore.get({ datastore, id });
  if (_logger.level === log.LogLevels.DEBUG) {
    const response = JSON.stringify(result);
    _logger.debug(
      `${logName} Found: (datastore: ${datastore}, response: ${response})`,
    );
  }
  if (result.error) {
    const error =
      `Failed to fetch a row (datastore: ${datastore}, error ${result.error})`;
    throw new DatastoreError(error, result);
  }
  return result as GetResponse<Def>;
}

export async function findAllByIds<Def extends Definition>({
  client,
  datastore,
  ids,
  logger,
}: IdsQueryArgs): Promise<BulkGetResponse<Def>> {
  const _logger = logger ?? defaultLogger;
  if (_logger.level === log.LogLevels.DEBUG) {
    _logger.debug(
      `${logName} Finding records (datastore: ${datastore}, IDs: ${ids})`,
    );
  }
  const result = await client.apps.datastore.bulkGet({ datastore, ids });
  if (_logger.level === log.LogLevels.DEBUG) {
    const response = JSON.stringify(result);
    _logger.debug(
      `${logName} Found: (datastore: ${datastore}, response: ${response})`,
    );
  }
  if (result.error) {
    const error =
      `Failed to fetch rows (datastore: ${datastore}, error ${result.error})`;
    throw new DatastoreError(error, result);
  }
  return result as BulkGetResponse<Def>;
}

export async function findFirstBy<Def extends Definition>({
  client,
  datastore,
  expression,
  logger,
}: FindFirstRawExpressionQueryArgs): Promise<QueryResponse<Def>> {
  const _logger = logger ?? defaultLogger;
  if (_logger.level === log.LogLevels.DEBUG) {
    const data = JSON.stringify(expression);
    _logger.debug(
      `${logName} Finding records: (datastore: ${datastore}, expression: ${data})`,
    );
  }
  const results = await client.apps.datastore.query({
    datastore,
    expression: expression.expression,
    expression_attributes: expression.attributes,
    expression_values: expression.values,
    limit: 1000,
  });
  if (_logger.level === log.LogLevels.DEBUG) {
    const response = JSON.stringify(results);
    _logger.debug(
      `${logName} Found: (datastore: ${datastore}, response: ${response})`,
    );
  }
  if (results.error) {
    const error =
      `Failed to fetch rows: (datastore: ${datastore}, error: ${results.error})`;
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
  if (_logger.level === log.LogLevels.DEBUG) {
    if (expression.expression) {
      const data = JSON.stringify(expression);
      _logger.debug(
        `${logName} Finding records: (datastore: ${datastore}, expression: ${data})`,
      );
    } else {
      _logger.debug(`${logName} Finding all records (datastore: ${datastore})`);
    }
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
  if (_logger.level === log.LogLevels.DEBUG) {
    const response = JSON.stringify(results);
    _logger.debug(
      `${logName} Found: (datastore: ${datastore}, response: ${response})`,
    );
  }
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

export async function countBy<Def extends Definition>({
  client,
  datastore,
  expression,
  logger,
}: RawExpressionCountArgs): Promise<CountResponse> {
  const _logger = logger ?? defaultLogger;
  if (_logger.level === log.LogLevels.DEBUG) {
    if (expression.expression) {
      const data = JSON.stringify(expression);
      _logger.debug(
        `${logName} Counting records: (datastore: ${datastore}, expression: ${data})`,
      );
    } else {
      _logger.debug(
        `${logName} Counting all records (datastore: ${datastore})`,
      );
    }
  }
  let queryArgs: DatastoreCountArgs<Def> = {
    datastore,
  };
  if (expression.expression && expression.expression !== "") {
    queryArgs = {
      datastore,
      expression: expression.expression,
      expression_attributes: expression.attributes,
      expression_values: expression.values,
    };
  }
  const result = await client.apps.datastore.count(queryArgs);
  if (_logger.level === log.LogLevels.DEBUG) {
    const response = JSON.stringify(result);
    _logger.debug(
      `${logName} Found: (datastore: ${datastore}, response: ${response})`,
    );
  }
  if (result.error) {
    const error = `Failed to count rows due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result;
}

export async function deleteById({
  client,
  datastore,
  id,
  logger,
}: IdQueryArgs): Promise<DeleteResponse> {
  const _logger = logger ?? defaultLogger;
  if (_logger.level === log.LogLevels.DEBUG) {
    _logger.debug(
      `${logName} Deleting a record (datastore: ${datastore}, PK: ${id})`,
    );
  }
  const result = await client.apps.datastore.delete({ datastore, id });
  if (_logger.level === log.LogLevels.DEBUG) {
    const jsonData = JSON.stringify(result);
    _logger.debug(
      `${logName} Deletion result: (datastore: ${datastore}, response: ${jsonData})`,
    );
  }
  if (result.error) {
    const error =
      `${logName} Failed to delete a row: (datastore: ${datastore}, error: ${result.error})`;
    throw new DatastoreError(error, result);
  }
  return result;
}

export async function deleteAllByIds({
  client,
  datastore,
  ids,
  logger,
}: IdsQueryArgs): Promise<BulkDeleteResponse> {
  const _logger = logger ?? defaultLogger;
  if (_logger.level === log.LogLevels.DEBUG) {
    _logger.debug(
      `${logName} Deleting records (datastore: ${datastore}, IDs: ${ids})`,
    );
  }
  const result = await client.apps.datastore.bulkDelete({ datastore, ids });
  if (_logger.level === log.LogLevels.DEBUG) {
    const jsonData = JSON.stringify(result);
    _logger.debug(
      `${logName} Deletion result: (datastore: ${datastore}, response: ${jsonData})`,
    );
  }
  if (result.error) {
    const error =
      `${logName} Failed to delete rows: (datastore: ${datastore}, error: ${result.error})`;
    throw new DatastoreError(error, result);
  }
  return result;
}
