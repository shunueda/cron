import { WebhookClient } from 'discord.js'

export const webhookClient = new WebhookClient({
  url: process.env.DISCORD_WEBHOOK_URL
})
