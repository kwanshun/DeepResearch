import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const env: Record<string, string> = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^#\s=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        env[key] = value;
      }
    });
    return env;
  }
  return {};
}

const env = loadEnv();
console.log('Keys found in env:', Object.keys(env));
const apiKey = env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function getInteraction(interactionId: string) {
  try {
    const interaction = await (ai as any).interactions.get(interactionId);
    console.log(JSON.stringify(interaction, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

const interactionId = process.argv[2];
if (interactionId) {
  getInteraction(interactionId);
} else {
  console.error('Please provide an interaction ID');
}
