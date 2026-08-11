// Bundled font for all in-scene troika <Text> labels.
// Never use remote fonts: troika suspends on a failed fetch and the whole
// scene <Suspense> stays blank (baseline iter-0 bug), and target users are
// offline-first.
export const LAB_FONT = '/fonts/chemlab-mono.woff'
