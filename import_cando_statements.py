"""
Import CEFR Can-Do statements into Supabase database
Run this script once after creating the database schema
"""

import json
import os
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: Missing environment variables!")
    print("   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file")
    exit(1)

print("="*80)
print("CEFR Can-Do Statements Import Script")
print("="*80)

# Load filtered statements
print("\n📂 Loading filtered CEFR statements...")
with open('cefr_statements_filtered.json', 'r', encoding='utf-8') as f:
    statements = json.load(f)

print(f"✅ Loaded {len(statements)} statements")

# Prepare data for import
print("\n🔄 Preparing data for Supabase...")
import_data = []

for idx, stmt in enumerate(statements):
    # Extract keywords from descriptor for AI detection
    # Simple keyword extraction: remove common words, split
    descriptor_lower = stmt['descriptor'].lower()

    # Remove common words to extract meaningful keywords
    common_words = {'can', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'shall'}

    words = descriptor_lower.split()
    keywords = [w.strip(',.!?;:') for w in words if len(w) > 3 and w not in common_words]
    # Take first 10 unique keywords
    keywords = list(dict.fromkeys(keywords))[:10]

    import_data.append({
        "level": stmt['level'],
        "skill_type": stmt['skill_type'],
        "mode": stmt['mode'],
        "activity": stmt['activity'],
        "scale": stmt['scale'] if stmt['scale'] else None,
        "descriptor": stmt['descriptor'],
        "keywords": keywords,
        "display_order": idx + 1
    })

print(f"✅ Prepared {len(import_data)} records for import")

# Import to Supabase in batches
print("\n📤 Importing to Supabase...")
headers = {
    'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    'apikey': SUPABASE_SERVICE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}

# Delete existing statements first (optional - uncomment if you want to replace all)
# print("⚠️  Deleting existing statements...")
# delete_resp = requests.delete(
#     f'{SUPABASE_URL}/rest/v1/cando_statements',
#     headers=headers,
#     params={'id': 'not.is.null'}  # Delete all
# )
# if delete_resp.status_code in [200, 204]:
#     print("✅ Existing statements deleted")

# Batch size for import
BATCH_SIZE = 50
total_batches = (len(import_data) + BATCH_SIZE - 1) // BATCH_SIZE
imported_count = 0
failed_count = 0

for batch_num in range(total_batches):
    start_idx = batch_num * BATCH_SIZE
    end_idx = min((batch_num + 1) * BATCH_SIZE, len(import_data))
    batch = import_data[start_idx:end_idx]

    print(f"  Batch {batch_num + 1}/{total_batches}: Importing {len(batch)} statements...", end=" ")

    try:
        resp = requests.post(
            f'{SUPABASE_URL}/rest/v1/cando_statements',
            headers=headers,
            json=batch
        )

        if resp.status_code in [200, 201]:
            imported_count += len(batch)
            print(f"✅ Success")
        else:
            failed_count += len(batch)
            print(f"❌ Failed: {resp.status_code}")
            print(f"     Error: {resp.text}")

    except Exception as e:
        failed_count += len(batch)
        print(f"❌ Exception: {str(e)}")

print("\n" + "="*80)
print("Import Summary")
print("="*80)
print(f"✅ Successfully imported: {imported_count} statements")
if failed_count > 0:
    print(f"❌ Failed to import: {failed_count} statements")
print("="*80)

if failed_count == 0:
    print("\n🎉 Import completed successfully!")
    print("\nNext steps:")
    print("  1. Verify data in Supabase dashboard")
    print("  2. Implement backend API for Can-Do detection")
    print("  3. Build frontend Can-Do checklist UI")
else:
    print("\n⚠️  Import completed with errors. Please check the error messages above.")
