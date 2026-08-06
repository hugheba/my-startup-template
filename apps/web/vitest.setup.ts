import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// The subpath import above (note `/vitest`, not the package root) is what
// registers matchers like toBeInTheDocument / toBeDisabled onto Vitest's
// `expect`. The root import targets Jest and silently registers nothing here,
// leaving `expect(...).toBeInTheDocument is not a function` at runtime.

// Testing Library unmounts rendered trees between tests automatically ONLY when
// it can find a global afterEach — which requires `globals: true`. This repo
// keeps globals off (see vitest.config.ts), so cleanup is wired by hand.
//
// Skipping this does not fail loudly. Every render() would append another copy
// to the same document.body, so getByRole would start throwing "found multiple
// elements" in whichever test happens to run second — a failure that reads as a
// bug in the newest test rather than as missing teardown.
afterEach(() => {
  cleanup();
});
