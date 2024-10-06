/**
 * @import { Graph } from '../graph.js';
 */
import { dfs } from './dfs.js';

export { postorder };

/**
 * @param { Graph } g
 */
function postorder(g, vs) {
  return dfs(g, vs, 'post');
}
