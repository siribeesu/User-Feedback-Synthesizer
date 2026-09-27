import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
import random

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Fixed seed for deterministic, high-quality sample data
random.seed(42)

SAMPLE_ENTRIES = [
    # --- ONBOARDING FRICTION ---
    {
        "theme": "onboarding_friction",
        "title": "SMS verification code never arrives",
        "content": "Trying to sign up for my team on Android. The 6-digit SMS verification code never arrives, or takes 15 minutes by which time the session has timed out. I tried 4 times and gave up.",
        "rating": 1,
        "source": "Google Play",
        "segment": "Free Tier",
        "app_version": "v2.1",
        "date_offset_days": -85,
    },
    {
        "theme": "onboarding_friction",
        "title": "Google SSO infinite redirect loop",
        "content": "When clicking 'Continue with Google' during initial onboarding, the app opens Chrome, authenticates, redirects back, and shows 'Authentication Failed: invalid state'. Extremely frustrating first impression.",
        "rating": 2,
        "source": "App Store",
        "segment": "Growth",
        "app_version": "v2.2",
        "date_offset_days": -65,
    },
    {
        "theme": "onboarding_friction",
        "title": "Password requirements are hidden until you fail",
        "content": "Why doesn't the sign-up form show password requirements upfront? I entered my standard password, failed. Entered another, failed. Only after 3 errors did a tooltip show 'must include symbol and uppercase'. Fix this UX!",
        "rating": 2,
        "source": "Zendesk",
        "segment": "Free Tier",
        "app_version": "v2.2",
        "date_offset_days": -50,
    },
    {
        "theme": "onboarding_friction",
        "title": "Workspace invite link expired in 1 hour",
        "content": "Our admin invited 10 team members to our new workspace. 6 of them tried to join the next morning and all got 'Invitation link expired'. A 1-hour expiry on workspace invites makes zero sense for business onboarding.",
        "rating": 2,
        "source": "Intercom",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -25,
    },
    {
        "theme": "onboarding_friction",
        "title": "No guided tour for empty state",
        "content": "Just signed up. When you first enter the dashboard, it is completely blank with no dummy data, no checklist, and no explanation of what to do first. Took me 30 minutes just to figure out how to create a project.",
        "rating": 3,
        "source": "NPS Survey",
        "segment": "Pro Tier",
        "app_version": "v2.3",
        "date_offset_days": -12,
    },
    {
        "theme": "onboarding_friction",
        "title": "Onboarding wizard crashed on step 3",
        "content": "During the 'Select your industry' step of onboarding wizard on iOS, tapping Finance crashed the app immediately. Reopening brought me back to step 1.",
        "rating": 1,
        "source": "App Store",
        "segment": "Free Tier",
        "app_version": "v2.3",
        "date_offset_days": -5,
    },
    {
        "theme": "onboarding_friction",
        "title": "Sign up on mobile web is painful",
        "content": "The mobile web sign up form zoom-locks on iOS Safari when focusing on the phone number input. Had to switch to desktop to complete signup.",
        "rating": 2,
        "source": "Discord",
        "segment": "Growth",
        "app_version": "v2.2",
        "date_offset_days": -42,
    },
    {
        "theme": "onboarding_friction",
        "title": "Magic link email routed to spam folder",
        "content": "Sent 3 magic links to my corporate email address. None showed up in inbox, all were flagged as suspicious spam by Microsoft Defender because of poor SPF/DKIM alignment.",
        "rating": 2,
        "source": "Zendesk",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -18,
    },

    # --- PRICING & SUBSCRIPTION COMPLAINTS ---
    {
        "theme": "pricing_complaints",
        "title": "Stealth 40% price hike on annual renewal",
        "content": "My annual subscription just renewed at $299 instead of the $199 grandfathered rate with zero advance email warning. Support refused to honor the previous rate or issue a partial refund. That is deceptive billing.",
        "rating": 1,
        "source": "Zendesk",
        "segment": "Pro Tier",
        "app_version": "v2.2",
        "date_offset_days": -60,
    },
    {
        "theme": "pricing_complaints",
        "title": "Paywalling CSV export is ridiculous",
        "content": "You let users input their data for free, but downloading a simple CSV export now triggers an upgrade modal demanding $49/mo. Data hostage pricing model is completely predatory.",
        "rating": 1,
        "source": "App Store",
        "segment": "Free Tier",
        "app_version": "v2.2",
        "date_offset_days": -55,
    },
    {
        "theme": "pricing_complaints",
        "title": "No monthly billing option for Starter plan",
        "content": "I only need the software for a 2-month consulting project. Forcing me to pay $360 for an entire year upfront is making me look elsewhere. Please offer a true monthly billing toggle.",
        "rating": 2,
        "source": "Intercom",
        "segment": "Growth",
        "app_version": "v2.1",
        "date_offset_days": -78,
    },
    {
        "theme": "pricing_complaints",
        "title": "5 seat minimum on Enterprise tier is too steep",
        "content": "We need SSO and audit logs, but we are a boutique 3-person healthcare firm. Requiring a 10-seat minimum at $80/seat/mo ($800/mo total) prices out small compliance-regulated businesses.",
        "rating": 2,
        "source": "Zendesk",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -30,
    },
    {
        "theme": "pricing_complaints",
        "title": "Charged twice after upgrade button lagged",
        "content": "When upgrading to Pro, the confirmation button didn't give any visual loading feedback. I clicked twice, and checking Stripe statement I was billed twice for the same subscription.",
        "rating": 1,
        "source": "Google Play",
        "segment": "Pro Tier",
        "app_version": "v2.3",
        "date_offset_days": -22,
    },
    {
        "theme": "pricing_complaints",
        "title": "Unclear overage pricing for API credits",
        "content": "Received an unexpected $140 overage bill on our credit card. The pricing page says 'Fair use applies' but does not state the per-thousand API call rate anywhere.",
        "rating": 2,
        "source": "Discord",
        "segment": "Growth",
        "app_version": "v2.3",
        "date_offset_days": -14,
    },
    {
        "theme": "pricing_complaints",
        "title": "Refund policy is hostile",
        "content": "Cancelled within 4 hours of accidental renewal because we migrated away. Support cited strict 'no refunds under any circumstance' terms. Very hostile customer policy.",
        "rating": 1,
        "source": "NPS Survey",
        "segment": "Pro Tier",
        "app_version": "v2.2",
        "date_offset_days": -48,
    },

    # --- FEATURE REQUESTS: DATA EXPORT & INTEGRATIONS ---
    {
        "theme": "feature_requests_exports",
        "title": "Need raw CSV and Excel export for analytics",
        "content": "Our management requires weekly Excel spreadsheets. Currently we have to copy-paste tables manually. Please add an automated 'Export to CSV / XLSX' button on all report pages.",
        "rating": 4,
        "source": "Intercom",
        "segment": "Enterprise",
        "app_version": "v2.1",
        "date_offset_days": -80,
    },
    {
        "theme": "feature_requests_exports",
        "title": "Webhook triggers on new feedback items",
        "content": "Would love an outbound webhook whenever a negative review or high-priority ticket is synthesized, so our on-call engineering team can receive automated Slack alerts via Zapier.",
        "rating": 5,
        "source": "Discord",
        "segment": "Growth",
        "app_version": "v2.2",
        "date_offset_days": -62,
    },
    {
        "theme": "feature_requests_exports",
        "title": "PDF executive summary export",
        "content": "Can you generate a clean branded PDF summary with charts and top quotes? I need to present feedback insights to our VP of Product every Monday morning without taking screenshots.",
        "rating": 4,
        "source": "NPS Survey",
        "segment": "Enterprise",
        "app_version": "v2.2",
        "date_offset_days": -45,
    },
    {
        "theme": "feature_requests_exports",
        "title": "REST API endpoint to query synthesis results",
        "content": "We want to pull synthesized mental model observations programmatically into our internal BI Metabase dashboards. A simple GET /api/v1/digest JSON endpoint would be awesome.",
        "rating": 4,
        "source": "Discord",
        "segment": "Pro Tier",
        "app_version": "v2.3",
        "date_offset_days": -20,
    },
    {
        "theme": "feature_requests_exports",
        "title": "Direct integration with Notion database",
        "content": "Is there a Notion sync on the roadmap? We track all customer feature requests in Notion and having synthesized themes sync automatically would save hours of triage.",
        "rating": 5,
        "source": "App Store",
        "segment": "Growth",
        "app_version": "v2.3",
        "date_offset_days": -10,
    },
    {
        "theme": "feature_requests_exports",
        "title": "Bulk export of historical raw feedback",
        "content": "Need to be able to dump all historical feedback records with sentiment tags and source metadata into a zipped JSON file for offline compliance archiving.",
        "rating": 4,
        "source": "Zendesk",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -8,
    },

    # --- TEMPORAL SENTIMENT FLIP: CHECKOUT & STABILITY ---
    # Phase 1: v2.1 & v2.2 Praise (June to early August 2026) -> 5 Stars
    {
        "theme": "checkout_stability",
        "title": "Checkout is lightning fast!",
        "content": "The one-tap checkout with Apple Pay is buttery smooth! Literally completed payment in under 3 seconds without having to type my address. Best shopping UX in this category.",
        "rating": 5,
        "source": "App Store",
        "segment": "Pro Tier",
        "app_version": "v2.1",
        "date_offset_days": -88,
    },
    {
        "theme": "checkout_stability",
        "title": "Flawless payment experience",
        "content": "Purchased the annual plan with my European Visa card. Seamless 3D-Secure modal and instant receipt in my inbox. Very polished payment flow.",
        "rating": 5,
        "source": "Google Play",
        "segment": "Growth",
        "app_version": "v2.2",
        "date_offset_days": -70,
    },
    {
        "theme": "checkout_stability",
        "title": "Rock solid app stability in v2.2",
        "content": "Version 2.2 has been super reliable. No crashes, instant transitions between tabs, and smooth checkout. Great work engineering team!",
        "rating": 5,
        "source": "App Store",
        "segment": "Free Tier",
        "app_version": "v2.2",
        "date_offset_days": -52,
    },
    {
        "theme": "checkout_stability",
        "title": "Payment gateway works reliably worldwide",
        "content": "We tested checkout from Japan, Germany, and the US with different currencies. Currency conversion and local tax calculation worked seamlessly.",
        "rating": 5,
        "source": "Zendesk",
        "segment": "Enterprise",
        "app_version": "v2.2",
        "date_offset_days": -46,
    },

    # Phase 2: Post v2.3 Release (Mid-August to September 2026) -> Severe Drop to 1 Star
    {
        "theme": "checkout_stability",
        "title": "v2.3 release completely broke checkout!",
        "content": "Ever since updating to v2.3 on August 16th, clicking 'Complete Purchase' displays a spinning spinner for 60 seconds and then crashes with 'HTTP 504 Gateway Timeout'. We cannot accept any client orders!",
        "rating": 1,
        "source": "App Store",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -38,
    },
    {
        "theme": "checkout_stability",
        "title": "Card charged twice but order failed in v2.3",
        "content": "Updated to v2.3 yesterday. Tried to check out, got an error banner 'Transaction declined', but my bank sent two SMS notifications showing $120 charged twice! Where is my order?!",
        "rating": 1,
        "source": "Google Play",
        "segment": "Pro Tier",
        "app_version": "v2.3",
        "date_offset_days": -35,
    },
    {
        "theme": "checkout_stability",
        "title": "App crashes immediately on Payment screen after update v2.3",
        "content": "Running v2.3 on iOS 19. Tapping 'Pay with Card' causes an immediate hard crash to home screen. 100% reproducible every single time. Reinstalling did not fix it.",
        "rating": 1,
        "source": "App Store",
        "segment": "Growth",
        "app_version": "v2.3",
        "date_offset_days": -30,
    },
    {
        "theme": "checkout_stability",
        "title": "EU 3DS authentication hangs indefinitely in v2.3",
        "content": "In v2.3, the banking 3D Secure modal never loads for European credit cards. It gets stuck on a blank white popup. Lost 4 high-value orders today because buyers couldn't pay.",
        "rating": 1,
        "source": "Zendesk",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -24,
    },
    {
        "theme": "checkout_stability",
        "title": "Horrible v2.3 update - rollback immediately!",
        "content": "Checkout was 5/5 stars before, now in v2.3 it's completely unusable. Memory leak causes the device to overheat and freeze when viewing the cart. Please roll back v2.3!",
        "rating": 1,
        "source": "Google Play",
        "segment": "Pro Tier",
        "app_version": "v2.3",
        "date_offset_days": -16,
    },
    {
        "theme": "checkout_stability",
        "title": "Payment gateway timeout on checkout button",
        "content": "Customer service says they are working on it, but our store checkout has been failing with gateway timeout on v2.3 for 4 days straight. We are losing thousands in revenue.",
        "rating": 1,
        "source": "Intercom",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -9,
    },
    {
        "theme": "checkout_stability",
        "title": "Checkout error code ERR_PAYMENT_NONCE_STALE",
        "content": "On v2.3 checkout screen, submitting payment fails with error ERR_PAYMENT_NONCE_STALE. App is failing to refresh payment tokens after 30 seconds of inactivity.",
        "rating": 1,
        "source": "Discord",
        "segment": "Growth",
        "app_version": "v2.3",
        "date_offset_days": -3,
    },

    # --- CHURN SIGNALS & CANCELLATIONS ---
    {
        "theme": "churn_signals",
        "title": "Cancelling 25 enterprise seats due to v2.3 bugs",
        "content": "Our procurement department has officially initiated termination of our 25-seat enterprise agreement. The downtime and checkout crashes on v2.3 without timely rollback showed our business operations are at risk.",
        "rating": 1,
        "source": "Zendesk",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -15,
    },
    {
        "theme": "churn_signals",
        "title": "Migrated our team to Competitor X",
        "content": "After 2 weeks of unresolved pricing disputes and unresponsive support, our team spent the weekend migrating our workflow to Competitor X. Bye.",
        "rating": 1,
        "source": "NPS Survey",
        "segment": "Growth",
        "app_version": "v2.3",
        "date_offset_days": -20,
    },
    {
        "theme": "churn_signals",
        "title": "Support ghosted us for 9 days on critical bug",
        "content": "We had a critical production blocker ticket open for 9 business days with only automated bot replies. We cannot run our company on tools with nonexistent support. Cancelling renewal.",
        "rating": 1,
        "source": "Intercom",
        "segment": "Enterprise",
        "app_version": "v2.3",
        "date_offset_days": -7,
    },
    {
        "theme": "churn_signals",
        "title": "Price hike was the final straw",
        "content": "40% price jump combined with frequent v2.3 crashes made this an easy decision. Just disabled auto-renew. Too many good alternatives on the market now.",
        "rating": 1,
        "source": "App Store",
        "segment": "Pro Tier",
        "app_version": "v2.3",
        "date_offset_days": -4,
    },

    # --- DARK MODE & UI / ACCESSIBILITY ---
    {
        "theme": "ui_accessibility",
        "title": "Dark mode contrast is unreadable in daylight",
        "content": "The new dark mode uses dark grey text (#555555) on a #121212 background. Outdoors in direct sunlight, it is literally impossible to read without straining eyes. Please use higher contrast #E0E0E0 text.",
        "rating": 2,
        "source": "Google Play",
        "segment": "Free Tier",
        "app_version": "v2.2",
        "date_offset_days": -58,
    },
    {
        "theme": "ui_accessibility",
        "title": "Charts have zero contrast in dark theme",
        "content": "In dark mode, the metric line chart uses dark navy and dark purple lines that completely vanish against the charcoal card background. Light mode is fine, but dark mode palette needs an accessibility overhaul.",
        "rating": 3,
        "source": "App Store",
        "segment": "Pro Tier",
        "app_version": "v2.3",
        "date_offset_days": -28,
    },
    {
        "theme": "ui_accessibility",
        "title": "Font size doesn't respect iOS Dynamic Type",
        "content": "I have vision impairment and use enlarged system fonts on iOS. This app ignores system Dynamic Type settings completely; text remains microscopic 11pt.",
        "rating": 2,
        "source": "App Store",
        "segment": "Free Tier",
        "app_version": "v2.1",
        "date_offset_days": -82,
    },
]

