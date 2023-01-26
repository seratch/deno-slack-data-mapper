import { BaseResponse } from "https://deno.land/x/deno_slack_api@1.5.0/types.ts";

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
