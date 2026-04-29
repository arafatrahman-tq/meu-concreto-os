// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      // Downgrade to warn — project uses `any` intentionally for API
      // response shapes and third-party libs (jsPDF) that lack full types.
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
)
