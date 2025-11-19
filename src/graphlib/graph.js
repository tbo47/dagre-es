import * as _ from 'lodash-es';

var DEFAULT_EDGE_NAME = '\x00';
var GRAPH_NODE = '\x00';
var EDGE_KEY_DELIM = '\x01';

/**
 * @typedef {string} NodeID ID of a node.
 */

/**
 * @typedef {`${string}${typeof EDGE_KEY_DELIM}${string}${typeof EDGE_KEY_DELIM}${string}`} EdgeID ID of an edge.
 */

/**
 * @typedef {object} EdgeObj
 * @property {NodeID} v Source node ID.
 * @property {NodeID} w Target node ID.
 * @property {string | number} [name] Name of the edge. Needed to uniquely identify
 * multiple edges between the same pair of nodes in a multigraph.
 */

/**
 * @template {unknown} T
 * @typedef {T[] | Record<any, T>} Collection
 * Lodash object that can be iterated over with `_.each`.
 *
 * Beware, objects with `.length` are treated as arrays, see
 * https://lodash.com/docs/4.17.15#forEach
 */

// Implementation notes:
//
//  * Node id query functions should return string ids for the nodes
//  * Edge id query functions should return an "edgeObj", edge object, that is
//    composed of enough information to uniquely identify an edge: {v, w, name}.
//  * Internally we use an "edgeId", a stringified form of the edgeObj, to
//    reference edges. This is because we need a performant way to look these
//    edges up and, object properties, which have string keys, are the closest
//    we're going to get to a performant hashtable in JavaScript.

// Implementation notes:
//
//  * Node id query functions should return string ids for the nodes
//  * Edge id query functions should return an "edgeObj", edge object, that is
//    composed of enough information to uniquely identify an edge: {v, w, name}.
//  * Internally we use an "edgeId", a stringified form of the edgeObj, to
//    reference edges. This is because we need a performant way to look these
//    edges up and, object properties, which have string keys, are the closest
//    we're going to get to a performant hashtable in JavaScript.

/**
 * @template [GraphLabel=any] - Label of the graph.
 * @template [NodeLabel=any] - Label of a node.
 * Even though this is a "label", this could be any type that the user requires
 * (and may need to be an object for some layout/ranking algorithms in dagre).
 * @template [EdgeLabel=any] - Label of an edge.
 * Even though this is a "label", this could be any type that the user requires,
 * (and may need to be a object for ranking in dagre).
 */
export class Graph {
  /**
   * @param {object} [opts] - Graph options.
   * @param {boolean | undefined} [opts.directed] - If `false`, creates an undirected graph.
   * @param {boolean | undefined} [opts.multigraph] - If `true`, allows multiple, named-edges between nodes.
   * @param {boolean | undefined} [opts.compound] - If `true`, allows nodes to be parents of other nodes.
   */
  constructor(opts = {}) {
    /**
     * @type {boolean}
     * @private
     */
    this._isDirected = Object.prototype.hasOwnProperty.call(opts, 'directed')
      ? opts.directed
      : true;
    /**
     * @type {boolean}
     * @private
     */
    this._isMultigraph = Object.prototype.hasOwnProperty.call(opts, 'multigraph')
      ? opts.multigraph
      : false;
    /**
     * @type {boolean}
     * @private
     */
    this._isCompound = Object.prototype.hasOwnProperty.call(opts, 'compound')
      ? opts.compound
      : false;

    /**
     * @type {GraphLabel | undefined}
     * Label for the graph itself
     */
    this._label = undefined;

    /**
     * Default label to be set when creating a new node.
     *
     * @private
     * @type {(v: NodeID | number) => NodeLabel}
     */
    this._defaultNodeLabelFn = _.constant(undefined);

    /**
     * Default label to be set when creating a new edge
     *
     * @private
     * @type {(v: NodeID, w: NodeID, name: string | undefined) => EdgeLabel}
     */
    this._defaultEdgeLabelFn = _.constant(undefined);

    /**
     * @type {Record<NodeID, NodeLabel>}
     * @private
     *
     * v -> label
     */
    this._nodes = {};

    if (this._isCompound) {
      /**
       * @type {Record<NodeID, NodeID>}
       * @private
       * v -> parent
       */
      this._parent = {};

      /**
       * @type {Record<NodeID, Record<NodeID, true>>}
       * @private
       * v -> children
       */
      this._children = {};
      this._children[GRAPH_NODE] = {};
    }

    /**
     * @type {Record<NodeID, Record<EdgeID, EdgeObj>>}
     * @private
     * v -> edgeObj
     */
    this._in = {};

    /**
     * @type {Record<NodeID, Record<NodeID, number>>}
     * @private
     * u -> v -> Number
     */
    this._preds = {};

    /**
     * @type {Record<NodeID, Record<EdgeID, EdgeObj>>}
     * @private
     * v -> edgeObj
     */
    this._out = {};

    /**
     * @type {Record<NodeID, Record<NodeID, number>>}
     * @private
     * v -> w -> Number
     */
    this._sucs = {};

    /**
     * @type {Record<EdgeID, EdgeObj>}
     * @private
     * e -> edgeObj
     */
    this._edgeObjs = {};

    /**
     * @type {Record<EdgeID, EdgeLabel>}
     * @private
     * e -> label
     */
    this._edgeLabels = {};
  }

