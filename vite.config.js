export default {
  test: {
    // we can't do `import {it} from "vitest"` due to https://github.com/vitejs/vite/issues/11552
    globals: true,
  },
};
