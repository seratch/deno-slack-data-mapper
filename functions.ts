import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import {
  DatastoreItem,
  DatastoreSchema,
} from "https://deno.land/x/deno_slack_api@1.5.0/typed-method-types/apps.ts";
import { DatastoreError } from "./errors.ts";
import {
  Definition,
  DeleteResponse,
  GetResponse,
  IdQueryArgs,
  PutResponse,
  QueryResponse,
  RawExpressionQueryArgs,
  SaveArgs,
} from "./types.ts";

export const defaultLogger = log.getLogger();

export async function save<Def extends Definition>({
  client,
  datastore,
  primaryKey,
  attributes,
  logger,
}: SaveArgs<Def>): Promise<PutResponse<Def>> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(`Saving a recored: ${JSON.stringify(attributes)}`);
  const item: DatastoreItem<DatastoreSchema> = {
    ...attributes,
  };
  const pkName = primaryKey ?? "id";
  item[pkName] = attributes[pkName] ?? crypto.randomUUID();
  const result = await client.apps.datastore.put({ datastore, item });
  _logger.debug(`Save result: ${JSON.stringify(result)}`);
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
  _logger.debug(`Finding a record for id: ${id}`);
  const result = await client.apps.datastore.get({ datastore, id });
  _logger.debug(`Found: ${JSON.stringify(result)}`);
  if (result.error) {
    const error = `Failed to fetch a row due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result as GetResponse<Def>;
}

export async function findAllBy<Def extends Definition>({
  client,
  datastore,
  expression,
  logger,
}: RawExpressionQueryArgs): Promise<QueryResponse<Def>> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(
    `Finding records by an expression: ${JSON.stringify(expression)}`,
  );
  const results = await client.apps.datastore.query({
    datastore,
    expression: expression.expression,
    expression_attributes: expression.attributes,
    expression_values: expression.values,
  });
  _logger.debug(`Found: ${JSON.stringify(results)}`);
  if (results.error) {
    const error = `Failed to fetch rows due to ${results.error}`;
    throw new DatastoreError(error, results);
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
  _logger.debug(`Deleting a record for id: ${id}`);
  const result = await client.apps.datastore.delete({ datastore, id });
  _logger.debug(`Deletion result: ${JSON.stringify(result)}`);
  if (result.error) {
    const error = `Failed to delete a row due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result;
}