  /* === Graph functions ========= */

  isDirected() {
    return this._isDirected;
  }
  isMultigraph() {
    return this._isMultigraph;
  }
  isCompound() {
    return this._isCompound;
  }

  /**
   * @param {GraphLabel} label - Label for the graph.
   * @returns {this}
   */
  setGraph(label) {
    this._label = label;
    return this;
  }

  /**
   * @returns {GraphLabel | undefined} Label for the graph, or `undefined` if none has been set.
   */
  graph() {
    return this._label;
  }
  /* === Node functions ========== */

  /**
   * @param {typeof this._defaultNodeLabelFn | NodeLabel} newDefault - Function that creates the default label for new nodes, or a constant label.
   * @returns {this}
   */
  setDefaultNodeLabel(newDefault) {
    if (!_.isFunction(newDefault)) {
      newDefault = _.constant(newDefault);
    }
    this._defaultNodeLabelFn = newDefault;
    return this;
  }
  nodeCount() {
    return this._nodeCount;
  }

  /**
   * @returns {NodeID[]} Array of all node ids.
   */
  nodes() {
    return _.keys(this._nodes);
  }
  /**
   * @returns {NodeID[]} Array of source node ids (nodes with no in-edges).
   */
  sources() {
    var self = this;
    return _.filter(this.nodes(), function (v) {
      return _.isEmpty(self._in[v]);
    });
  }
  /**
   * @returns {NodeID[]} Array of sink node ids (nodes with no out-edges).
   */
  sinks() {
    var self = this;
    return _.filter(this.nodes(), function (v) {
      return _.isEmpty(self._out[v]);
    });
  }

  /**
   * Set/create multiple nodes.
   *
   * @param {Collection<NodeID | number>} vs - List of node IDs to create/set.
   * @param {NodeLabel} [value] - If set, update all nodes with this value.
   * @returns {this}
   */
  setNodes(vs, value) {
    var args = arguments;
    var self = this;
    _.each(vs, function (v) {
      if (args.length > 1) {
        self.setNode(v, value);
      } else {
        self.setNode(v);
      }
    });
    return this;
  }

  /**
   * @param {NodeID | number} v - ID of the node to create/set.
   * @param {NodeLabel} [value] - If not set, leave the value as-is if the node is already created.
   * Otherwise, use the default value set by {@link setDefaultNodeLabel}.
   * @returns {this}
   */
  setNode(v, value) {
    if (Object.prototype.hasOwnProperty.call(this._nodes, v)) {
      if (arguments.length > 1) {
        this._nodes[v] = value;
      }
      return this;
    }

    this._nodes[v] = arguments.length > 1 ? value : this._defaultNodeLabelFn(v);
    if (this._isCompound) {
      this._parent[v] = GRAPH_NODE;
      this._children[v] = {};
      this._children[GRAPH_NODE][v] = true;
    }
    this._in[v] = {};
    this._preds[v] = {};
    this._out[v] = {};
    this._sucs[v] = {};
    ++this._nodeCount;
    return this;
  }

