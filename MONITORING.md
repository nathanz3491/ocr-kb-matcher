# Monitoring

> UptimeRobot (free tier) — 50 monitors, 5-minute check interval.

## Health Check Endpoints

| Target | URL | Expected Response |
|---|---|---|
| Backend API | `https://<host>/health` | HTTP 200 — `{ "status": "ok", "service": "ocr-kb-matcher-backend", ... }` |
| Frontend | `https://<host>/` | HTTP 200 — Next.js rendered page |

### Backend `/health` Response Shape

```json
{
  "status": "ok",
  "timestamp": "2026-07-12T12:00:00.000Z",
  "service": "ocr-kb-matcher-backend",
  "version": "1.0.0",
  "environment": "production"
}
```

Any status code other than 200 (4xx, 5xx, connection refused, timeout) = unhealthy.

---

## UptimeRobot Setup

### 1. Create Account

1. Go to [uptimerobot.com](https://uptimerobot.com) and click **Sign Up Free**
2. Free tier: 50 monitors, 5-minute check interval, 100 alerts/month
3. Verify email and log in

### 2. Add Backend Monitor

1. Click **Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `ocr-kb-backend`
4. **URL**: `https://<production-host>/health`
5. **Monitor Timeout**: 30 seconds
6. **Check Rate**: 5 minutes
7. **Monitoring Locations**: Select 2–3 locations (e.g., US West, EU, Asia Pacific)
8. **Response Time Notification**: Leave "Alert when response time is above..." unchecked for now
9. Click **Create Monitor**

### 3. Add Frontend Monitor

1. Click **Add New Monitor**
2. **Monitor Type**: HTTP(s)
3. **Friendly Name**: `ocr-kb-frontend`
4. **URL**: `https://<production-host>/`
5. **Monitor Timeout**: 30 seconds
6. **Check Rate**: 5 minutes
7. **Monitoring Locations**: Same as backend
8. Click **Create Monitor**

### 4. Verify Both Monitors Are Up

- After a few minutes, both monitors should show a green **UP** status in the dashboard
- Click each monitor to view response time history and uptime percentage

---

## Alert Contacts

### Email (Required)

1. Go to **Alert Contacts** → **Add Alert Contact**
2. **Type**: Email
3. **Friendly Name**: `Dev Team Email`
4. **Data**: Your email address
5. Click **Save**
6. Confirm via verification email

### WeChat Webhook (Optional)

1. Obtain a WeChat Work (企业微信) bot webhook URL (群机器人 → 添加机器人 → 复制 Webhook URL)
2. Go to **Alert Contacts** → **Add Alert Contact**
3. **Type**: Webhook
4. **Friendly Name**: `WeChat Bot`
5. **Data**: The webhook URL
6. **POST Value (JSON)**:

```json
{
  "msgtype": "markdown",
  "markdown": {
    "content": "## 🔴 Uptime Alert\n**Monitor**: *{{monitor_name}}*\n**URL**: {{monitor_url}}\n**Status**: {{alert_type}}\n**Time**: {{alert_time}}\n*{{response_time}}ms*\n---\n[View Dashboard](https://uptimerobot.com/dashboard)"
  }
}
```

7. Click **Save**

### Assign Alert Contacts to Monitors

1. Edit each monitor → **Alert Contacts** tab
2. Check the email contact (and WeChat contact if configured)
3. Click **Save Monitor**

---

## Check Criteria

| Criterion | Value |
|---|---|
| **Healthy status code** | 200 |
| **Unhealthy status code** | Any 4xx, 5xx, or connection failure |
| **Check interval** | 5 minutes |
| **Timeout** | 30 seconds |
| **Alert trigger** | 1 consecutive failure |
| **Recovery trigger** | 1 consecutive success |
| **Monitoring locations** | 2–3 (multi-region) |

---

## Alert Behavior

### On Downtime (Alert Triggered)

1. UptimeRobot sends email to configured contacts immediately
2. If WeChat webhook is configured, a markdown alert is posted to the group
3. Alert includes: monitor name, URL, error type, timestamp, response time

### On Recovery

1. UptimeRobot sends a recovery notification: "Monitor *monitor-name* is UP again"
2. Recovery notifications sent to all configured contacts

---

## Runbook: What to Do on Alert

### Step 1 — Check Server

```bash
# SSH into server
ssh nathan@139.199.220.244 -p 6000

# Check if PM2 processes are running
pm2 list

# Check process logs
pm2 logs backend --lines 50
pm2 logs frontend --lines 50
```

### Step 2 — Check Health Manually

```bash
# Test backend health
curl -I https://<host>/health

# Test frontend
curl -I https://<host>/
```

### Step 3 — Check System Resources

```bash
# Check disk, memory, CPU
df -h
free -h
top -bn1 | head -20

# Check if ports are listening
ss -tlnp | grep -E '3000|3001'
```

### Step 4 — Restart if Needed

```bash
# Restart individual process
pm2 restart backend

# Restart all
pm2 restart all

# If PM2 itself is down
pm2 resurrect
# or
pm2 start ecosystem.config.js
```

### Step 5 — Escalate

- If the issue persists, check:
  - Cloudflare tunnel status (if using TryCloudflare)
  - DNS resolution for the domain
  - Firewall rules (security group / iptables)
  - SSL certificate expiry
- For prolonged outage (>15 min), inform users via the configured alert channel

---

## Dashboard URL

Production: [https://uptimerobot.com/dashboard](https://uptimerobot.com/dashboard)

---

## Maintenance Notes

- **Adding new endpoints**: When new API routes are added, consider adding a dedicated monitor if the route is business-critical
- **Changing monitoring**: UptimeRobot API key is stored **only** in UptimeRobot account settings — never commit it to the repository
- **Free tier limits**: 50 monitors, 100 alerts/month — if approaching limits, consolidate or upgrade to paid tier
