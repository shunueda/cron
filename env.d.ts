declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_WEBHOOK_URL: string
    }
  }
}

export {}