  /**
   * Gets the label for the given node ID, or `undefined` if it does not exist.
   *
   * @param {NodeID | number} v - Node ID.
   * @returns {NodeLabel | undefined}
   */
  node(v) {
    return this._nodes[v];
  }

  /**
   * @param {NodeID | number} v - Node ID.
   * @returns {boolean} Returns `true` if the given node ID exists, else `false`.
   */
  hasNode(v) {
    return Object.prototype.hasOwnProperty.call(this._nodes, v);
  }

  /**
   * @param {NodeID | number} v - Node ID to remove.
   * @returns {this}
   */
  removeNode(v) {
    if (Object.prototype.hasOwnProperty.call(this._nodes, v)) {
      var removeEdge = (e) => this.removeEdge(this._edgeObjs[e]);
      delete this._nodes[v];
      if (this._isCompound) {
        this._removeFromParentsChildList(v);
        delete this._parent[v];
        _.each(this.children(v), (child) => {
          this.setParent(child);
        });
        delete this._children[v];
      }
      _.each(_.keys(this._in[v]), removeEdge);
      delete this._in[v];
      delete this._preds[v];
      _.each(_.keys(this._out[v]), removeEdge);
      delete this._out[v];
      delete this._sucs[v];
      --this._nodeCount;
    }
    return this;
  }

  /**
   * Set or remove the parent of a node.
   *
   * @param {NodeID | number} v - Node ID to set the parent for.
   * @param {NodeID | number} [parent] - Parent node ID. If not specified, removes the parent.
   * @returns {this}
   * @throws if the graph is not compound.
   * @throws if setting the parent would create a cycle.
   */
  setParent(v, parent) {
    if (!this._isCompound) {
      throw new Error('Cannot set parent in a non-compound graph');
    }

    if (_.isUndefined(parent)) {
      parent = GRAPH_NODE;
    } else {
      // Coerce parent to string
      parent += '';
      for (var ancestor = parent; !_.isUndefined(ancestor); ancestor = this.parent(ancestor)) {
        if (ancestor === v) {
          throw new Error('Setting ' + parent + ' as parent of ' + v + ' would create a cycle');
        }
      }

      this.setNode(parent);
    }

    this.setNode(v);
    this._removeFromParentsChildList(v);
    // @ts-expect-error -- We coerced parent to a string above
    this._parent[v] = parent;
    this._children[parent][v] = true;
    return this;
  }

  /**
   * @private
   * @param {NodeID | number} v - Node ID.
   */
  _removeFromParentsChildList(v) {
    delete this._children[this._parent[v]][v];
  }

  /**
   * Gets the parent of the specified node.
   *
   * @param {NodeID | number} v - Node ID.
   * @returns {NodeID | undefined} The parent node ID, or `undefined` if there is no parent
   * (i.e. node does not exist, it's a root node, or the graph is not compound).
   */
  parent(v) {
    if (this._isCompound) {
      var parent = this._parent[v];
      if (parent !== GRAPH_NODE) {
        return parent;
      }
    }
  }

  /**
   * @param {NodeID | number} [v] - Node ID. If not specified, gets the children of the root.
   * @returns {NodeID[] | undefined} Array of child node IDs, or `undefined` if the node does not exist.
   */
  children(v) {
    if (_.isUndefined(v)) {
      v = GRAPH_NODE;
    }

    if (this._isCompound) {
      var children = this._children[v];
      if (children) {
        return _.keys(children);
      }
    } else if (v === GRAPH_NODE) {
      return this.nodes();
    } else if (this.hasNode(v)) {
      return [];
    }
  }

  /**
   * @param {NodeID | number} v - Node ID.
   * @returns {NodeID[] | undefined} Array of predecessor (nodes that have an edge to this node) node IDs, or `undefined` if the node does not exist.
   */
  predecessors(v) {
    var predsV = this._preds[v];
    if (predsV) {
      return _.keys(predsV);
    }
  }

  /**
   * @param {NodeID | number} v - Node ID.
   * @returns {NodeID[] | undefined} Array of successor (nodes that this node has an edge to) node IDs, or `undefined` if the node does not exist.
   */
  successors(v) {
    var sucsV = this._sucs[v];
    if (sucsV) {
      return _.keys(sucsV);
    }
  }

