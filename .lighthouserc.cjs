/**
 * Lighthouse CI configuration for QuranAtlas.
 * Runs against the built static site served locally.
 * For local development: pnpm run lighthouse
 */

/** @type {import('@lhci/utils/src/types').LHCIConfig} */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.7 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
      },
    },
  },
}
