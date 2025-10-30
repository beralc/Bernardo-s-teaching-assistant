# How "Grants Premium Access" Works

## The Checkbox in Admin Panel

When you generate an invitation code, you see:

```
☐ Grants Premium Access
```

And when checked:
```
Days of premium: [30]
```

## What Does This Mean?

### If UNCHECKED (Grants Premium = NO):
**User signs up with code → Gets FREE tier**
- 5 minutes/month (currently set for testing)
- Basic access only

**Example:**
- You generate code: `BETA2025`
- Grants Premium: ❌ NO
- Friend uses `BETA2025` to sign up
- Friend gets: **Free tier** (5 min/month)

### If CHECKED (Grants Premium = YES):
**User signs up with code → Gets PREMIUM tier automatically**
- 300 minutes/month
- Premium access for X days (you set this)
- After X days expire → Drops back to free tier

**Example:**
- You generate code: `VIP100`
- Grants Premium: ✅ YES
- Days: 90
- Friend uses `VIP100` to sign up
- Friend gets: **Premium tier** for 90 days (300 min/month)
- After 90 days → Automatically becomes free tier (5 min/month)

## Real-World Use Cases

### Use Case 1: Beta Testing (NO PREMIUM)
```
Code: BETA2025
Grants Premium: NO
Max Uses: 50

Result: 50 people can sign up, all get free tier (5 min/month)
Why: You want to test with regular users
```

### Use Case 2: VIP Access (PREMIUM)
```
Code: PRESS2025
Grants Premium: YES
Days: 30
Max Uses: 10

Result: 10 journalists get premium tier for 30 days
Why: You want them to fully test without limits
```

### Use Case 3: Founding Members (PREMIUM)
```
Code: FOUNDER
Grants Premium: YES
Days: 365
Max Uses: 100

Result: First 100 users get premium for 1 year
Why: Reward early supporters with premium access
```

### Use Case 4: Personal Friend (PREMIUM FOREVER)
```
Code: FORMOM
Grants Premium: YES
Days: 9999 (basically forever)
Max Uses: 1

Result: Your mom gets premium "forever"
Why: Special gift
```

## The "30 Days" Field

When you check "Grants Premium Access", a field appears:

```
Days of premium: [30]
```

**This means:** "How many days should they have premium access?"

- 30 = 1 month of premium
- 90 = 3 months of premium
- 365 = 1 year of premium
- 9999 = Basically permanent

After those days expire, they automatically drop back to free tier.

## How It Works Technically

When someone uses a premium code:

1. They sign up
2. System checks: Does this code grant premium?
3. If YES:
   - Set `tier = 'premium'` in database
   - Set `premium_until = today + X days`
   - User gets 300 min/month
4. If NO:
   - Set `tier = 'free'` in database
   - User gets 5 min/month

Every time they log in:
- System checks: Is premium_until > today?
- If NO → Downgrade to free tier automatically
- If YES → Keep premium tier

## Example Admin Workflow

**Scenario:** You want to give your friend premium for testing

1. Go to Admin tab
2. Generate code:
   - Prefix: `TESTJOHN`
   - Max Uses: 1
   - ☑️ Grants Premium Access
   - Days: 30
   - Description: "Premium test access for John"
3. Click "Generate Code"
4. Code created: `TESTJOHN8X2K9L`
5. Send to friend: "Hey John, use code `TESTJOHN8X2K9L` to sign up!"
6. John signs up → Gets premium tier for 30 days
7. After 30 days → Automatically becomes free tier

## Summary

**Grants Premium = NO** → User gets free tier (5 min/month)
**Grants Premium = YES** → User gets premium tier (300 min/month) for X days

It's a way to give special users better access without them paying.

---

**Your current setup:**
- Free tier: 5 minutes/month (for testing)
- Premium tier: 300 minutes/month
- Admin (you): Unlimited ✨
