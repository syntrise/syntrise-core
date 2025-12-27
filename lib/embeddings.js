import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: MODEL,
    input: text.slice(0, 30000),
    encoding_format: 'float'
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts) {
  const response = await openai.embeddings.create({
    model: MODEL,
    input: texts.map(t => t.slice(0, 30000)),
    encoding_format: 'float'
  });
  return response.data.sort((a, b) => a.index - b.index).map(item => item.embedding);
}

export function formatForPostgres(embedding) {
  return `[${embedding.join(',')}]`;
}
