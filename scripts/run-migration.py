"""Run Supabase schema migration via Management API.
Reads SUPABASE_ACCESS_TOKEN from env, posts SQL file contents to
api.supabase.com/v1/projects/{ref}/database/query, prints status only.
The token never appears in stdout.
"""
import os
import sys
import json
import urllib.request
import urllib.error

PROJECT_REF = "hjuhjsaozuqezrivngfu"
SQL_PATH = sys.argv[1] if len(sys.argv) > 1 else "supabase/migrations/0002_truestory_v2.sql"
ENV_PATH = sys.argv[2] if len(sys.argv) > 2 else "/tmp/sb_migrate.env"


def load_env(path):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


load_env(ENV_PATH)

token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
if not token:
    print("ERROR: SUPABASE_ACCESS_TOKEN not in env")
    sys.exit(2)

with open(SQL_PATH, "r", encoding="utf-8") as f:
    sql = f.read()

url = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
body = json.dumps({"query": sql}).encode("utf-8")

req = urllib.request.Request(
    url,
    data=body,
    method="POST",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) trueStory-migration/1.0",
    },
)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        status = resp.status
        text = resp.read().decode("utf-8")
        print(f"HTTP {status}")
        # Only print first 2000 chars of response, never the request headers (token).
        print(text[:2000])
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}")
    print(e.read().decode("utf-8")[:2000])
except Exception as e:
    print(f"ERROR: {type(e).__name__}: {e}")
    sys.exit(1)
