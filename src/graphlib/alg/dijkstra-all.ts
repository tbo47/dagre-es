import { dijkstra } from './dijkstra.js';

export { dijkstraAll };

function dijkstraAll(g, weightFunc, edgeFunc?) {
  return g.nodes().reduce((acc, v) => {
    acc[v] = dijkstra(g, v, weightFunc, edgeFunc);
    return acc;
  }, {});
}
