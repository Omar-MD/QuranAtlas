/**
 * Lighthouse CI configuration for QuranAtlas.
 * Runs against the built static site served locally.
 * For local development: pnpm run build && pnpm run lighthouse
 */

/** @type {import('@lhci/utils/src/types').LHCIConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
  },
}
