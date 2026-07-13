# Monetization Plan: OCR Knowledge Base Matcher

> Companion document to `MAKING_MONEY.txt` (which is the original brainstorm).
> This is the refined plan after tier-scaffolding implementation, market research, and product understanding.

---

## Where We Are Now

| Capability | Status |
|---|---|
| Tier scaffolding (quota middleware, admin, frontend widget, 429 handling) | ✅ DONE |
| Subject packs (real, monetizable content) | ❌ NOT BUILT |
| Payments | ❌ NOT DONE |
| Pricing page | ❌ NOT BUILT |
| 视频号 videos / marketing | ❌ NOT DONE |

The tier scaffolding is the **enforcement layer**. The actual revenue engine still needs to be built.

---

## Monetization Stack

### Pricing Tiers

| Tier | Price | Uploads/mo | Quiz gen | Chat msgs | When it shows |
|---|---|---|---|---|---|
| Free trial | ¥0 | 10 (one-time) | 10 | 50 | 7 days, no card |
| Free | ¥0 | 2 | 3 | 20 | After trial |
| 月卡 (Monthly) | **¥19/mo** | 15 | 30 | 100 | First month ¥9.9 promo |
| 年卡 (Annual) | **¥198/yr** | 15 | 30 | 100 | ¥16.50/mo equivalent |
| 高考冲刺 (Gaokao sprint) | **¥99** | 50 (one-shot, Mar–Jun) | 100 | 300 | Seasonal |

### Subject Packs (Vertical Strategy)

**Wave 1 (launch)**:
- 高考语文古诗文72篇 (~150 nodes) — public domain, mandatory, highest search volume
- 人教版高中数学 必修1 (函数, ~100 nodes) — proves the math pipeline

**Wave 2 (after first 50 paying users)**:
- 部编版初中语文 7–9年级
- 人教版高中数学 必修2–5 + 选择性必修

**Wave 3 (post-revenue proof)**:
- 高考数学
- 高考英语 (different pipeline — later)
- 小学语数 (parent-paid segment)

### Payment Rails

- **WeChat Pay (微信支付)** — primary, 0.6% fee, mandatory for 视频号 audience
- **Alipay (支付宝)** — secondary, 0.6% fee
- **NO Stripe** — irrelevant for mainland China
- **NO Apple IAP** — only matters if we ship an iOS app (deferred)

### Marketing Channels (in order)

1. **视频号 (WeChat Channels)** — first shot, Chinese parents live here
2. **小红书 (Xiaohongshu)** — second, easy cross-post from 视频号
3. **Discord / Reddit (r/APStudents, r/IBO)** — optional, only if bilingual/IB vertical gains traction

---

## Phased Roadmap (12 Weeks)

### Phase 1: Ship MVP (Weeks 1–3)

- Build 高考语文古诗文72篇 + 高中数学必修1 packs (~250 nodes total)
- Pricing page (`/pricing`) + WeChat Pay integration
- Onboarding flow (2-tap: subject → textbook → load graph)
- Subject pack selector in dashboard
- Record 1 video, post to 视频号
- **Cost**: ~$300 (Moonshot batch generation) + ¥0 (free tier server)
- **Revenue target**: First 10 paying users

### Phase 2: Soft Launch (Weeks 4–6)

- Add 初中语文 + 高中数学 rest of required
- WeChat Pay 商户号 + ICP备案 (1–5 business days, start NOW)
- 高考冲刺 ¥99 seasonal push (Mar–Apr–May)
- 10–15 视频号 videos, A/B test hooks
- **Cost**: ~$500 (more content) + ¥300–500/mo server
- **Revenue target**: 100 paying users (~¥1,900 MRR)

### Phase 3: Growth (Weeks 7–12)

- Subject expansion based on actual demand signal
- Family plan (parent + 1–2 student accounts, +¥50/yr each)
- Referral program (老学员 referral → ¥20 discount)
- Push notification for due SM-2 reviews (drives retention)
- **Cost**: ~$1,500/mo all-in (AI + server + content)
- **Revenue target**: 500 paying users (~¥9,500 MRR)

---

## Cost & Revenue Math

### Per-user Costs (verified via F2 review)

| User pattern | AI cost/month |
|---|---|
| Heavy paid user (15 uploads + 30 quiz + 100 chat) | ~¥23 |
| Average paid user | ~¥7 |
| Free tier user | ~¥1.40 (acquisition cost) |

### Server

- Tencent Lighthouse 4C4G 7M 1000GB: **¥100/mo** at promo (¥1,200/yr), scales to ¥300/mo at 1,000 users

