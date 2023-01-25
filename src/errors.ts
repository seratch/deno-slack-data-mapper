import { BaseResponse } from "deno_slack_api/types.ts";

export class DatastoreError extends Error {
  response?: BaseResponse;

  constructor(message: string, response?: BaseResponse, cause?: Error) {
    super(message, { cause });
    this.response = response;
  }
}
