import * as d3 from 'd3';
import * as _ from 'lodash-es';
import { addLabel } from './label/add-label.js';
import * as util from './util.js';

export { createEdgeLabels, setCreateEdgeLabels };

let createEdgeLabels = function (selection, g) {
  let svgEdgeLabels = selection
    .selectAll('g.edgeLabel')
    .data(g.edges(), function (e) {
      return util.edgeToId(e);
    })
    .classed('update', true);

  svgEdgeLabels.exit().remove();
  svgEdgeLabels.enter().append('g').classed('edgeLabel', true).style('opacity', 0);

  svgEdgeLabels = selection.selectAll('g.edgeLabel');

  svgEdgeLabels.each(function (e) {
    const root = d3.select(this);
    root.select('.label').remove();
    const edge = g.edge(e);
    const label = addLabel(root, g.edge(e), 0).classed('label', true);
    const bbox = label.node().getBBox();

    if (edge.labelId) {
      label.attr('id', edge.labelId);
    }
    if (!_.has(edge, 'width')) {
      edge.width = bbox.width;
    }
    if (!_.has(edge, 'height')) {
      edge.height = bbox.height;
    }
  });

  let exitSelection;

  if (svgEdgeLabels.exit) {
    exitSelection = svgEdgeLabels.exit();
  } else {
    exitSelection = svgEdgeLabels.selectAll(null); // empty selection
  }

  util.applyTransition(exitSelection, g).style('opacity', 0).remove();

  return svgEdgeLabels;
};

function setCreateEdgeLabels(value) {
  createEdgeLabels = value;
}