### Unit Economics

| Tier | Price/mo | AI cost/mo | Gross margin | Margin % |
|---|---|---|---|---|
| Free | ¥0 | ¥1.40 | -¥1.40 | (acquisition cost) |
| 月卡 | ¥19 | ¥7.00 | ¥12.00 | 63% |
| 年卡 | ¥16.50/mo equiv | ¥7.00 | ¥9.50 | 58% |
| 高考冲刺 | ¥25/mo amortized | ¥5.00 | ¥20.00 | **80%** |

### Revenue Projection at Scale

| Scale | Users (free/paid) | MRR | AI cost | Server | Net |
|---|---|---|---|---|---|
| 100 | 70/30 | ¥570 | ¥210 | ¥100 | ¥260 |
| 1,000 | 700/300 | ¥5,700 | ¥2,100 | ¥200 | ¥3,400 |
| 5,000 | 3,500/1,500 | ¥28,500 | ¥10,500 | ¥500 | ¥17,500 |
| 10,000 | 7,000/3,000 | ¥57,000 | ¥21,000 | ¥800 | **¥35,200** |

**Break-even**: ~80 paying users (covers server + WeChat Pay merchant fees)

---

## Critical Decisions To Lock In Now

1. **ICP备案** — start the filing today. Without it, WeChat Pay 商户号 won't issue.
2. **WeChat Pay 商户号** — same, 1–5 business days. Apply now.
3. **Pricing page design** — copy + visuals. Need before launch.
4. **First 视频号 video script** — what to record?
5. **Wave 1 pack selection** — 语文古诗文72篇 OR 数学必修1 OR both?

---

## Known Risks (from F2/F4 audit)

3 functional nits still need fixing **before** payment goes live or you'll have billing-period bugs on day 1:

1. `setUserTier` doesn't set `subscriptionStartedAt` — period rollover breaks for upgraded users
2. 429 toast links to `/admin` not `/settings/subscription` (free users get 403)
3. `subscriptionStartedAt` field missing from backend User type — forced `as unknown as` double-cast in admin.ts

Fix these **before** payment integration.

---

## Recommended Next Step

Lock in the 3 functional fixes first (small boulder, ~2 days), then dispatch the **Wave 1 pack + pricing page** boulder. WeChat Pay 商户号 application + ICP备案 can run in parallel as filing-only tasks (no engineering required).

**Order of operations**:
1. NOW: Apply for ICP备案 + WeChat Pay 商户号 (filing-only, 1–5 business days)
2. NOW: Dispatch **fix-3-nits** boulder (~2 days)
3. THEN: Dispatch **Wave 1 pack + pricing page** boulder (~2 weeks)
4. THEN: Record first 视频号 video + soft launch

---

## Reference: Prior Decisions Locked In

From earlier discussions:
- **Tiers**: only `'free' | 'monthly' | 'yearly'` — NO `'lifetime'`, NO `'gaokao'` tier in v1
- **Auth model**: per-user JSON storage with `requireAuth` + `requireAdmin` middleware
- **Period reset**: lazy evaluation (no cron jobs)
- **Free tier**: resets on 1st of each UTC month
- **Paid tier**: resets on subscription anniversary
- **WeChat Pay required** (Stripe irrelevant in mainland China)
- **Web-first** (iOS app deferred; WeChat Mini Program deferred to later wave)
- **NO 视频号 → WeChat Mini Program** in v1 (web app sufficient)

## Reference: Tier Scaffolding Implementation Status

Verified in F1/F2/F4 final review (boulder complete):

- ✅ `backend/src/middleware/quota.ts` (154 lines) — quota enforcement with lazy tier/period rollover
- ✅ `backend/src/config/tiers.ts` (95 lines) — tier limits + anniversary helpers
- ✅ `backend/src/middleware/auth.ts` — `requireAuth` + `requireAdmin`
- ✅ `backend/src/services/userService.ts` — `getUserById`, `saveUser`, `setUserTier`, `bootstrapAdmin`, `getAdminEmails`
- ✅ `backend/src/routes/admin.ts` (181 lines) — 5 admin endpoints
- ✅ 6 routes gated: upload, quiz (3), chat (2)
- ✅ `GET /api/user/quota` — read-only endpoint
- ✅ `frontend/components/dashboard/UsageWidget.tsx` (357 lines) — quota widget
- ✅ `frontend/app/(protected)/admin/page.tsx` (638 lines) — admin panel
- ✅ `frontend/components/notification/QuotaExceededHandler.tsx` (82 lines) — 429 toast

77+ evidence files in `.sisyphus/evidence/`.