  /**
   * @param {NodeID | number} v - Node ID.
   * @returns {NodeID[] | undefined} Array of neighbor (nodes that share one of the same predecessors) node IDs, or `undefined` if the node does not exist.
   */
  neighbors(v) {
    var preds = this.predecessors(v);
    if (preds) {
      return _.union(preds, this.successors(v));
    }
  }

  /**
   * @param {NodeID | number} v - Node ID.
   * @returns {boolean} True if the node is a leaf (has no successors), false otherwise.
   */
  isLeaf(v) {
    var neighbors;
    if (this.isDirected()) {
      neighbors = this.successors(v);
    } else {
      neighbors = this.neighbors(v);
    }
    return neighbors.length === 0;
  }

  /**
   * @param {(v: NodeID) => boolean} filter - Function that returns `true` for nodes to keep.
   * @returns {Graph<GraphLabel, NodeLabel, EdgeLabel>} A new graph containing only the nodes for which `filter` returns `true`.
   */
  filterNodes(filter) {
    /**
     * @type {Graph<GraphLabel, NodeLabel, EdgeLabel>}
     */
    // @ts-expect-error
    var copy = new this.constructor({
      directed: this._isDirected,
      multigraph: this._isMultigraph,
      compound: this._isCompound,
    });

    copy.setGraph(this.graph());

    var self = this;
    _.each(this._nodes, function (value, v) {
      if (filter(v)) {
        copy.setNode(v, value);
      }
    });

    _.each(this._edgeObjs, function (e) {
      if (copy.hasNode(e.v) && copy.hasNode(e.w)) {
        copy.setEdge(e, self.edge(e));
      }
    });

    var parents = {};
    function findParent(v) {
      var parent = self.parent(v);
      if (parent === undefined || copy.hasNode(parent)) {
        parents[v] = parent;
        return parent;
      } else if (parent in parents) {
        return parents[parent];
      } else {
        return findParent(parent);
      }
    }

    if (this._isCompound) {
      _.each(copy.nodes(), function (v) {
        copy.setParent(v, findParent(v));
      });
    }

    return copy;
  }

  /* === Edge functions ========== */

  /**
   * @param {typeof this._defaultEdgeLabelFn | EdgeLabel} newDefault - Function that creates the default label for new edges, or a constant label.
   * @returns {this}
   */
  setDefaultEdgeLabel(newDefault) {
    if (!_.isFunction(newDefault)) {
      newDefault = _.constant(newDefault);
    }
    this._defaultEdgeLabelFn = newDefault;
    return this;
  }
  edgeCount() {
    return this._edgeCount;
  }
  edges() {
    return _.values(this._edgeObjs);
  }

  /**
   * Creates edges between the given Node IDs.
   * @param {Collection<NodeID>} vs - List of node IDs to create edges between.
   * @param {EdgeLabel} [value] - If set, update all edges with this value.
   * @returns {this}
   */
  setPath(vs, value) {
    var self = this;
    var args = arguments;
    _.reduce(vs, function (v, w) {
      if (args.length > 1) {
        self.setEdge(v, w, value);
      } else {
        self.setEdge(v, w);
      }
      return w;
    });
    return this;
  }

