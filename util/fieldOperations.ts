import { NestedKeyOf } from "@/types";

export interface FieldOperations {
  value: any;
  setValue(value: any): any;
  insertListItem(value: any, index: number): any;
  removeListItem(index: number): any;
  filterListItems(
    filterFn: (value: any, index: number, array: any[]) => unknown,
  ): any;
}

/**
 * Parse a path string like "foo.bar[2].baz" into an array of tokens.
 */
const parsePath = (path: string): (string | number)[] => {
  const tokens: (string | number)[] = [];
  const regex = /[^.[\]]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(path)) !== null) {
    // Convert numeric tokens to numbers
    const token = isNaN(Number(match[0])) ? match[0] : Number(match[0]);
    tokens.push(token);
  }
  return tokens;
};

/**
 * Recursively update the value at the specified path using an update function.
 * The updateFn receives the current target value and returns the updated value.
 */
const updateAtPath = (
  obj: any,
  path: (string | number)[],
  updateFn: (target: any, key: string | number) => any,
): any => {
  if (path.length === 0) return updateFn(obj, "");

  const [head, ...tail] = path;
  // Base case: at the final token, apply the update
  if (tail.length === 0) {
    if (Array.isArray(obj)) {
      const index = head as number;
      return [
        ...obj.slice(0, index),
        updateFn(obj[index], index),
        ...obj.slice(index + 1),
      ];
    } else {
      return { ...obj, [head]: updateFn(obj?.[head], head) };
    }
  }

  // Recursive case: update a nested field
  if (Array.isArray(obj)) {
    const index = head as number;
    return [
      ...obj.slice(0, index),
      updateAtPath(obj[index], tail, updateFn),
      ...obj.slice(index + 1),
    ];
  }
  return {
    ...obj,
    [head]: updateAtPath(obj?.[head] ?? {}, tail, updateFn),
  };
};

/**
 * Returns an API for updating a nested field in an immutable way.
 * The field is located at the specified path, given as a string.
 */
export const getFieldOperations = <T>(
  path: NestedKeyOf<T>,
  obj: T,
): FieldOperations => {
  const tokens = parsePath(path);
  // Retrieve the current value at the path.
  const value = tokens.reduce(
    (acc, token) => (acc ? (acc as any)[token] : undefined),
    obj,
  );

  const setValue = (newValue: any): any => {
    return updateAtPath(obj, tokens, () => newValue);
  };

  const insertListItem = (newValue: any, index: number): any => {
    // Drill down to the array at the given path.
    const arr = tokens.reduce((acc, token) => (acc as any)?.[token], obj);
    if (!Array.isArray(arr)) {
      throw new TypeError(`Value at path "${path}" is not an array`);
    }
    if (index < 0 || index > arr.length) {
      throw new RangeError(
        `Index ${index} is out of bounds for array at path "${path}"`,
      );
    }
    const updatedArray = [
      ...arr.slice(0, index),
      newValue,
      ...arr.slice(index),
    ];
    return updateAtPath(obj, tokens, () => updatedArray);
  };

  const removeListItem = (index: number): any => {
    const arr = tokens.reduce((acc, token) => (acc as any)?.[token], obj);
    if (!Array.isArray(arr)) {
      throw new TypeError(`Value at path "${path}" is not an array`);
    }
    if (index < 0 || index >= arr.length) {
      throw new RangeError(
        `Index ${index} is out of bounds for array at path "${path}"`,
      );
    }
    const updatedArray = arr.filter((_: any, i: number) => i !== index);
    return updateAtPath(obj, tokens, () => updatedArray);
  };

  const filterListItems = (
    filterFn: (value: any, index: number, array: any[]) => unknown,
  ): any => {
    const arr = tokens.reduce((acc, token) => (acc as any)?.[token], obj);
    if (!Array.isArray(arr)) {
      throw new TypeError(`Value at path "${path}" is not an array`);
    }
    const updatedArray = arr.filter(filterFn);
    return updateAtPath(obj, tokens, () => updatedArray);
  };

  return { value, setValue, insertListItem, removeListItem, filterListItems };
};
