const core = require('@actions/core');
const github = require('@actions/github');
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
    const sendToSlack = core.getInput('send-to-slack') === 'true';
    const slackWebhookUrl = core.getInput('slack-webhook-url');

    process.env.CLOUDFLARE_ACCOUNT_ID = cloudflareAccountId;
    process.env.D1_DATABASE_ID = d1DatabaseId;
    process.env.D1_API_KEY = d1ApiKey;
    process.env.DEEPSEEK_API_KEY = deepseekApiKey;

    if (!fs.existsSync(scanJsonPath)) {
      throw new Error(`Scan JSON file not found: ${scanJsonPath}`);
    }

    if (sendToSlack && !slackWebhookUrl) {
      throw new Error('slack-webhook-url is required when send-to-slack is true');
    }

    // Generate report directly using the imported class
    console.log(`Generating report from ${scanJsonPath} to ${outputPath}`);

    const parser = new SecurityReportParser();
    const result = await parser.processReport(scanJsonPath, outputPath);

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Report file was not generated: ${outputPath}`);
    }

    const findingsCount = result.summary.total;

    core.setOutput('report-path', outputPath);
    core.setOutput('findings-count', findingsCount);

    if (sendToSlack) {
      await sendSlackNotification(slackWebhookUrl, outputPath, findingsCount);
    }

    if (github.context.payload.pull_request) {
      await addPRComment(outputPath, findingsCount);
    }

    console.log(`✅ Report generated successfully: ${outputPath}`);
    console.log(`📊 Findings analyzed: ${findingsCount}`);

  } catch (error) {
    core.setFailed(error.message);
  }
}

async function sendSlackNotification(webhookUrl, reportPath, findingsCount) {
  try {
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    const reportSummary = reportContent.slice(0, 1000) + (reportContent.length > 1000 ? '...' : '');

    const payload = {
      text: `🔍 Opengrep AI Security Report Generated`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔍 Opengrep AI Security Report'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Findings analyzed:* ${findingsCount}`
            },
            {
              type: 'mrkdwn',
              text: `*Generated:* ${new Date().toISOString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Report Summary:*\n\`\`\`\n${reportSummary}\n\`\`\``
          }
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('✅ Slack notification sent successfully');
  } catch (error) {
    console.error('Failed to send Slack notification:', error.message);
  }
}

async function addPRComment(reportPath, findingsCount) {
  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      console.log('No GITHUB_TOKEN found, skipping PR comment');
      return;
    }

    const octokit = github.getOctokit(token);
    const reportContent = fs.readFileSync(reportPath, 'utf8');

    const summary = `## 🔍 Opengrep AI Security Report

**Findings analyzed:** ${findingsCount}
**Report generated:** ${new Date().toISOString()}

<details>
<summary>View Full Report</summary>

${reportContent}

</details>`;

    await octokit.rest.issues.createComment({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: github.context.payload.pull_request.number,
      body: summary
    });

    console.log('✅ PR comment added successfully');
  } catch (error) {
    console.error('Failed to add PR comment:', error.message);
  }
}

run();