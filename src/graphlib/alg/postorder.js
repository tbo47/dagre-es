import { dfs } from './dfs';

export { postorder };

function postorder(g, vs) {
  return dfs(g, vs, 'post');
}
