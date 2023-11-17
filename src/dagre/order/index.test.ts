import * as _ from 'lodash-es';
import chai from '../../../test/chai.js';
const expect = chai.expect;
import { Graph } from '../../graphlib/graph.js';
import { order } from './index.js';
import { crossCount } from './cross-count.js';
import { buildLayerMatrix } from '../util.js';

describe('order', function () {
  let g;

  beforeEach(function () {
    g = new Graph().setDefaultEdgeLabel({ weight: 1 });
  });

  it('does not add crossings to a tree structure', function () {
    g.setNode('a', { rank: 1 });
    _.forEach(['b', 'e'], function (v) {
      g.setNode(v, { rank: 2 });
    });
    _.forEach(['c', 'd', 'f'], function (v) {
      g.setNode(v, { rank: 3 });
    });
    g.setPath(['a', 'b', 'c']);
    g.setEdge('b', 'd');
    g.setPath(['a', 'e', 'f']);
    order(g);
    const layering = buildLayerMatrix(g);
    expect(crossCount(g, layering)).to.equal(0);
  });

  it('can solve a simple graph', function () {
    // This graph resulted in a single crossing for previous versions of dagre.
    _.forEach(['a', 'd'], function (v) {
      g.setNode(v, { rank: 1 });
    });
    _.forEach(['b', 'f', 'e'], function (v) {
      g.setNode(v, { rank: 2 });
    });
    _.forEach(['c', 'g'], function (v) {
      g.setNode(v, { rank: 3 });
    });
    order(g);
    const layering = buildLayerMatrix(g);
    expect(crossCount(g, layering)).to.equal(0);
  });

  it('can minimize crossings', function () {
    g.setNode('a', { rank: 1 });
    _.forEach(['b', 'e', 'g'], function (v) {
      g.setNode(v, { rank: 2 });
    });
    _.forEach(['c', 'f', 'h'], function (v) {
      g.setNode(v, { rank: 3 });
    });
    g.setNode('d', { rank: 4 });
    order(g);
    const layering = buildLayerMatrix(g);
    expect(crossCount(g, layering)).to.be.lte(1);
  });
});
