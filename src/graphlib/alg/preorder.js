import { dfs } from './dfs';

export { preorder };

function preorder(g, vs) {
  return dfs(g, vs, "pre");
}
