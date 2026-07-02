import type { FuzzyConfig } from '../types';
import type { IFuzzyEngine, MatchResult } from './types';

interface Seed {
  docPos: number;
  patPos: number;
}

interface ExtendedMatch extends MatchResult {
  mismatches: number;
}

export class TsFuzzyEngine implements IFuzzyEngine {
  search(documentText: string, pattern: string, config: FuzzyConfig, caseSensitive: boolean): MatchResult[] {
    if (!pattern || pattern.length < config.minMatchLength || config.kmerSize <= 0 || pattern.length < config.kmerSize) {
      return [];
    }

    const doc = caseSensitive ? documentText : documentText.toLocaleLowerCase();
    const pat = caseSensitive ? pattern : pattern.toLocaleLowerCase();
    const index = buildKmerIndex(pat, config.kmerSize);
    const seeds = collectSeeds(doc, index, config.kmerSize);
    const accepted: ExtendedMatch[] = [];
    const seen = new Set<string>();

    for (const seed of seeds) {
      const anchor = seed.docPos - seed.patPos;
      if (anchor < -pat.length || anchor >= doc.length) {
        continue;
      }

      const dedupeKey = `${Math.floor(anchor / Math.max(config.kmerSize, 1))}:${seed.patPos}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);

      const match = config.allowIndel ? extendGapped(doc, pat, seed, config) : extendUngapped(doc, pat, seed, config);
      if (!match) {
        continue;
      }

      const length = Math.max(match.end - match.start, pat.length);
      const errorRate = match.mismatches / Math.max(length, 1);
      if (length >= config.minMatchLength && errorRate <= config.maxErrorRate) {
        accepted.push(match);
      }
    }

    return mergeMatches(accepted);
  }
}

function buildKmerIndex(pattern: string, kmerSize: number): Map<string, number[]> {
  const index = new Map<string, number[]>();
  for (let pos = 0; pos <= pattern.length - kmerSize; pos += 1) {
    const kmer = pattern.slice(pos, pos + kmerSize);
    const positions = index.get(kmer) ?? [];
    positions.push(pos);
    index.set(kmer, positions);
  }
  return index;
}

function collectSeeds(documentText: string, index: Map<string, number[]>, kmerSize: number): Seed[] {
  const seeds: Seed[] = [];
  for (let docPos = 0; docPos <= documentText.length - kmerSize; docPos += 1) {
    const kmer = documentText.slice(docPos, docPos + kmerSize);
    const patternPositions = index.get(kmer);
    if (!patternPositions) {
      continue;
    }

    for (const patPos of patternPositions) {
      seeds.push({ docPos, patPos });
    }
  }
  return seeds;
}

function extendGapped(doc: string, pat: string, seed: Seed, config: FuzzyConfig): ExtendedMatch | undefined {
  const maxDistance = Math.max(1, Math.ceil(pat.length * config.maxErrorRate));
  const anchor = seed.docPos - seed.patPos;
  const startMin = Math.max(0, anchor - maxDistance);
  const startMax = Math.min(doc.length - 1, anchor + maxDistance);
  const minLength = Math.max(1, Math.min(config.minMatchLength, pat.length - maxDistance));
  const maxLength = pat.length + maxDistance;
  let best: ExtendedMatch | undefined;

  for (let start = startMin; start <= startMax; start += 1) {
    for (let length = minLength; length <= maxLength && start + length <= doc.length; length += 1) {
      const end = start + length;
      const candidate = doc.slice(start, end);
      const allowedDistance = Math.max(maxDistance, Math.ceil(Math.max(pat.length, candidate.length) * config.maxErrorRate));
      const distance = levenshteinWithin(pat, candidate, allowedDistance);

      if (distance === undefined) {
        continue;
      }

      const score = Math.max(pat.length, candidate.length) - distance;
      const match: ExtendedMatch = { start, end, mismatches: distance, score };

      if (!best || isBetterGappedMatch(match, best, seed.docPos, seed.docPos + config.kmerSize)) {
        best = match;
      }
    }
  }

  return best;
}

function isBetterGappedMatch(candidate: ExtendedMatch, current: ExtendedMatch, seedStart: number, seedEnd: number): boolean {
  if (candidate.mismatches !== current.mismatches) {
    return candidate.mismatches < current.mismatches;
  }

  const candidateCoversSeed = candidate.start <= seedStart && candidate.end >= seedEnd;
  const currentCoversSeed = current.start <= seedStart && current.end >= seedEnd;
  if (candidateCoversSeed !== currentCoversSeed) {
    return candidateCoversSeed;
  }

  const candidateLengthDelta = Math.abs(candidate.end - candidate.start);
  const currentLengthDelta = Math.abs(current.end - current.start);
  if (candidateLengthDelta !== currentLengthDelta) {
    return candidateLengthDelta > currentLengthDelta;
  }

  return (candidate.score ?? 0) > (current.score ?? 0);
}

function levenshteinWithin(pattern: string, candidate: string, maxDistance: number): number | undefined {
  if (Math.abs(pattern.length - candidate.length) > maxDistance) {
    return undefined;
  }

  const previous = new Array<number>(candidate.length + 1).fill(Number.POSITIVE_INFINITY);
  const current = new Array<number>(candidate.length + 1).fill(Number.POSITIVE_INFINITY);

  for (let column = 0; column <= Math.min(candidate.length, maxDistance); column += 1) {
    previous[column] = column;
  }

  for (let row = 1; row <= pattern.length; row += 1) {
    current.fill(Number.POSITIVE_INFINITY);
    const from = Math.max(1, row - maxDistance);
    const to = Math.min(candidate.length, row + maxDistance);
    if (from === 1) {
      current[0] = row;
    }

    let bestInRow = current[0];
    for (let column = from; column <= to; column += 1) {
      const substitutionCost = pattern[row - 1] === candidate[column - 1] ? 0 : 1;
      current[column] = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + substitutionCost
      );
      bestInRow = Math.min(bestInRow, current[column]);
    }

    if (bestInRow > maxDistance) {
      return undefined;
    }

    for (let column = 0; column <= candidate.length; column += 1) {
      previous[column] = current[column];
    }
  }

  const distance = previous[candidate.length];
  return distance <= maxDistance ? distance : undefined;
}

function extendUngapped(doc: string, pat: string, seed: Seed, config: FuzzyConfig): ExtendedMatch | undefined {
  const seedEnd = seed.docPos + config.kmerSize;
  const left = extendSide(doc, pat, seed.docPos - 1, seed.patPos - 1, -1, config.xDrop);
  const right = extendSide(doc, pat, seed.docPos + config.kmerSize, seed.patPos + config.kmerSize, 1, config.xDrop);
  const start = left.boundary + 1;
  const end = right.boundary;

  if (start < 0 || end > doc.length || end <= start) {
    return undefined;
  }

  return {
    start,
    end,
    mismatches: left.mismatches + right.mismatches,
    score: left.score + right.score + config.kmerSize
  };

  function extendSide(
    documentText: string,
    pattern: string,
    docPos: number,
    patPos: number,
    step: 1 | -1,
    xDrop: number
  ): { boundary: number; score: number; mismatches: number } {
    let currentDoc = docPos;
    let currentPat = patPos;
    let score = 0;
    let bestScore = 0;
    let bestBoundary = step === 1 ? seedEnd : seed.docPos - 1;
    let mismatches = 0;
    let bestMismatches = 0;

    while (currentDoc >= 0 && currentDoc < documentText.length && currentPat >= 0 && currentPat < pattern.length) {
      if (documentText[currentDoc] === pattern[currentPat]) {
        score += 1;
      } else {
        score -= 2;
        mismatches += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestBoundary = step === 1 ? currentDoc + 1 : currentDoc - 1;
        bestMismatches = mismatches;
      }

      if (bestScore - score >= xDrop) {
        break;
      }

      currentDoc += step;
      currentPat += step;
    }

    return { boundary: bestBoundary, score: bestScore, mismatches: bestMismatches };
  }
}

function mergeMatches(matches: ExtendedMatch[]): MatchResult[] {
  const sorted = [...matches].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: MatchResult[] = [];

  for (const match of sorted) {
    const previous = merged[merged.length - 1];
    if (previous && match.start <= previous.end) {
      previous.end = Math.max(previous.end, match.end);
      previous.score = Math.max(previous.score ?? 0, match.score ?? 0);
      continue;
    }

    merged.push({ start: match.start, end: match.end, score: match.score });
  }

  return merged;
}
