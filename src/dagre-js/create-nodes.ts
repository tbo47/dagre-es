import * as d3 from 'd3';
import * as _ from 'lodash-es';
import { addLabel } from './label/add-label.js';
import * as util from './util.js';

export { createNodes, setCreateNodes };

let createNodes = function (selection, g, shapes) {
  const simpleNodes = g.nodes().filter(function (v) {
    return !util.isSubgraph(g, v);
  });
  let svgNodes = selection
    .selectAll('g.node')
    .data(simpleNodes, function (v) {
      return v;
    })
    .classed('update', true);

  svgNodes.exit().remove();

  svgNodes.enter().append('g').attr('class', 'node').style('opacity', 0);

  svgNodes = selection.selectAll('g.node');

  svgNodes.each(function (v) {
    const node = g.node(v);
    const thisGroup = d3.select(this);
    util.applyClass(
      thisGroup,
      node['class'],
      (thisGroup.classed('update') ? 'update ' : '') + 'node',
    );

    thisGroup.select('g.label').remove();
    const labelGroup = thisGroup.append('g').attr('class', 'label');
    const labelDom = addLabel(labelGroup, node);
    const shape = shapes[node.shape];
    const bbox = _.pick(labelDom.node().getBBox(), 'width', 'height');

    node.elem = this;

    if (node.id) {
      thisGroup.attr('id', node.id);
    }
    if (node.labelId) {
      labelGroup.attr('id', node.labelId);
    }

    if (_.has(node, 'width')) {
      bbox.width = node.width;
    }
    if (_.has(node, 'height')) {
      bbox.height = node.height;
    }

    bbox.width += node.paddingLeft + node.paddingRight;
    bbox.height += node.paddingTop + node.paddingBottom;
    labelGroup.attr(
      'transform',
      'translate(' +
        (node.paddingLeft - node.paddingRight) / 2 +
        ',' +
        (node.paddingTop - node.paddingBottom) / 2 +
        ')',
    );

    const root = d3.select(this);
    root.select('.label-container').remove();
    const shapeSvg = shape(root, bbox, node).classed('label-container', true);
    util.applyStyle(shapeSvg, node.style);

    const shapeBBox = shapeSvg.node().getBBox();
    node.width = shapeBBox.width;
    node.height = shapeBBox.height;
  });

  let exitSelection;

  if (svgNodes.exit) {
    exitSelection = svgNodes.exit();
  } else {
    exitSelection = svgNodes.selectAll(null); // empty selection
  }

  util.applyTransition(exitSelection, g).style('opacity', 0).remove();

  return svgNodes;
};

function setCreateNodes(value) {
  createNodes = value;
}
