import * as d3 from 'd3';
import * as _ from 'lodash-es';
import { intersectNode } from './intersect/intersect-node.js';
import * as util from './util.js';

export { createEdgePaths, setCreateEdgePaths };

var createEdgePaths = function (selection, g, arrows) {
  const previousPaths = selection
    .selectAll('g.edgePath')
    .data(g.edges(), function (e) {
      return util.edgeToId(e);
    })
    .classed('update', true);

  const newPaths = enter(previousPaths, g);
  exit(previousPaths, g);

  const svgPaths = previousPaths.merge !== undefined ? previousPaths.merge(newPaths) : previousPaths;
  util.applyTransition(svgPaths, g).style('opacity', 1);

  // Save DOM element in the path group, and set ID and class
  svgPaths.each(function (e) {
    const domEdge = d3.select(this);
    const edge = g.edge(e);
    edge.elem = this;

    if (edge.id) {
      domEdge.attr('id', edge.id);
    }

    util.applyClass(
      domEdge,
      edge['class'],
      (domEdge.classed('update') ? 'update ' : '') + 'edgePath'
    );
  });

  svgPaths.selectAll('path.path').each(function (e) {
    const edge = g.edge(e);
    edge.arrowheadId = _.uniqueId('arrowhead');

    const domEdge = d3
      .select(this)
      .attr('marker-end', function () {
        return 'url(' + makeFragmentRef(location.href, edge.arrowheadId) + ')';
      })
      .style('fill', 'none');

    util.applyTransition(domEdge, g).attr('d', function (e) {
      return calcPoints(g, e);
    });

    util.applyStyle(domEdge, edge.style);
  });

  svgPaths.selectAll('defs *').remove();
  svgPaths.selectAll('defs').each(function (e) {
    const edge = g.edge(e);
    const arrowhead = arrows[edge.arrowhead];
    arrowhead(d3.select(this), edge.arrowheadId, edge, 'arrowhead');
  });

  return svgPaths;
};

function setCreateEdgePaths(value) {
  createEdgePaths = value;
}

function makeFragmentRef(url, fragmentId) {
  const baseUrl = url.split('#')[0];
  return baseUrl + '#' + fragmentId;
}

function calcPoints(g, e) {
  const edge = g.edge(e);
  const tail = g.node(e.v);
  const head = g.node(e.w);
  const points = edge.points.slice(1, edge.points.length - 1);
  points.unshift(intersectNode(tail, points[0]));
  points.push(intersectNode(head, points[points.length - 1]));

  return createLine(edge, points);
}

function createLine(edge, points) {
  // @ts-expect-error
  const line = (d3.line || d3.svg.line)()
    .x(function (d) {
      return d.x;
    })
    .y(function (d) {
      return d.y;
    });

  (line.curve || line.interpolate)(edge.curve);

  return line(points);
}

function getCoords(elem) {
  const bbox = elem.getBBox();
  const matrix = elem.ownerSVGElement
    .getScreenCTM()
    .inverse()
    .multiply(elem.getScreenCTM())
    .translate(bbox.width / 2, bbox.height / 2);
  return { x: matrix.e, y: matrix.f };
}

function enter(svgPaths, g) {
  const svgPathsEnter = svgPaths.enter().append('g').attr('class', 'edgePath').style('opacity', 0);
  svgPathsEnter
    .append('path')
    .attr('class', 'path')
    .attr('d', function (e) {
      const edge = g.edge(e);
      const sourceElem = g.node(e.v).elem;
      const points = _.range(edge.points.length).map(function () {
        return getCoords(sourceElem);
      });
      return createLine(edge, points);
    });
  svgPathsEnter.append('defs');
  return svgPathsEnter;
}

function exit(svgPaths, g) {
  const svgPathExit = svgPaths.exit();
  util.applyTransition(svgPathExit, g).style('opacity', 0).remove();
}
