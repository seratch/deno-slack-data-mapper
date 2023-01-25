import {
  DatastoreGetResponse,
  DatastorePutResponse,
  DatastoreQueryResponse,
  DatastoreSchema,
} from "https://deno.land/x/deno_slack_api@1.5.0/typed-method-types/apps.ts";
import * as log from "https://deno.land/std@0.173.0/log/mod.ts";
import { DatastoreError } from "./errors.ts";
import { ExpressionQueryArgs, IdQueryArgs, SaveArgs } from "./types.ts";

export const defaultLogger = log.getLogger();

/**
 * Creates or updates a row in the datastore.
 * @param See SaveArgs docs
 * @returns response from the API endpoint
 */
export async function save<Props>({
  client,
  datastore,
  props,
  logger,
}: SaveArgs<Props>): Promise<
  DatastorePutResponse<{ [k in keyof Props]: string } & DatastoreSchema>
> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(`Saving a recored: ${JSON.stringify(props)}`);
  const item = {
    ...props,
    id: props.id ?? crypto.randomUUID(),
  };
  const result = await client.apps.datastore.put({ datastore, item });
  _logger.debug(`Save result: ${JSON.stringify(result)}`);
  if (result.error) {
    const error = `Failed to save a row due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result as DatastorePutResponse<
    { [k in keyof Props]: string } & DatastoreSchema
  >;
}

export async function findById<Props>({
  client,
  datastore,
  id,
  logger,
}: IdQueryArgs): Promise<DatastoreGetResponse<Props & DatastoreSchema>> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(`Finding a record for id: ${id}`);
  const result = await client.apps.datastore.get({ datastore, id });
  _logger.debug(`Found: ${JSON.stringify(result)}`);
  if (result.error) {
    const error = `Failed to fetch a row due to ${result.error}`;
    throw new DatastoreError(error, result);
  }
  return result as DatastoreGetResponse<Props & DatastoreSchema>;
}

export async function findAllBy<Props>({
  client,
  datastore,
  expression,
  logger,
}: ExpressionQueryArgs): Promise<
  DatastoreQueryResponse<DatastoreSchema> & {
    items: { [k in keyof Props]: string }[];
  }
> {
  const _logger = logger ?? defaultLogger;
  _logger.debug(`Finding records by an expression: ${expression}`);
  const results = await client.apps.datastore.query({
    datastore,
    expression: expression.expression,
    expression_attributes: expression.expressionAttributes,
    expression_values: expression.expressionValues,
  });
  _logger.debug(`Found: ${JSON.stringify(results)}`);
  if (results.error) {
    const error = `Failed to fetch rows due to ${results.error}`;
    throw new DatastoreError(error, results);
  }
  return results as DatastoreQueryResponse<DatastoreSchema> & {
    items: { [k in keyof Props]: string }[];
  };
}

export async function deleteById({
  client,
  datastore,
  id,
  logger,
}: IdQueryArgs) {
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
