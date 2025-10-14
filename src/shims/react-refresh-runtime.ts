// Shim for react-refresh runtime to avoid RefreshRuntime.register errors in dev preview
// This disables React Fast Refresh but keeps the app running.
export function performReactRefresh() {
  // no-op
}

export function register() {
  // no-op
}

export function createSignatureFunctionForTransform() {
  return (type: any) => type;
}

const runtime = {
  performReactRefresh,
  register,
  createSignatureFunctionForTransform,
};

export default runtime;
