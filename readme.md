## 1. Usage Examples

### Full Example: OpenGrep Scan + AI Security Report

```yaml
- name: Run OpenGrep
  run: |
    curl -fsSL https://raw.githubusercontent.com/opengrep/opengrep/main/install.sh | bash
    export PATH="${HOME}/.opengrep/cli/latest:$PATH"
    opengrep scan \
      --config p/python \
      --json \
      --no-force-color \
      --severity=ERROR \
      1>opengrep-reports.json
  shell: bash -l {0}

- name: Generate AI Security Report (OpenAI, default)
  uses: saintmalik/opengrep-ai-report@v1.0
  with:
    scan-json-path: 'opengrep-reports.json'
    output-path: 'security-report.md'
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    d1-database-id: ${{ secrets.D1_DATABASE_ID }}
    d1-api-key: ${{ secrets.D1_API_KEY }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    # model-provider: 'openai' # OpenAI is default; this is optional

# -- OR to use DeepSeek as the model provider:
# - name: Generate AI Security Report (DeepSeek)
#   uses: saintmalik/opengrep-ai-report@v1.0
#   with:
#     scan-json-path: 'opengrep-reports.json'
#     output-path: 'security-report.md'
#     cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
#     d1-database-id: ${{ secrets.D1_DATABASE_ID }}
#     d1-api-key: ${{ secrets.D1_API_KEY }}
#     deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
#     model-provider: 'deepseek'

# -- Optional: Upload to Slack after
# - name: Upload report to Slack
#   if: ${{ success() }}
#   uses: slackapi/slack-github-action@v2.1.1
#   with:
#     method: files.uploadV2
#     token: ${{ secrets.SLACK_BOT_TOKEN }}
#     payload: |
#       channel_id: ${{ secrets.SLACK_CHANNEL_ID }}
#       initial_comment: "Opengrep AI Security Report generated for `${{ github.repository }}`"
#       file: "security-report.md"
#       filename: "security-report.md"
```

---

## 2. Model Provider Selection and Underlying Models

You can use **either OpenAI (default)** or **DeepSeek** as your AI provider for recommendations.

- For **OpenAI** (default):
  - Set `openai-api-key` and (optionally) `model-provider: 'openai'`.
  - **Model used:** `gpt-4.1`

- For **DeepSeek**:
  - Set `deepseek-api-key` and `model-provider: 'deepseek'`.
  - **Model used:** `deepseek-chat`

If both keys are present, the `model-provider` input determines which provider is used.

---

## 3. Required Secrets

Set these repository secrets for the action to work:

- `CLOUDFLARE_ACCOUNT_ID` – Cloudflare Account ID
- `D1_DATABASE_ID` – Cloudflare D1 Database UUID
- `D1_API_KEY` – Cloudflare D1 API key
- *(For OpenAI:)* `OPENAI_API_KEY` – OpenAI API key
- *(For DeepSeek:)* `DEEPSEEK_API_KEY` – DeepSeek API key
- *(For Slack upload step)* `SLACK_BOT_TOKEN` – Slack bot token
- *(For Slack upload step)* `SLACK_CHANNEL_ID` – Slack channel ID

---

## 4. Action Inputs

| Input                  | Description                              | Required | Default                |
|------------------------|------------------------------------------|----------|------------------------|
| `scan-json-path`       | Path to Opengrep JSON scan results       | Yes      | `scan.json`            |
| `output-path`          | Path for generated report                | No       | `SECURITY_REPORT.md`   |
| `cloudflare-account-id`| Cloudflare Account ID                    | Yes      | -                      |
| `d1-database-id`       | Cloudflare D1 Database UUID              | Yes      | -                      |
| `d1-api-key`           | Cloudflare D1 API key                    | Yes      | -                      |
| `openai-api-key`       | OpenAI API key (for OpenAI, default)     | No       | -                      |
| `deepseek-api-key`     | DeepSeek API key (for DeepSeek)          | No       | -                      |
| `model-provider`       | AI model provider: `openai` (default) or `deepseek` | No | `openai`            |

---

## 5. Supported Input JSON Format

The input file (`scan-json-path`, e.g., `opengrep-reports.json`) **must have**:

```json
{
  "results": [
    {
      "check_id": "RULE_IDENTIFIER",
      "path": "src/file.py",
      "start": { "line": 10 },
      "extra": {
        "severity": "ERROR",
        "message": "Summary of the finding",
        "lines": "problematic code here",
        "metadata": {
          "short_description": "Optional short description",
          "cwe": ["CWE-89"]
        }
      }
    }
    // ... additional findings ...
  ]
}
```

---

**Tip:**
- Use the [OpenGrep CLI](https://github.com/opengrep/opengrep) to generate the scan JSON as shown above.
- Slack integration is best handled in your workflow YAML using the Slack GitHub Action.
- The Opengrep AI Report Generator focuses on scanning, AI remediation, and report generation.