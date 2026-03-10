// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Override via NUXT_SESSION_SECRET env var — must be ≥32 chars in production
    sessionSecret:
      process.env.NUXT_SESSION_SECRET
      || 'meu-concreto-dev-only-secret-change-in-production!!'
  },

  build: {
    transpile: ['zod']
  },

  routeRules: {
    // '/' is an authenticated dashboard — it cannot be prerendered.
    // Prerendering would start the Nitro server, try to resolve @libsql native
    // binaries at build time, and fail with ResolveMessage {}.
  },

  compatibilityDate: '2025-01-15',

  nitro: {
    // @libsql/client uses native binaries and transitive deps that Nitro
    // cannot bundle — mark them as external so they resolve from node_modules at runtime
    externals: {
      external: [
        '@libsql/client',
        'libsql',
        '@libsql/hrana-client',
        '@libsql/isomorphic-ws',
        '@libsql/isomorphic-fetch',
        '@libsql/linux-x64-musl',
        '@libsql/linux-x64-gnu',
        'ws'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  icon: {
    clientBundle: {
      scan: true
    },
    serverBundle: {
      collections: ['heroicons', 'lucide', 'simple-icons']
    },
    provider: 'server'
  }
})
