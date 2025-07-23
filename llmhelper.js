const fetch = require("node-fetch");
const crypto = require("crypto");
const OpenAI = require("openai");

let openai = null;

function getOpenAIClient() {
  if (!openai) {
    const MODEL_PROVIDER = (process.env.MODEL_PROVIDER || "openai").toLowerCase();

    if (MODEL_PROVIDER === "deepseek") {
      const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
      if (!DEEPSEEK_API_KEY) {
        throw new Error("DEEPSEEK_API_KEY environment variable is missing or empty");
      }
      openai = new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: DEEPSEEK_API_KEY,
      });
      openai._modelName = "deepseek-chat";
    } else if (MODEL_PROVIDER === "openai") {
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY environment variable is missing or empty");
      }
      openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
      });
      openai._modelName = "gpt-4.1"
    } else {
      throw new Error("Unsupported MODEL_PROVIDER. Use 'deepseek' or 'openai'.");
    }
  }
  return openai;
}

function getD1Endpoint() {
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const D1_DATABASE_ID = process.env.D1_DATABASE_ID;

  if (!CLOUDFLARE_ACCOUNT_ID || !D1_DATABASE_ID) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID or D1_DATABASE_ID environment variables are missing");
  }

  return `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`;
}

function normalize(str) {
  return (str || "").trim().replace(/\s+/g, " ");
}

function makeCacheKey(finding) {
  const rule = normalize(finding.rule);
  const title = normalize(
    finding.title?.replace(/function argument `[^`]+`/, "function argument `<VAR>`")
  );
  const description = normalize(finding.description);
  const keyInput = `${rule}|${title}|${description}`;
  const hash = crypto.createHash("sha256").update(keyInput).digest("hex");

  return hash;
}

async function d1Query(sql, params = []) {
  const D1_API_KEY = process.env.D1_API_KEY;
  if (!D1_API_KEY) {
    throw new Error("D1_API_KEY environment variable is missing or empty");
  }

  const D1_ENDPOINT = getD1Endpoint();

  const res = await fetch(D1_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${D1_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`D1 error: ${data.errors?.[0]?.message || res.statusText}`);
  }

  return data.result?.[0]?.results || [];
}

async function ensureTable() {
  await d1Query(`
    CREATE TABLE IF NOT EXISTS recommendations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cache_key TEXT UNIQUE,
      recommendation TEXT
    );
  `);
}

async function getAIRecommendation(finding, temperature = 0.0, maxRetries = 5) {
  await ensureTable();
  const cacheKey = makeCacheKey(finding);

  const ruleDisplay = `${finding.rule}`;
  const titlePreview = finding.title?.substring(0, 60) + (finding.title?.length > 60 ? "..." : "");

  console.log(`\n📋 Processing: ${ruleDisplay}`);
  console.log(`   Title: ${titlePreview}`);
  console.log(`   Cache: ${cacheKey.substring(0, 8)}...`);

  const rows = await d1Query(
    `SELECT recommendation FROM recommendations WHERE cache_key = ? LIMIT 1`,
    [cacheKey]
  );

  if (rows.length > 0 && rows[0].recommendation) {
    console.log(`   ✅ Cache HIT - Using stored recommendation`);
    return rows[0].recommendation;
  }

  console.log(`   🔥 API HIT - Generating new recommendation`);

  const prompt = `
You are a senior DevSecOps assistant.
For the following security issue, provide a short, actionable remediation recommendation and a reference link if possible.

Rule: ${finding.rule}
Title: ${finding.title}
Description: ${finding.description}

Recommendation:
`;

  let lastError;
  let recommendation;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const openaiClient = getOpenAIClient();
      const modelName = openaiClient._modelName;

      const response = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature,
      });

      recommendation = response.choices[0].message.content.trim();

      await d1Query(
        `INSERT INTO recommendations (cache_key, recommendation) VALUES (?, ?) ON CONFLICT(cache_key) DO NOTHING`,
        [cacheKey, recommendation]
      );

      console.log(`   💾 Stored in cache successfully`);
      return recommendation;
    } catch (err) {
      lastError = err;
      console.log(`   ⚠️  API attempt ${attempt + 1} failed: ${err.message}`);

      if (err.status === 429) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.log(`   ⏳ Retrying in ${Math.floor(delay)}ms...`);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        break;
      }
    }
  }

  console.log(`   ❌ Failed to get recommendation after ${maxRetries} attempts`);
  throw lastError;
}

module.exports = { getAIRecommendation };