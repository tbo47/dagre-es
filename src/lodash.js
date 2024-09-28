// https://github.com/lodash/lodash/blob/main/src/has.ts
const hasOwnProperty = Object.prototype.hasOwnProperty;

/*
 * @param {Object} object The object to query.
 * @param {string} key The key to check.
 * @returns {boolean} Returns `true` if `key` exists, else `false`.
 */
export function _has(object, key) {
  return object != null && hasOwnProperty.call(object, key);
}
