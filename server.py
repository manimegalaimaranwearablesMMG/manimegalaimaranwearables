"""
Mahadev Fashion Hub - Local Backend Server
Handles all GitHub operations automatically. Admin panel never sees the token.
"""
import os
import json
import base64
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError


ENV_FILE = ".env"
PRODUCTS = "products.json"
PORT = 5000


# ─────────────────────────────────────────────
# Load .env
# ─────────────────────────────────────────────
def load_env():
    env = {}
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
GH_USER = ENV.get("GITHUB_USER", "")
GH_REPO = ENV.get("GITHUB_REPO", "")
GH_TOKEN = ENV.get("GITHUB_TOKEN", "")
GH_BRANCH = ENV.get("GITHUB_BRANCH", "main")


# ─────────────────────────────────────────────
# GitHub API helpers
# ─────────────────────────────────────────────
def gh_get_sha():
    """Get current products.json SHA from GitHub (needed for update)."""
    url = f"https://api.github.com/repos/{GH_USER}/{GH_REPO}/contents/{PRODUCTS}?ref={GH_BRANCH}"
    req = Request(url, headers={
        "Authorization": f"Bearer {GH_TOKEN}",
        "Accept": "application/vnd.github+json"
    })
    try:
        with urlopen(req) as r:
            return json.loads(r.read())["sha"]
    except HTTPError as e:
        if e.code == 404:
            return None
        raise


def gh_push(content_str, commit_msg):
    """Push products.json to GitHub via API."""
    sha = gh_get_sha()
    content_b64 = base64.b64encode(content_str.encode("utf-8")).decode("ascii")

    body = {
        "message": commit_msg,
        "content": content_b64,
        "branch": GH_BRANCH
    }
    if sha:
        body["sha"] = sha

    url = f"https://api.github.com/repos/{GH_USER}/{GH_REPO}/contents/{PRODUCTS}"
    req = Request(url, method="PUT", data=json.dumps(body).encode("utf-8"), headers={
        "Authorization": f"Bearer {GH_TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
    })
    with urlopen(req) as r:
        return json.loads(r.read())


# ─────────────────────────────────────────────
# HTTP Request Handler
# ─────────────────────────────────────────────
class Handler(SimpleHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        # Health check
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({
                "ok": True,
                "user": GH_USER,
                "repo": GH_REPO,
                "branch": GH_BRANCH,
                "token_set": bool(GH_TOKEN)
            }).encode())
            return
        # Serve static files normally (admin.html, index.html, etc.)
        return super().do_GET()

    def do_POST(self):
        # ── Save catalog → local + GitHub (auto) ──
        if self.path == "/save":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length).decode("utf-8")

            try:
                data = json.loads(raw)
            except Exception:
                self._json(400, {"ok": False, "error": "Invalid JSON"})
                return

            # 1. Write locally
            with open(PRODUCTS, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            # 2. Push to GitHub
            try:
                pretty = json.dumps(data, indent=2, ensure_ascii=False)
                commit_msg = f"Admin update: {len(data)} products"
                result = gh_push(pretty, commit_msg)
                self._json(200, {
                    "ok": True,
                    "message": "Saved & pushed to GitHub",
                    "commit": result.get("commit", {}).get("sha", "")[:7]
                })
            except HTTPError as e:
                err_body = e.read().decode()
                self._json(500, {"ok": False, "error": f"GitHub: {err_body}"})
            except Exception as e:
                self._json(500, {"ok": False, "error": str(e)})
            return

        self._json(404, {"ok": False, "error": "Not found"})

    def _json(self, code, obj):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps(obj).encode())

    def log_message(self, fmt, *args):
        print(f"[server] {self.address_string()} - {fmt % args}")


# ─────────────────────────────────────────────
# Boot
# ─────────────────────────────────────────────
def main():
    print("=" * 60)
    print("🔱 MAHADEV FASHION HUB — BACKEND SERVER")
    print("=" * 60)
    if not GH_TOKEN:
        print("⚠️  No GITHUB_TOKEN in .env — push will fail.")
    else:
        print(f"✅ GitHub: {GH_USER}/{GH_REPO} @ {GH_BRANCH}")
    print(f"🌐 Open:   http://localhost:{PORT}/admin.html")
    print(f"🛍️  Store:  http://localhost:{PORT}/index.html")
    print(f"❤️  Health: http://localhost:{PORT}/health")
    print("=" * 60)
    print("Press Ctrl+C to stop.\n")

    httpd = HTTPServer(("0.0.0.0", PORT), Handler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Stopped.")


if __name__ == "__main__":
    main()