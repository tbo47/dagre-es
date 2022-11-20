import * as _ from 'lodash-es';
import { dijkstra } from "./dijkstra";

export { dijkstraAll };

function dijkstraAll(g, weightFunc, edgeFunc) {
  return _.transform(g.nodes(), function (acc, v) {
    acc[v] = dijkstra(g, v, weightFunc, edgeFunc);
  }, {});
}