  /**
   * Create or set the given edge.
   *
   * @overload
   * @param {EdgeObj} arg0 - Edge object.
   * @param {EdgeLabel} [value] - If set, update the edge with this value.
   * If not set and the edge is being created, calls the function set by {@link setDefaultEdgeLabel}.
   * @returns {this}
   */
  /**
   * Create or set the given edge.
   *
   * @overload
   * @param {NodeID | number} v - Source node ID. Number values will be coerced to strings.
   * @param {NodeID | number} w - Target node ID. Number values will be coerced to strings.
   * @param {EdgeLabel} [value] - If set, update the edge with this value.
   * If not set and the edge is being created, calls the function set by {@link setDefaultEdgeLabel}.
   * @param {string | number} [name] - Edge name.
   * @returns {this}
   */
  setEdge() {
    var v, w, name, value;
    var valueSpecified = false;
    var arg0 = arguments[0];

    if (typeof arg0 === 'object' && arg0 !== null && 'v' in arg0) {
      v = arg0.v;
      w = arg0.w;
      name = arg0.name;
      if (arguments.length === 2) {
        value = arguments[1];
        valueSpecified = true;
      }
    } else {
      v = arg0;
      w = arguments[1];
      name = arguments[3];
      if (arguments.length > 2) {
        value = arguments[2];
        valueSpecified = true;
      }
    }

    v = '' + v;
    w = '' + w;
    if (!_.isUndefined(name)) {
      name = '' + name;
    }

    var e = edgeArgsToId(this._isDirected, v, w, name);
    if (Object.prototype.hasOwnProperty.call(this._edgeLabels, e)) {
      if (valueSpecified) {
        this._edgeLabels[e] = value;
      }
      return this;
    }

    if (!_.isUndefined(name) && !this._isMultigraph) {
      throw new Error('Cannot set a named edge when isMultigraph = false');
    }

    // It didn't exist, so we need to create it.
    // First ensure the nodes exist.
    this.setNode(v);
    this.setNode(w);

    this._edgeLabels[e] = valueSpecified ? value : this._defaultEdgeLabelFn(v, w, name);

    var edgeObj = edgeArgsToObj(this._isDirected, v, w, name);
    // Ensure we add undirected edges in a consistent way.
    v = edgeObj.v;
    w = edgeObj.w;

    Object.freeze(edgeObj);
    this._edgeObjs[e] = edgeObj;
    incrementOrInitEntry(this._preds[w], v);
    incrementOrInitEntry(this._sucs[v], w);
    this._in[w][e] = edgeObj;
    this._out[v][e] = edgeObj;
    this._edgeCount++;
    return this;
  }

  /**
   * Get the label for the given edge.
   * @overload
   * @param {EdgeObj} v - Edge object.
   * @returns {EdgeLabel | undefined} The label, or `undefined` if the edge does not exist.
   */
  /**
   * Get the label for the given edge.
   * @overload
   * @param {NodeID | number} v - Source node ID.
   * @param {NodeID | number} w - Target node ID.
   * @param {string | number} [name] - Edge name.
   * @returns {EdgeLabel | undefined} The label, or `undefined` if the edge does not exist.
   */
  edge(v, w, name) {
    var e =
      arguments.length === 1
        ? edgeObjToId(this._isDirected, arguments[0])
        : edgeArgsToId(this._isDirected, v, w, name);
    return this._edgeLabels[e];
  }

  /**
   * @overload
   * @param {EdgeObj} v - Edge object.
   * @returns {boolean} `true` if the edge exists, else `false`.
   */
  /**
   * @overload
   * @param {NodeID | number} v - Source node ID.
   * @param {NodeID | number} w - Target node ID.
   * @param {string | number} [name] - Edge name.
   * @returns {boolean} `true` if the edge exists, else `false`.
   */
  hasEdge(v, w, name) {
    var e =
      arguments.length === 1
        ? edgeObjToId(this._isDirected, arguments[0])
        : edgeArgsToId(this._isDirected, v, w, name);
    return Object.prototype.hasOwnProperty.call(this._edgeLabels, e);
  }

  /**
   * @overload
   * @param {EdgeObj} v - Edge object.
   * @returns {this}
   */
  /**
   * @overload
   * @param {NodeID | number} v - Source node ID.
   * @param {NodeID | number} w - Target node ID.
   * @param {string | number} [name] - Edge name.
   * @returns {this}
   */
  removeEdge(v, w, name) {
    var e =
      arguments.length === 1
        ? edgeObjToId(this._isDirected, arguments[0])
        : edgeArgsToId(this._isDirected, v, w, name);
    var edge = this._edgeObjs[e];
    if (edge) {
      v = edge.v;
      w = edge.w;
      delete this._edgeLabels[e];
      delete this._edgeObjs[e];
      decrementOrRemoveEntry(this._preds[w], v);
      decrementOrRemoveEntry(this._sucs[v], w);
      delete this._in[w][e];
      delete this._out[v][e];
      this._edgeCount--;
    }
    return this;
  }

