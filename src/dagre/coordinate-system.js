/**
 * @import { Graph } from '../graphlib/graph.js';
 */
import * as _ from 'lodash-es';

/**
 * @param { Graph } g
 */
export function adjust(g) {
  var rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === 'lr' || rankDir === 'rl') {
    swapWidthHeight(g);
  }
}

/**
 * @param { Graph } g
 */
export function undo(g) {
  var rankDir = g.graph().rankdir.toLowerCase();
  if (rankDir === 'bt' || rankDir === 'rl') {
    reverseY(g);
  }

  if (rankDir === 'lr' || rankDir === 'rl') {
    swapXY(g);
    swapWidthHeight(g);
  }
}

/**
 * @param { Graph } g
 */
function swapWidthHeight(g) {
  _.forEach(g.nodes(), function (v) {
    swapWidthHeightOne(g.node(v));
  });
  _.forEach(g.edges(), function (e) {
    swapWidthHeightOne(g.edge(e));
  });
}

function swapWidthHeightOne(attrs) {
  var w = attrs.width;
  attrs.width = attrs.height;
  attrs.height = w;
}

/**
 * @param { Graph } g
 */
function reverseY(g) {
  _.forEach(g.nodes(), function (v) {
    reverseYOne(g.node(v));
  });

  _.forEach(g.edges(), function (e) {
    var edge = g.edge(e);
    _.forEach(edge.points, reverseYOne);
    if (Object.prototype.hasOwnProperty.call(edge, 'y')) {
      reverseYOne(edge);
    }
  });
}

function reverseYOne(attrs) {
  attrs.y = -attrs.y;
}

/**
 * @param { Graph } g
 */
function swapXY(g) {
  _.forEach(g.nodes(), function (v) {
    swapXYOne(g.node(v));
  });

  _.forEach(g.edges(), function (e) {
    var edge = g.edge(e);
    _.forEach(edge.points, swapXYOne);
    if (Object.prototype.hasOwnProperty.call(edge, 'x')) {
      swapXYOne(edge);
    }
  });
}

function swapXYOne(attrs) {
  var x = attrs.x;
  attrs.x = attrs.y;
  attrs.y = x;
}
