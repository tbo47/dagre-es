import * as _ from 'lodash-es';
import chai from '../../../test/chai.js';
const expect = chai.expect;
import { rank } from './index.js';
import { Graph } from '../../graphlib/graph.js';

describe('rank', function () {
  const RANKERS = ['longest-path', 'tight-tree', 'network-simplex', 'unknown-should-still-work'];
  let g;

  beforeEach(function () {
    g = new Graph()
      .setGraph({})
      .setDefaultNodeLabel(function () {
        return {};
      })
      .setDefaultEdgeLabel(function () {
        return { minlen: 1, weight: 1 };
      })
      .setPath(['a', 'b', 'c', 'd', 'h'])
      .setPath(['a', 'e', 'g', 'h'])
      .setPath(['a', 'f', 'g']);
  });

  _.forEach(RANKERS, function (ranker) {
    describe(ranker, function () {
      it('respects the minlen attribute', function () {
        g.graph().ranker = ranker;
        rank(g);
        _.forEach(g.edges(), function (e) {
          const vRank = g.node(e.v).rank;
          const wRank = g.node(e.w).rank;
          expect(wRank - vRank).to.be.gte(g.edge(e).minlen);
        });
      });

      it('can rank a single node graph', function () {
        const g = new Graph().setGraph({}).setNode('a', {});
        g.graph().ranker = ranker;
        rank(g);
        expect(g.node('a').rank).to.equal(0);
      });
    });
  });
});
