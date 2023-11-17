import * as util from '../util.js';

export { addSVGLabel };

function addSVGLabel(root, node) {
  const domNode = root;

  domNode.node().appendChild(node.label);

  util.applyStyle(domNode, node.labelStyle);

  return domNode;
}
