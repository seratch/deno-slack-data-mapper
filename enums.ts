export enum Operator {
  Equal,
  LessThan, // accepts number
  LessThanEqual, // accepts number
  GreaterThan, // accepts number
  GreaterThanEqual, // accepts number
  Between, // [number, number]
  BeginsWith, // accepts string
  Contains, // accepts string
}
