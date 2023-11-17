import * as d3 from 'd3';
import { addLabel } from './label/add-label.js';
import * as util from './util.js';

export { createClusters, setCreateClusters };

var createClusters = function (selection, g) {
  const clusters = g.nodes().filter(function (v) {
    return util.isSubgraph(g, v);
  });
  let svgClusters = selection.selectAll('g.cluster').data(clusters, function (v) {
    return v;
  });

  util.applyTransition(svgClusters.exit(), g).style('opacity', 0).remove();

  const enterSelection = svgClusters
    .enter()
    .append('g')
    .attr('class', 'cluster')
    .attr('id', function (v) {
      const node = g.node(v);
      return node.id;
    })
    .style('opacity', 0)
    .each(function (v) {
      const node = g.node(v);
      const thisGroup = d3.select(this);
      d3.select(this).append('rect');
      const labelGroup = thisGroup.append('g').attr('class', 'label');
      addLabel(labelGroup, node, node.clusterLabelPos);
    });

  svgClusters = svgClusters.merge(enterSelection);

  svgClusters = util.applyTransition(svgClusters, g).style('opacity', 1);

  svgClusters.selectAll('rect').each(function (c) {
    const node = g.node(c);
    const domCluster = d3.select(this);
    util.applyStyle(domCluster, node.style);
  });

  return svgClusters;
};

function setCreateClusters(value) {
  createClusters = value;
}
