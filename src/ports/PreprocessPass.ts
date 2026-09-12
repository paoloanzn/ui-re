import type { UiTree } from '../contracts/UiTree.js';
/** Deterministic evidence transform; semantic component inference belongs to the agent. */
export type PreprocessPass = {
  readonly id: string;
  readonly transform: (tree: UiTree) => UiTree;
};
