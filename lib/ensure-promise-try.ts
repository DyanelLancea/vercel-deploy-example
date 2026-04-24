/**
 * pdfjs-dist (used by unpdf) may call Promise.try. Node 22.x and earlier do not
 * implement it yet; without this, PDF routes throw unhandled rejections.
 */
type PromiseTry = (fn: () => unknown) => Promise<unknown>;

const promiseWithTry = Promise as typeof Promise & { try?: PromiseTry };

if (typeof promiseWithTry.try !== "function") {
  const tryImpl: PromiseTry = (fn) =>
    new Promise((resolve) => {
      resolve(fn());
    });
  Object.defineProperty(Promise, "try", {
    value: tryImpl,
    configurable: true,
    writable: true,
  });
}
