export { intersectNode };

function intersectNode(node, point) {
  if (!node || !node.intersect) return false;
  return node.intersect(point);
}
