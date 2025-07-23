const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

const SecurityReportParser = require('./reports');

async function run() {
  try {
    const scanJsonPath = core.getInput('scan-json-path');
    const outputPath = core.getInput('output-path');
    const cloudflareAccountId = core.getInput('cloudflare-account-id');
    const d1DatabaseId = core.getInput('d1-database-id');
    const d1ApiKey = core.getInput('d1-api-key');
    const deepseekApiKey = core.getInput('deepseek-api-key');
    const openaiApiKey = core.getInput('openai-api-key');
    const modelProvider = core.getInput('model-provider') || 'openai';

    process.env.CLOUDFLARE_ACCOUNT_ID = cloudflareAccountId;
    process.env.D1_DATABASE_ID = d1DatabaseId;
    process.env.D1_API_KEY = d1ApiKey;
    process.env.MODEL_PROVIDER = modelProvider.toLowerCase();

    if (deepseekApiKey) process.env.DEEPSEEK_API_KEY = deepseekApiKey;
    if (openaiApiKey) process.env.OPENAI_API_KEY = openaiApiKey;

    if (!fs.existsSync(scanJsonPath)) {
      throw new Error(`Scan JSON file not found: ${scanJsonPath}`);
    }

    console.log(`Generating report from ${scanJsonPath} to ${outputPath}`);

    const parser = new SecurityReportParser();
    const result = await parser.processReport(scanJsonPath, outputPath);

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Report file was not generated: ${outputPath}`);
    }

    const findingsCount = result.summary.total;

    core.setOutput('report-path', outputPath);
    core.setOutput('findings-count', findingsCount);

    console.log(`✅ Report generated successfully: ${outputPath}`);
    console.log(`📊 Findings analyzed: ${findingsCount}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

run();