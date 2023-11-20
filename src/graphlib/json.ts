import { Graph } from './graph.js';

export { write, read };

function write(g) {
  const json = {
    options: {
      directed: g.isDirected(),
      multigraph: g.isMultigraph(),
      compound: g.isCompound(),
    },
    nodes: writeNodes(g),
    edges: writeEdges(g),
    value: undefined,
  };
  if (g.graph() !== undefined) {
    json.value = structuredClone(g.graph());
  }
  return json;
}

function writeNodes(g) {
  return g.nodes().map(v => {
    const nodeValue = g.node(v);
    const parent = g.parent(v);
    const node = { v } as { v: string; name?: string; value?: any; parent?: string };
    if (nodeValue !== undefined) {
      node.value = nodeValue;
    }
    if (parent !== undefined) {
      node.parent = parent;
    }
    return node;
  });
}

function writeEdges(g) {
  return g.edges().map(e => {
    var edgeValue = g.edge(e);
    var edge = { v: e.v, w: e.w } as { v: string; w: string; name?: string; value?: any }
    if (e.name !== undefined) {
      edge.name = e.name;
    }
    if (edgeValue !== undefined) {
      edge.value = edgeValue;
    }
    return edge;
  });
}

function read(json) {
  var g = new Graph(json.options).setGraph(json.value);
  json.nodes.forEach(entry => {
    g.setNode(entry.v, entry.value);
    if (entry.parent) {
      g.setParent(entry.v, entry.parent);
    }
  });
  json.edges.forEach(entry => {
    g.setEdge({ v: entry.v, w: entry.w, name: entry.name }, entry.value);
  });
  return g;
}
