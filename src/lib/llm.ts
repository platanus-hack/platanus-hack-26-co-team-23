import Anthropic from '@anthropic-ai/sdk'

export const MODEL = 'claude-sonnet-5'
export const anthropic = new Anthropic() // reads ANTHROPIC_API_KEY from env
