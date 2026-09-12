import type { UiTree } from '../contracts/UiTree.js';
import { createTokenStatistics } from './createTokenStatistics.js';
export type TokenCandidate = { readonly property: string; readonly value: string; readonly count: number };
export function tokenStatistics(trees: readonly UiTree[]): TokenCandidate[] {
  const statistics=createTokenStatistics();for(const tree of trees)statistics.add(tree);return statistics.values();
}
