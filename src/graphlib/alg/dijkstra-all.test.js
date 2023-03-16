import chai from '../../../test/chai.js';
const expect = chai.expect;
import { Graph } from '../graph.js';
import { dijkstraAll } from './dijkstra-all.js';
import { allShortestPathsTests } from '../../../test/graphlib/alg/all-shortest-paths.js';

describe('alg.dijkstraAll', function () {
  allShortestPathsTests(dijkstraAll);

  it('throws an Error if it encounters a negative edge weight', function () {
    var g = new Graph();
    g.setEdge('a', 'b', 1);
    g.setEdge('a', 'c', -2);
    g.setEdge('b', 'd', 3);
    g.setEdge('c', 'd', 3);

    expect(function () {
      dijkstraAll(g, weight(g));
    }).to.throw();
  });
});

function weight(g) {
  return function (e) {
    return g.edge(e);
  };
}
