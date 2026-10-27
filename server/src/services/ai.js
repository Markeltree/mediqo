const Anthropic = require('@anthropic-ai/sdk');

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

const SAFETY_SYSTEM = `You are the Mediqo assistant. You help patients understand symptoms, prepare for visits,
and choose the right kind of specialist. You are NOT a doctor: never diagnose, never prescribe or dose medication.
For emergencies (chest pain, trouble breathing, stroke signs, severe bleeding, suicidal thoughts), tell the user to
call local emergency services immediately. Keep answers short, plain-language, and calm.`;

function requireClient() {
  if (!client) {
    const err = new Error('AI assistant is not configured (ANTHROPIC_API_KEY missing)');
    err.status = 503;
    throw err;
  }
  return client;
}

async function chat(messages) {
  const res = await requireClient().messages.create({
    model: MODEL,
    max_tokens: 600,
    system: SAFETY_SYSTEM,
    messages,
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

/** Suggests a specialty from free-text symptoms. Returns one of the known specialties. */
async function suggestSpecialty(symptoms, specialties) {
  const res = await requireClient().messages.create({
    model: MODEL,
    max_tokens: 150,
    system: `${SAFETY_SYSTEM}\nReply ONLY with minified JSON: {"specialty": "<one of the list>", "urgency": "low|medium|high", "reason": "<one sentence>"}. Choose from: ${specialties.join(', ')}.`,
    messages: [{ role: 'user', content: symptoms }],
  });
  const text = res.content.find((b) => b.type === 'text')?.text || '{}';
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : text);
  } catch {
    return { specialty: specialties[0], urgency: 'medium', reason: 'Could not parse suggestion.' };
  }
}

/** Summarises a visit reason + history into a short doctor-facing brief. */
async function summarizeVisit(reason, history) {
  return chat([
    {
      role: 'user',
      content: `Write a 3-line pre-visit brief for the doctor. Reason: ${reason}. Patient notes: ${history || 'none'}.`,
    },
  ]);
}

module.exports = { chat, suggestSpecialty, summarizeVisit, isConfigured: () => !!client };