  /**
   * @param {NodeID | number} v - Target node ID.
   * @param {NodeID | number} [u] - If set, filters edges to only those between nodes `v` and `u`.
   * @returns {EdgeObj[] | undefined} Array of incoming edges to node `v`, or `undefined` if node `v` does not exist.
   */
  inEdges(v, u) {
    var inV = this._in[v];
    if (inV) {
      var edges = _.values(inV);
      if (!u) {
        return edges;
      }
      return _.filter(edges, function (edge) {
        return edge.v === u;
      });
    }
  }

  /**
   * @param {NodeID | number} v - Target node ID.
   * @param {NodeID | number} [w] - If set, filters edges to only those between nodes `v` and `w`.
   * @returns {EdgeObj[] | undefined} Array of outgoing edges to node `v`, or `undefined` if node `v` does not exist.
   */
  outEdges(v, w) {
    var outV = this._out[v];
    if (outV) {
      var edges = _.values(outV);
      if (!w) {
        return edges;
      }
      return _.filter(edges, function (edge) {
        return edge.w === w;
      });
    }
  }

  /**
   * List of all edges to/from node `v`.
   * @param {NodeID | number} v - Target Node ID.
   * @param {NodeID | number} [w] - If set, filters edges to only those between nodes `v` and `w`.
   * @returns {EdgeObj[] | undefined} Array of edges to/from node `v`, or `undefined` if node `v` does not exist.
   */
  nodeEdges(v, w) {
    var inEdges = this.inEdges(v, w);
    if (inEdges) {
      return inEdges.concat(this.outEdges(v, w));
    }
  }
}

/* Number of nodes in the graph. Should only be changed by the implementation. */
Graph.prototype._nodeCount = 0;

/* Number of edges in the graph. Should only be changed by the implementation. */
Graph.prototype._edgeCount = 0;

/**
 * @param {Record<NodeID, number>} map - Object mapping node IDs to counts.
 * @param {NodeID | number} k - Node ID.
 */
function incrementOrInitEntry(map, k) {
  if (map[k]) {
    map[k]++;
  } else {
    map[k] = 1;
  }
}

/**
 * @param {Record<NodeID, number>} map - Object mapping node IDs to counts.
 * @param {NodeID | number} k - Node ID.
 */
function decrementOrRemoveEntry(map, k) {
  if (!--map[k]) {
    delete map[k];
  }
}

/**
 * @param {boolean} isDirected - If `false`, sorts v and w to ensure a consistent ID.
 * @param {EdgeObj['v'] | number} v_ - Source node ID.
 * @param {EdgeObj['w'] | number} w_ - Target node ID.
 * @param {EdgeObj['name']} [name] - Edge name (for multiple edges between the same nodes).
 * @returns {EdgeID} Unique ID for the edge.
 */
function edgeArgsToId(isDirected, v_, w_, name) {
  var v = '' + v_;
  var w = '' + w_;
  if (!isDirected && v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }
  return v + EDGE_KEY_DELIM + w + EDGE_KEY_DELIM + (_.isUndefined(name) ? DEFAULT_EDGE_NAME : name);
}

/**
 * @param {boolean} isDirected - If `false`, sorts v and w to ensure a consistent ID.
 * @param {EdgeObj['v'] | number} v_ - Source node ID.
 * @param {EdgeObj['w'] | number} w_ - Target node ID.
 * @param {EdgeObj['name']} [name] - Edge name (for multiple edges between the same nodes).
 * @returns {EdgeObj}
 */
function edgeArgsToObj(isDirected, v_, w_, name) {
  var v = '' + v_;
  var w = '' + w_;
  if (!isDirected && v > w) {
    var tmp = v;
    v = w;
    w = tmp;
  }
  var edgeObj = { v: v, w: w };
  if (name) {
    edgeObj.name = name;
  }
  return edgeObj;
}

/**
 * @param {boolean} isDirected - If `false`, sorts v and w to ensure a consistent ID.
 * @param {EdgeObj} edgeObj - Edge object.
 * @returns {EdgeID} Unique ID for the edge.
 */
function edgeObjToId(isDirected, edgeObj) {
  return edgeArgsToId(isDirected, edgeObj.v, edgeObj.w, edgeObj.name);
}
