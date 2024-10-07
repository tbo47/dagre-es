import * as _ from 'lodash-es';

var DEFAULT_EDGE_NAME = '\x00';
var GRAPH_NODE = '\x00';
var EDGE_KEY_DELIM = '\x01';

/**
 * @typedef {Object} Edge
 * @property {string} [v]
 * @property {string} [w]
 * @property {string} [name] - The name that uniquely identifies a multi-edge.
 *
 * @typedef {Object} GraphOptions
 * @property {boolean} [directed=true]
 * @property {boolean} [multigraph=false]
 * @property {boolean} [compound=false]
 *
 * @typedef {Object} Node
 * @property {string} label - The label of the node.
 * @property {number} [paddingX] - The horizontal padding of the node.
 * @property {number} [paddingY] - The vertical padding of the node.
 * @property {number} [padding] - The padding of the node for all directions. Overrides `paddingX` and `paddingY`.
 * @property {number} [paddingLeft] - The left padding of the node.
 * @property {number} [paddingRight] - The right padding of the node.
 * @property {number} [_prevWidth]
 * @property {number} [width]
 * @property {number} [_prevHeight]
 * @property {number} [height]
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
export class Graph {
  constructor(/** @type {GraphOptions} */ opts = {}) {
    /** @type {boolean} */
    this._isDirected = Object.prototype.hasOwnProperty.call(opts, 'directed')
      ? opts.directed
      : true;
    /** @type {boolean} */
    this._isMultigraph = Object.prototype.hasOwnProperty.call(opts, 'multigraph')
      ? opts.multigraph
      : false;
    /** @type {boolean} */
    this._isCompound = Object.prototype.hasOwnProperty.call(opts, 'compound')
      ? opts.compound
      : false;

    /** 
     * Label for the graph itself
     * @type {string | undefined} 
     */
    this._label = undefined;

    // Defaults to be set when creating a new node
    this._defaultNodeLabelFn = _.constant(undefined);

    // Defaults to be set when creating a new edge
    this._defaultEdgeLabelFn = _.constant(undefined);

    // v -> label
    /** @type {Object<string, string>} */
    this._nodes = {};

    if (this._isCompound) {
      // v -> parent
      /** @type {Object<string, string>} */
      this._parent = {};

      // v -> children
      this._children = {};
      this._children[GRAPH_NODE] = {};
    }

    // v -> edgeObj
    /** @type {Object<string, Object<string, Edge>>} */
    this._in = {};

    // u -> v -> Number
    /* @type {Object<string, Object<string, something >>} */
    this._preds = {};

    // v -> edgeObj
    this._out = {};

    // v -> w -> Number
    this._sucs = {};

    // e -> edgeObj
    /**
     * Edge objects for each edge.
     * @type {Object<string, Edge>}
     */
    this._edgeObjs = {};

    // e -> label
    /** @type {Object<string, string>} */
    this._edgeLabels = {};
  }
  /* === Graph functions ========= */

  /**
   * Whether graph was created with 'directed' flag set to true or not.
   *
   * @returns whether the graph edges have an orientation.
   */
  isDirected() {
    return this._isDirected;
  }

  /**
   * Whether graph was created with 'multigraph' flag set to true or not.
   *
   * @returns whether the pair of nodes of the graph can have multiple edges.
   */
  isMultigraph() {
    return this._isMultigraph;
  }

  /**
   * Whether graph was created with 'compound' flag set to true or not.
   *
   * @returns whether a node of the graph can have subnodes.
   */
  isCompound() {
    return this._isCompound;
  }

  /**
   * Sets the label of the graph.
   *
   * @argument label - label value.
   * @returns the graph, allowing this to be chained with other functions.
   */
  setGraph(label) {
    this._label = label;
    return this;
  }

  /**
   * Gets the graph label.
   *
   * @returns {string | undefined} currently assigned label for the graph or undefined if no label assigned.
   */
  graph() {
    return this._label;
  }
  /* === Node functions ========== */

  /**
   * Sets the default node label. This label will be assigned as default label
   * in case if no label was specified while setting a node.
   * Complexity: O(1).
   *
   * Sets the default node label factory function. This function will be invoked
   * each time when setting a node with no label specified and returned value
   * will be used as a label for node.
   * Complexity: O(1).
   *
   * @argument newDefault - default node label.
   * @returns the graph, allowing this to be chained with other functions.
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
   * Gets all nodes of the graph. Note, the in case of compound graph subnodes are
   * not included in list.
   * Complexity: O(1).
   *
   * @returns {string[]} list of graph nodes.
   */
  nodes() {
    return _.keys(this._nodes);
  }
  sources() {
    var self = this;
    return _.filter(this.nodes(), function (v) {
      return _.isEmpty(self._in[v]);
    });
  }
  sinks() {
    var self = this;
    return _.filter(this.nodes(), function (v) {
      return _.isEmpty(self._out[v]);
    });
  }

  /**
   * Invokes setNode method for each node in names list.
   * Complexity: O(|names|).
   *
   * @argument {string[]} vs - list of nodes names to be set.
   * @argument {string} value - value to set for each node in list.
   * @returns the graph, allowing this to be chained with other functions.
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
   * Creates or updates the value for the node v in the graph. If label is supplied
   * it is set as the value for the node. If label is not supplied and the node was
   * created by this call then the default node label will be assigned.
   * Complexity: O(1).
   *
   * @argument {string} v - node name.
   * @argument {string} [value] - value to set for node.
   * @returns {Graph} the graph, allowing this to be chained with other functions.
   */
  setNode(v, value) {
    if (Object.prototype.hasOwnProperty.call(this._nodes, v)) {
      if (arguments.length > 1) {
        this._nodes[v] = value;
      }
      return this;
    }

    // @ts-expect-error
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
   * Gets the label of node with specified name.
   * Complexity: O(|V|).
   *
   * @argument {string} v - name of the node.
   * @returns label value of the node.
   */
  node(v) {
    return this._nodes[v];
  }

  /**
   * Detects whether graph has a node with specified name or not.
   *
   * @argument {string} v - name of the node.
   * @returns {boolean} true if graph has node with specified name, false - otherwise.
   */
  hasNode(v) {
    return Object.prototype.hasOwnProperty.call(this._nodes, v);
  }

  /**
   * Remove the node with the name from the graph or do nothing if the node is not in
   * the graph. If the node was removed this function also removes any incident
   * edges.
   * Complexity: O(1).
   *
   * @argument {string} v - name of the node.
   * @returns {Graph} the graph, allowing this to be chained with other functions.
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
   * Sets node p as a parent for node v if it is defined, or removes the
   * parent for v if p is undefined. Method throws an exception in case of
   * invoking it in context of noncompound graph.
   * Average-case complexity: O(1).
   *
   * @argument {string} v - node to be child for p.
   * @argument {string} [parent] - node to be parent for v.
   * @returns {Graph} the graph, allowing this to be chained with other functions.
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
    this._parent[v] = parent;
    this._children[parent][v] = true;
    return this;
  }
  _removeFromParentsChildList(v) {
    delete this._children[this._parent[v]][v];
  }

  /**
   * Gets parent node for node v.
   * Complexity: O(1).
   *
   * @argument {string} v - node to get parent of.
   * @returns {string | undefined} parent node name or void if v has no parent.
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
   * Gets list of direct children of node v.
   * Complexity: O(1).
   *
   * @argument {string} [v] - node to get children of.
   * @returns {string[]} children nodes names list.
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
   * Return all nodes that are predecessors of the specified node or undefined if node v is not in
   * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
   * Complexity: O(|V|).
   *
   * @argument {string} v - node identifier.
   * @returns {undefined | string[]} node identifiers list or undefined if v is not in the graph.
   */
  predecessors(v) {
    var predsV = this._preds[v];
    if (predsV) {
      return _.keys(predsV);
    }
  }

  /**
   * Return all nodes that are successors of the specified node or undefined if node v is not in
   * the graph. Behavior is undefined for undirected graphs - use neighbors instead.
   * Complexity: O(|V|).
   *
   * @argument {string} v - node identifier.
   * @returns {undefined | string[]} node identifiers list or undefined if v is not in the graph.
   */
  successors(v) {
    var sucsV = this._sucs[v];
    if (sucsV) {
      return _.keys(sucsV);
    }
  }

  /**
   * Return all nodes that are predecessors or successors of the specified node or undefined if
   * node v is not in the graph.
   * Complexity: O(|V|).
   *
   * @argument {string} v - node identifier.
   * @returns {undefined | string[]} node identifiers list or undefined if v is not in the graph.
   */
  neighbors(v) {
    var preds = this.predecessors(v);
    if (preds) {
      return _.union(preds, this.successors(v));
    }
  }
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
   * Creates new graph with nodes filtered via filter. Edges incident to rejected node
   * are also removed. In case of compound graph, if parent is rejected by filter,
   * than all its children are rejected too.
   * Average-case complexity: O(|E|+|V|).
   *
   * @argument {Function} filter - filtration function detecting whether the node should stay or not.
   * @returns {string} new graph made from current and nodes filtered.
   */
  filterNodes(filter) {
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

    /** @type {Object<string, string | undefined>} */
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
   * Sets the default edge label. This label will be assigned as default label
   * in case if no label was specified while setting an edge.
   * Complexity: O(1).
   *
   * @argument newDefault - default edge label. String or function.
   * @returns {Graph} the graph, allowing this to be chained with other functions.
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

  /**
   * Gets edges of the graph. In case of compound graph subgraphs are not considered.
   * Complexity: O(|E|).
   *
   * @return {Edge[]} graph edges list.
   */
  edges() {
    return _.values(this._edgeObjs);
  }

  /**
   * Establish an edges path over the nodes in nodes list. If some edge is already
   * exists, it will update its label, otherwise it will create an edge between pair
   * of nodes with label provided or default label if no label provided.
   * Complexity: O(|nodes|).
   *
   * @argument {string[]} vs - list of nodes to be connected in series.
   * @argument [value] - value to set for each edge between pairs of nodes.
   * @returns {Graph} the graph, allowing this to be chained with other functions.
   */
  setPath(vs, value) {
    /** @type Graph */
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
  /*
   * setEdge(v, w, [value, [name]])
   * setEdge({ v, w, [name] }, [value])
   *
   * Creates or updates the label for the edge (v, w) with the optionally supplied
   * name. If label is supplied it is set as the value for the edge. If label is not
   * supplied and the edge was created by this call then the default edge label will
   * be assigned. The name parameter is only useful with multigraphs.
   * Complexity: O(1).
   *
   * @argument v - edge source node.
   * @argument w - edge sink node.
   * @argument label - value to associate with the edge.
   * @argument name - unique name of the edge in order to identify it in multigraph.
   * @returns the graph, allowing this to be chained with other functions.
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

    // @ts-expect-error
    this._edgeLabels[e] = valueSpecified ? value : this._defaultEdgeLabelFn(v, w, name);

    /** @type {Edge} */
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
   * Gets the label for the specified edge.
   * Complexity: O(1).
   *
   * @argument {Edge} v - edge source node.
   * @argument {string} [w] - edge sink node.
   * @argument {string} [name] - name of the edge (actual for multigraph).
   * @returns value associated with specified edge.
   */
  edge(v, w, name) {
    var e =
      arguments.length === 1
        ? edgeObjToId(this._isDirected, arguments[0])
        : edgeArgsToId(this._isDirected, v, w, name);
    return this._edgeLabels[e];
  }

  /**
   * Detects whether the graph contains specified edge or not. No subgraphs are considered.
   * Complexity: O(1).
   *
   * @argument {Edge | string} v - edge source node.
   * @argument {string} [w] - edge sink node.
   * @argument {string} [name] - name of the edge (actual for multigraph).
   * @returns whether the graph contains the specified edge or not.
   */
  hasEdge(v, w, name) {
    var e =
      arguments.length === 1
        ? edgeObjToId(this._isDirected, arguments[0])
        : edgeArgsToId(this._isDirected, v, w, name);
    return Object.prototype.hasOwnProperty.call(this._edgeLabels, e);
  }

  /**
   * Removes the specified edge from the graph. No subgraphs are considered.
   * Complexity: O(1).
   *
   * @argument {Edge | string} v - edge source node.
   * @argument {string} [w] - edge sink node.
   * @argument {string} [name] - name of the edge (actual for multigraph).
   * @returns the graph, allowing this to be chained with other functions.
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
   * Return all edges that point to the node v. Optionally filters those edges down to just those
   * coming from node u. Behavior is undefined for undirected graphs - use nodeEdges instead.
   * Complexity: O(|E|).
   *
   * @argument {string} v - edge sink node.
   * @argument {string} [u] - edge source node.
   * @returns {Edge[] | undefined} edges descriptors list if v is in the graph, or undefined otherwise.
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
   * Return all edges that are pointed at by node v. Optionally filters those edges down to just
   * those point to w. Behavior is undefined for undirected graphs - use nodeEdges instead.
   * Complexity: O(|E|).
   *
   * @argument {string} v - edge sink node.
   * @argument {string} [w] - edge source node.
   * @returns {Edge[] | undefined} edges descriptors list if v is in the graph, or undefined otherwise.
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
   * Returns all edges to or from node v regardless of direction. Optionally filters those edges
   * down to just those between nodes v and w regardless of direction.
   * Complexity: O(|E|).
   *
   * @argument {string} v - edge adjacent node.
   * @argument {string} [w] - edge adjacent node.
   * @returns {undefined | Edge[]} edges descriptors list if v is in the graph, or undefined otherwise.
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

function incrementOrInitEntry(map, k) {
  if (map[k]) {
    map[k]++;
  } else {
    map[k] = 1;
  }
}

function decrementOrRemoveEntry(map, k) {
  if (!--map[k]) {
    delete map[k];
  }
}

/**
 * @param {boolean} isDirected
 * @param {string | Edge} v_
 * @param {string} w_
 * @param {string} name
 * @returns {string}
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
 * @param {boolean} isDirected
 * @param {string} v_
 * @param {string} w_
 * @param {string} name
 * @returns {Edge}
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

function edgeObjToId(/** @type {boolean} */ isDirected, /** @type {Edge} */ edgeObj) {
  return edgeArgsToId(isDirected, edgeObj.v, edgeObj.w, edgeObj.name);
}