# Expand to 75 items by synthesizing realistic variations spanning users and timestamps
USER_NAMES = [
    "Alex Mercer", "Bianca Patel", "Carlos Mendez", "David Kim", "Elena Rostova",
    "Fatima Al-Mansoor", "Gabriel Torres", "Hannah Abbott", "Ian McGregor", "Jessica Wu",
    "Kevin O'Connor", "Liam Vance", "Maya Lin", "Nathaniel Drake", "Olivia Chen",
    "Priya Sharma", "Quinn Bailey", "Rachel Green", "Samir Khan", "Tara Connelly"
]

def generate_dataset(target_count: int = 75):
    reference_date = datetime(2026, 9, 26, 12, 0, 0)
    items = []
    
    # First include all core crafted items
    idx = 1
    for template in SAMPLE_ENTRIES:
        user_name = random.choice(USER_NAMES)
        user_id = f"usr_{random.randint(1001, 9999)}"
        timestamp = reference_date + timedelta(days=template["date_offset_days"], hours=random.randint(1, 23), minutes=random.randint(0, 59))
        
        items.append({
            "id": f"FB-{idx:04d}",
            "timestamp": timestamp.isoformat() + "Z",
            "source": template["source"],
            "user_id": user_id,
            "user_name": user_name,
            "segment": template["segment"],
            "rating": template["rating"],
            "title": template["title"],
            "content": template["content"],
            "theme": template["theme"],
            "app_version": template["app_version"],
        })
        idx += 1

    # Now generate realistic supporting items to reach target_count
    theme_generators = [
        # Additional Onboarding
        lambda: {
            "theme": "onboarding_friction",
            "title": f"Sign-up verification lag on {random.choice(['mobile', 'tablet', 'desktop'])}",
            "content": f"Waited over {random.randint(8, 25)} minutes for the account activation email to arrive. Almost gave up and closed the browser.",
            "rating": random.choice([1, 2]),
            "source": random.choice(["Google Play", "App Store", "Intercom"]),
            "segment": random.choice(["Free Tier", "Growth"]),
            "app_version": random.choice(["v2.1", "v2.2", "v2.3"]),
            "date_offset_days": random.randint(-90, -5),
        },
        # Additional Pricing
        lambda: {
            "theme": "pricing_complaints",
            "title": f"Subscription tier {random.choice(['limits are too tight', 'pricing increase without notice', 'invoice lacks VAT details'])}",
            "content": f"The sudden pricing changes for {random.choice(['team workspaces', 'API usage limits', 'pro features'])} made our monthly invoice jump unexpectedly. Needs clearer communication.",
            "rating": random.choice([1, 2]),
            "source": random.choice(["Zendesk", "NPS Survey", "Discord"]),
            "segment": random.choice(["Growth", "Pro Tier", "Enterprise"]),
            "app_version": random.choice(["v2.2", "v2.3"]),
            "date_offset_days": random.randint(-70, -3),
        },
        # Additional Feature Requests
        lambda: {
            "theme": "feature_requests_exports",
            "title": f"Export request: {random.choice(['automated weekly S3 dump', 'PowerBI connector', 'custom CSV column mapping', 'Google Sheets live sync'])}",
            "content": f"We really need {random.choice(['automated export to CSV/JSON', 'direct webhook integration to Slack', 'scheduled PDF email reports'])} to streamline our team workflow.",
            "rating": random.choice([4, 5]),
            "source": random.choice(["Discord", "Intercom", "App Store"]),
            "segment": random.choice(["Pro Tier", "Enterprise"]),
            "app_version": random.choice(["v2.2", "v2.3"]),
            "date_offset_days": random.randint(-80, -2),
        },
        # Additional Checkout Bugs (post v2.3)
        lambda: {
            "theme": "checkout_stability",
            "title": f"v2.3 checkout bug: {random.choice(['Stripe gateway timeout', 'payment button freezes device', 'card authentication fails repeatedly'])}",
            "content": f"Ever since upgrading to release v2.3, completing purchases has been broken. {random.choice(['Screen turns blank on submit', 'Spinner loops forever with 504 error', 'Card charged but cart stays full'])}. This used to work perfectly in v2.2!",
            "rating": 1,
            "source": random.choice(["App Store", "Google Play", "Zendesk"]),
            "segment": random.choice(["Enterprise", "Growth", "Pro Tier"]),
            "app_version": "v2.3",
            "date_offset_days": random.randint(-35, -1),
        },
        # Pre v2.3 checkout praise
        lambda: {
            "theme": "checkout_stability",
            "title": f"Fast and effortless payment in {random.choice(['v2.1', 'v2.2'])}",
            "content": f"Super easy purchase flow. Apple Pay and credit card checkout worked instantaneously with zero friction.",
            "rating": 5,
            "source": random.choice(["App Store", "Google Play"]),
            "segment": random.choice(["Free Tier", "Pro Tier"]),
            "app_version": random.choice(["v2.1", "v2.2"]),
            "date_offset_days": random.randint(-90, -45),
        },
        # Additional Churn
        lambda: {
            "theme": "churn_signals",
            "title": f"Cancelling subscription: {random.choice(['too many regressions in v2.3', 'unresponsive customer support', 'found cheaper alternative with better uptime'])}",
            "content": f"Our company is discontinuing use due to {random.choice(['repeated checkout failures and lost revenue', 'unacceptable support response lag', 'unannounced tier price increases'])}. We have migrated our team.",
            "rating": 1,
            "source": random.choice(["NPS Survey", "Zendesk", "Intercom"]),
            "segment": random.choice(["Enterprise", "Growth"]),
            "app_version": "v2.3",
            "date_offset_days": random.randint(-25, -2),
        },
    ]

    while len(items) < target_count:
        gen = random.choice(theme_generators)
        template = gen()
        user_name = random.choice(USER_NAMES)
        user_id = f"usr_{random.randint(1001, 9999)}"
        timestamp = reference_date + timedelta(days=template["date_offset_days"], hours=random.randint(1, 23), minutes=random.randint(0, 59))
        
        items.append({
            "id": f"FB-{idx:04d}",
            "timestamp": timestamp.isoformat() + "Z",
            "source": template["source"],
            "user_id": user_id,
            "user_name": user_name,
            "segment": template["segment"],
            "rating": template["rating"],
            "title": template["title"],
            "content": template["content"],
            "theme": template["theme"],
            "app_version": template["app_version"],
        })
        idx += 1

    # Sort chronologically by timestamp
    items.sort(key=lambda x: x["timestamp"])
    return items


def main():
    items = generate_dataset(75)
    
    # Save as JSON
    json_path = DATA_DIR / "sample_feedback.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2)
    print(f"Generated {len(items)} sample feedback items in {json_path}")

    # Save as CSV
    csv_path = DATA_DIR / "sample_feedback.csv"
    fieldnames = list(items[0].keys())
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(items)
    print(f"Generated {len(items)} sample feedback items in {csv_path}")


if __name__ == "__main__":
    main()
