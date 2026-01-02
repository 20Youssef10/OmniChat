# Launch Checklist

## Pre-Launch (T-Minus 2 Weeks)
- [ ] **QA**: Complete regression testing on all core features (Chat, Auth, Media, History).
- [ ] **Security**: Verify Firebase Security Rules prevent unauthorized access.
- [ ] **Performance**: Lighthouse score > 90 on all pages. TTI < 3s.
- [ ] **Legal**: Terms of Service and Privacy Policy pages accessible and up to date.
- [ ] **Infrastructure**: Firestore indexes configured. Quotas increased for Launch spike.
- [ ] **Backup**: Confirm Point-in-Time Recovery (PITR) is enabled for Firestore.
- [ ] **Analytics**: Verify event tracking is firing correctly for key conversion funnels.

## Launch Day (T-Minus 0)
- [ ] **Rollout**: Enable access for 10% of users (if feature flagged) or soft launch to waitlist.
- [ ] **Monitoring**: Staff on standby monitoring Error Rates (Sentry/Logs) and API Latency.
- [ ] **Marketing**: Publish announcement blog/social media posts.
- [ ] **Support**: Helpdesk channels open and staffed.
- [ ] **System Status**: Ensure `system/status` in DB is set to `{ maintenanceMode: false }`.

## Post-Launch (T-Plus 1 Week)
- [ ] **Review**: Analyze Daily Active Users (DAU), Retention, and Sign-up Conversion Rate.
- [ ] **Feedback**: Aggregate user feedback into "Quick Fix" sprint.
- [ ] **Optimization**: Address any immediate performance bottlenecks identified under load.
- [ ] **Communication**: Send "Thank you" email to early adopters with tips/tricks.