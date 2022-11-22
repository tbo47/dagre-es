export function render(): {
  (svg: any, g: any): void;
  createNodes(...args: any[]): typeof createNodes;
  createClusters(value: any, ...args: any[]): typeof createClusters;
  createEdgeLabels(value: any, ...args: any[]): typeof createEdgeLabels;
  createEdgePaths(value: any, ...args: any[]): typeof createEdgePaths;
  shapes(value: any, ...args: any[]): typeof shapes | any;
  arrows(value: any, ...args: any[]): typeof arrows | any;
};
import { createNodes } from './create-nodes';
import { createClusters } from './create-clusters';
import { createEdgeLabels } from './create-edge-labels';
import { createEdgePaths } from './create-edge-paths';
import * as shapes from './shapes';
import * as arrows from './arrows';
