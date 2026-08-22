import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-sonnet-5'
export const anthropic = new Anthropic() // lee ANTHROPIC_API_KEY del env
