// Augment the H3 event context so TypeScript knows about the `auth` property
// injected by server/middleware/auth.ts
declare module 'h3' {
  interface H3EventContext {
    auth?: {
      userId: number
      authorizedCompanyIds: number[]
      role: string
    }
  }
}

export {}
