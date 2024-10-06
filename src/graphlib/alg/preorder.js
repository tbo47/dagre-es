/**
 * @import { Graph } from '../graph.js';
 */
import { dfs } from './dfs.js';

/**
 * @param { Graph } g
 */
export function preorder(g, vs) {
  return dfs(g, vs, 'pre');
}
