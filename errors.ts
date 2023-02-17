import { BaseResponse } from "./dependencies/deno_slack_api_types.ts";

export class DatastoreError extends Error {
  response?: BaseResponse;

  constructor(message: string, response?: BaseResponse, cause?: Error) {
    super(message, { cause });
    this.response = response;
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
  }
}

export class InvalidExpressionError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
  }
}
