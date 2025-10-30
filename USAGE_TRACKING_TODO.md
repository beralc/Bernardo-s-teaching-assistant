# Usage Tracking Implementation - TODO

## Current Status

The invitation code system is **complete and functional**. Users can sign up with codes, and admins can manage codes via the dashboard.

However, **usage tracking for tier limits is NOT yet implemented**. Right now:
- ✅ Users have tiers (free, premium)
- ✅ Database has usage tracking tables
- ❌ Voice conversations are NOT being logged for usage limits
- ❌ No monthly limits enforced
- ❌ Users can talk unlimited (costs could spiral!)

## Why This Matters

**The Cost Problem:**
- OpenAI Realtime API costs ~$0.06/minute
- 15-minute conversation = $0.90
- 100 users × 10 min/day = $18,000/month

**Without limits, your costs are unbounded.**

## What Needs to Be Done

### Phase 1: Log Voice Usage (30 minutes of work)

**File:** `frontend/frontend-app/src/App.js`

**Modify the `endSession()` function** (currently at line 114):

```javascript
async function endSession() {
  if (!sessionLogId || !sessionStartTime) return;

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const endTime = new Date();
  const durationMinutes = Math.round((endTime.getTime() - sessionStartTime.getTime()) / (1000 * 60));

  // Update conversation session
  const { data, error } = await supabase
    .from('conversation_sessions')
    .update({
      ended_at: endTime.toISOString(),
      duration_minutes: durationMinutes
    })
    .eq('id', sessionLogId);

  if (error) {
    console.error('Error ending session:', error.message);
  } else {
    console.log('Session ended. Duration:', durationMinutes, 'minutes');

    // NEW: Log usage and update monthly total
    const costUsd = durationMinutes * 0.06; // $0.06 per minute

    // Insert usage log
    await supabase
      .from('usage_logs')
      .insert([{
        user_id: user.id,
        action_type: 'voice_conversation',
        duration_minutes: durationMinutes,
        cost_usd: costUsd,
        metadata: { session_id: sessionLogId }
      }]);

    // Update user's monthly total
    const { data: profile } = await supabase
      .from('profiles')
      .select('monthly_voice_minutes_used')
      .eq('id', user.id)
      .single();

    const currentUsage = profile?.monthly_voice_minutes_used || 0;
    await supabase
      .from('profiles')
      .update({
        monthly_voice_minutes_used: currentUsage + durationMinutes
      })
      .eq('id', user.id);

    console.log(`Total usage this month: ${currentUsage + durationMinutes} minutes`);
  }

  sessionLogId = null;
  sessionStartTime = null;
}
```

### Phase 2: Enforce Tier Limits (60 minutes of work)

**Define tier limits** at the top of App.js:

```javascript
const TIER_LIMITS = {
  free: {
    monthlyMinutes: 30,  // 30 minutes per month = ~$1.80 cost
    sessionsPerWeek: 10
  },
  premium: {
    monthlyMinutes: 300,  // 300 minutes per month = ~$18 cost
    sessionsPerWeek: -1  // unlimited
  },
  enterprise: {
    monthlyMinutes: -1,  // unlimited
    sessionsPerWeek: -1
  }
};
```

**Add limit checking to TalkView** before starting voice:

```javascript
const [userTier, setUserTier] = useState('free');
const [usageRemaining, setUsageRemaining] = useState(30);
const [limitReached, setLimitReached] = useState(false);

useEffect(() => {
  loadUsageInfo();
}, []);

const loadUsageInfo = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, monthly_voice_minutes_used, premium_until')
    .eq('id', user.id)
    .single();

  if (!profile) return;

  // Check if premium expired
  let currentTier = profile.tier || 'free';
  if (currentTier === 'premium' && profile.premium_until) {
    if (new Date(profile.premium_until) < new Date()) {
      // Premium expired, downgrade to free
      currentTier = 'free';
      await supabase
        .from('profiles')
        .update({ tier: 'free' })
        .eq('id', user.id);
    }
  }

  setUserTier(currentTier);

  const used = profile.monthly_voice_minutes_used || 0;
  const limit = TIER_LIMITS[currentTier].monthlyMinutes;

  if (limit === -1) {
    setUsageRemaining(-1); // unlimited
    setLimitReached(false);
  } else {
    const remaining = Math.max(0, limit - used);
    setUsageRemaining(remaining);
    setLimitReached(remaining === 0);
  }
};

// Modify startListening to check limits
const startListening = async () => {
  if (limitReached) {
    alert('You have reached your monthly voice conversation limit. Please upgrade to premium or wait until next month.');
    return;
  }

  // ... existing startListening code
};
```

**Add usage display to TalkView UI:**

```javascript
{limitReached && (
  <div className="bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-xl p-4 mb-4">
    <h3 className="font-bold text-orange-800 dark:text-orange-100">Monthly Limit Reached</h3>
    <p className="text-sm text-orange-700 dark:text-orange-200 mt-1">
      You've used all {TIER_LIMITS[userTier].monthlyMinutes} minutes this month.
      Upgrade to premium for 300 minutes/month, or wait until {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString()}.
    </p>
  </div>
)}

{!limitReached && usageRemaining !== -1 && (
  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-4">
    <div className="flex items-center justify-between text-sm">
      <span className="text-blue-700 dark:text-blue-200">
        {usageRemaining} minutes remaining this month
      </span>
      <button className="text-blue-600 dark:text-blue-300 hover:underline font-semibold">
        Upgrade
      </button>
    </div>
  </div>
)}
```

