// A helper to decrement our recursion depth.
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

// Utility type that produces valid nested key paths while handling arrays with "[number]" syntax.
// It recursively builds paths up to D levels deep.
export type NestedKeyOf<T, D extends number = 5> = [D] extends [0]
  ? never
  : T extends (infer U)[]
    ? // When T is an array, valid keys can be an index access or an index access followed by a nested path.
      `[${number}]` | `[${number}].${NestedKeyOf<U, Prev[D]>}`
    : T extends object
      ? {
          [K in Extract<keyof T, string>]: T[K] extends (infer U)[]
            ? // For array properties, allow:
              // - The property name ("fingers")
              // - The property name with an index ("fingers[0]")
              // - The property name with an index and nested keys ("fingers[0].someProp")
              | `${K}`
                | `${K}[${number}]`
                | `${K}[${number}].${NestedKeyOf<U, Prev[D]>}`
            : T[K] extends object
              ? // For nested objects, allow the property name alone or with a nested path.
                `${K}` | `${K}.${NestedKeyOf<T[K], Prev[D]>}`
              : `${K}`;
        }[Extract<keyof T, string>]
      : "";
