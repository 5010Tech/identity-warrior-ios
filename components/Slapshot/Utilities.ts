export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export function isValidFunction<T extends Function>(foo?: T): foo is T {
  return !!foo && typeof foo === "function";
}
