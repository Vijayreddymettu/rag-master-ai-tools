// vitest alias target for "server-only" — that package throws unless the
// bundler sets Next.js's react-server resolve condition, which vitest
// doesn't. Tests run in plain Node, so the guard is meaningless here.
export {};
