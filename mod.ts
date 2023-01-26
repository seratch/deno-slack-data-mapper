export {
  defaultLogger,
  deleteById,
  findAllBy,
  findById,
  save,
} from "./functions.ts";

export {
  buildExpression,
  compileExpression,
  DataMapper,
} from "./data_mapper.ts";

export { Operator } from "./enums.ts";

export {
  ConfigurationError,
  DatastoreError,
  InvalidExpressionError,
} from "./errors.ts";

export type {
  AndConditions,
  CommonSaveProps,
  Condition,
  Conditions,
  DataMapperExpressionQueryArgs,
  DataMapperIdQueryArgs,
  DataMapperInitArgs,
  DataMapperSaveArgs,
  Expression,
  ExpressionQueryArgs,
  IdQueryArgs,
  OrConditions,
  ParsedExpression,
  RawExpression,
  SaveArgs,
  SimpleExpression,
} from "./types.ts";
