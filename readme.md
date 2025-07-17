### 1. Usage Examples

#### Basic usage:
```yaml
- name: Generate AI Report
  uses: saintmalik/opengrep-ai-report@v1.0
  with:
    scan-json-path: 'scan.json'
    output-path: 'security-report.md'
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    d1-database-id: ${{ secrets.D1_DATABASE_ID }}
    d1-api-key: ${{ secrets.D1_API_KEY }}
    deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
```

#### With Slack integration:
```yaml
- name: Generate AI Report with Slack
  uses: saintmalik/opengrep-ai-report@v1.0
  with:
    scan-json-path: 'scan.json'
    output-path: 'security-report.md'
    cloudflare-account-id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    d1-database-id: ${{ secrets.D1_DATABASE_ID }}
    d1-api-key: ${{ secrets.D1_API_KEY }}
    deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
    send-to-slack: 'true'
    slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 2. Required Secrets

Users need to set these secrets in their repository:
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare Account ID
- `D1_DATABASE_ID` - D1 Database UUID
- `D1_API_KEY` - Cloudflare D1 API key
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `SLACK_WEBHOOK_URL` - Slack webhook URL (optional)

### 3. Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `scan-json-path` | Path to Opengrep JSON scan results | Yes | `scan.json` |
| `output-path` | Path for generated report | No | `SECURITY_REPORT.md` |
| `cloudflare-account-id` | Cloudflare Account ID | Yes | - |
| `d1-database-id` | D1 Database UUID | Yes | - |
| `d1-api-key` | Cloudflare D1 API key | Yes | - |
| `deepseek-api-key` | DeepSeek API key | Yes | - |
| `send-to-slack` | Send report to Slack (true/false) | No | `false` |
| `slack-webhook-url` | Slack webhook URL | No | - |