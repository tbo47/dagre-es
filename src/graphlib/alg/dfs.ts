export { dfs };

/*
 * A helper that preforms a pre- or post-order traversal on the input graph
 * and returns the nodes in the order they were visited. If the graph is
 * undirected then this algorithm will navigate using neighbors. If the graph
 * is directed then this algorithm will navigate using successors.
 *
 * Order must be one of "pre" or "post".
 */
function dfs(g, vs, order) {
  if (!Array.isArray(vs)) {
    vs = [vs];
  }

  var navigation = (g.isDirected() ? g.successors : g.neighbors).bind(g);
  var orderFunc = order === "post" ? postOrderDfs : preOrderDfs;

  var acc = [];
  var visited = {};
  vs.forEach(v => {
    if (!g.hasNode(v)) {
      throw new Error('Graph does not have node: ' + v);
    }

    orderFunc(v, navigation, visited, acc);
  });
  return acc;
}

function postOrderDfs(v, navigation, visited, acc) {
  var stack = [[v, false]];
  while (stack.length > 0) {
    var curr = stack.pop();
    if (curr[1]) {
      acc.push(curr[0]);
    } else {
      if (!visited.hasOwnProperty(curr[0])) {
        visited[curr[0]] = true;
        stack.push([curr[0], true]);
        forEachRight(navigation(curr[0]), w => stack.push([w, false]));
      }
    }
  }
}

function preOrderDfs(v, navigation, visited, acc) {
  var stack = [v];
  while (stack.length > 0) {
    var curr = stack.pop();
    if (!visited.hasOwnProperty(curr)) {
      visited[curr] = true;
      acc.push(curr);
      forEachRight(navigation(curr), w => stack.push(w));
    }
  }
}

function forEachRight(array, iteratee) {
  var length = array.length;
  while (length--) {
    iteratee(array[length], length, array);
  }

  return array;
}

