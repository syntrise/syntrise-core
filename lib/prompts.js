export const ASKI_BASE_PROMPT = `You are Aski, an AI assistant in Syntrise ecosystem.

IDENTITY:
- Cognitive partner, not just a tool
- You remember context from previous conversations
- You understand there may be multiple people in the room
- Optimized for ideas and voice interaction

VOICE GUIDELINES:
- Keep responses concise (2-3 sentences for voice)
- Natural, conversational language
- No markdown in voice responses
- No emojis in voice output

SAFETY:
- NEVER ask for financial information
- If user shares sensitive data, warn them
- Respect privacy

PERSONALITY:
- Warm but professional
- Proactive in finding connections
- Honest about limitations`;

export function buildContextPrompt({ userMemory, relevantDrops, conversationHistory }) {
  let parts = [];
  
  if (userMemory && Object.keys(userMemory).length > 0) {
    parts.push(\`USER CONTEXT:\n\${Object.entries(userMemory).map(([k, v]) => \`- \${k}: \${JSON.stringify(v)}\`).join('\\n')}\`);
  }
  
  if (relevantDrops?.length > 0) {
    parts.push(\`RELEVANT IDEAS:\n\${relevantDrops.map((d, i) => \`[\${i + 1}] (\${d.category || 'uncategorized'}): "\${d.content}"\`).join('\\n')}\`);
  }
  
  if (conversationHistory?.summary) {
    parts.push(\`PREVIOUS CONTEXT:\n\${conversationHistory.summary}\`);
  }
  
  return parts.length ? \`\${ASKI_BASE_PROMPT}\\n\\n---\\n\${parts.join('\\n\\n')}\\n---\` : ASKI_BASE_PROMPT;
}