### Phase 3: Monthly Reset (30 minutes of work)

**Option A: Manual Reset (Simple)**

Run this SQL query on the 1st of each month:

```sql
SELECT reset_monthly_usage();
```

**Option B: Automated Reset (Recommended)**

Create a Supabase Edge Function:

1. In Supabase Dashboard → Edge Functions → Create new function `reset-monthly-usage`
2. Add this code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { error } = await supabaseClient.rpc('reset_monthly_usage')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

3. Set up a cron job in Supabase Dashboard → Database → Cron Jobs:
   - Schedule: `0 0 1 * *` (runs at midnight on 1st of month)
   - Function: `reset-monthly-usage`

### Phase 4: Show Usage in Profile (15 minutes)

**Add to AccountModal "Personal" tab:**

```javascript
// Load usage stats
const [usageStats, setUsageStats] = useState({ used: 0, limit: 30, tier: 'free' });

useEffect(() => {
  loadUsageStats();
}, []);

const loadUsageStats = async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, monthly_voice_minutes_used')
    .eq('id', user.id)
    .single();

  if (profile) {
    const limit = TIER_LIMITS[profile.tier || 'free'].monthlyMinutes;
    setUsageStats({
      used: profile.monthly_voice_minutes_used || 0,
      limit: limit,
      tier: profile.tier || 'free'
    });
  }
};

// Add this UI in the Personal tab
<div className="pt-4 border-t border-gray-200 dark:border-gray-700">
  <p className={`text-sm font-semibold ${subtleText} mb-1`}>Current Plan</p>
  <div className="flex items-center gap-2 mb-3">
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${usageStats.tier === 'premium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100' : 'bg-gray-100 dark:bg-gray-800'}`}>
      {usageStats.tier === 'premium' ? 'Premium' : 'Free'}
    </span>
  </div>

  <p className={`text-sm font-semibold ${subtleText} mb-1`}>Voice Minutes This Month</p>
  <div className="flex items-center gap-3">
    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
      <div
        className="bg-green-600 h-3 rounded-full transition-all"
        style={{ width: `${Math.min(100, (usageStats.used / usageStats.limit) * 100)}%` }}
      />
    </div>
    <span className="text-sm font-semibold">
      {usageStats.used} / {usageStats.limit === -1 ? '∞' : usageStats.limit}
    </span>
  </div>
</div>
```

## Implementation Timeline

**Recommended order:**

1. **Week 1:** Phase 1 (Logging) + Phase 2 (Limits)
   - Most critical to prevent runaway costs
   - Can deploy immediately

2. **Week 2:** Phase 3 (Monthly Reset) + Phase 4 (Display)
   - Nice-to-have improvements
   - Better user experience

## Testing Checklist

After implementing:

- [ ] Start voice conversation
- [ ] Talk for 1-2 minutes
- [ ] Stop conversation
- [ ] Check Supabase `usage_logs` table → Entry exists
- [ ] Check `profiles` → `monthly_voice_minutes_used` incremented
- [ ] Manually set your usage to limit - 1
- [ ] Try starting new conversation → Should allow
- [ ] Manually set your usage to limit
- [ ] Try starting new conversation → Should block
- [ ] Check Account Settings → Usage bar shows correct %

## Cost Projections with Limits

### Free Tier (30 min/month)
```
Cost per user: 30 min × $0.06 = $1.80/month
100 users = $180/month
1000 users = $1,800/month
```

### Premium Tier (300 min/month)
```
Cost per user: 300 min × $0.06 = $18/month
Charge: $29-39/month
Profit: $11-21/user
100 users = $1,100-2,100/month profit
```

### Enterprise/B2B (Unlimited)
```
Charge based on actual usage + margin
Monthly invoice with per-minute pricing
Or flat fee with soft limits
```

## Alternative: Soft Limits

Instead of hard blocking, consider **soft limits with warnings**:

```javascript
// At 80% usage
if (usageRemaining < TIER_LIMITS[userTier].monthlyMinutes * 0.2) {
  showWarning(`You've used 80% of your monthly minutes. Consider upgrading to premium.`);
}

// At 100% usage - allow but warn
if (limitReached) {
  const confirmed = confirm('You have reached your monthly limit. Additional usage may incur charges or require an upgrade. Continue?');
  if (!confirmed) return;
}
```

This improves UX while still making users aware of limits.

## Related Files

- `INVITATION_SYSTEM.sql` - Database setup (already has usage_logs table)
- `frontend/frontend-app/src/App.js` - Where to implement tracking
- `NOTES.md` - Business strategy and cost analysis
- `INSTRUCTIONS.md` - Full launch plan

---

**Status:** 🚧 Not Yet Implemented

**Estimated time:** 2-3 hours total

**Priority:** HIGH (cost risk without this)

Last updated: January 29, 2025
