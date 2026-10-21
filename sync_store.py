import json
)import json
import subprocess
import os

PRODUCTS_FILE = "products.json"
ENV_FILE      = ".env"


def load_env():
    """Read .env file into a dict (no external deps)."""
    env = {}
    if not os.path.exists(ENV_FILE):
        return env
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV        = load_env()
GH_USER    = ENV.get("GITHUB_USER", "")
GH_REPO    = ENV.get("GITHUB_REPO", "")
GH_TOKEN   = ENV.get("GITHUB_TOKEN", "")
GH_BRANCH  = ENV.get("GITHUB_BRANCH", "main")

def add_product(item_id, title, category, price, original_price, image_url, description="", tag=""):
    """Adds or updates a product in products.json safely without breaking code."""
    if not os.path.exists(PRODUCTS_FILE):
        products = []
    else:
        with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
            products = json.load(f)

    # Check if item exists (update it) or append new
    existing = False
    for p in products:
        if p["id"] == item_id:
            p.update({
                "title": title,
                "category": category,
                "price": price,
                "originalPrice": original_price,
                "image": image_url,
                "description": description,
                "tag": tag
            })
            existing = True
            break

    if not existing:
        products.append({
            "id": item_id,
            "title": title,
            "category": category,
            "price": price,
            "originalPrice": original_price,
            "image": image_url,
            "description": description,
            "tag": tag
        })

    with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2)
    print(f"✅ Product '{title}' saved into {PRODUCTS_FILE}")

def push_to_github(commit_msg="Update products catalog"):
    """Pushes changes to GitHub using credentials from .env."""
    if not GH_USER or not GH_REPO or not GH_TOKEN:
        print("❌ Missing GITHUB_USER / GITHUB_REPO / GITHUB_TOKEN in .env")
        return

    # Build an authenticated remote URL using the token.
    # Format: https://USERNAME:TOKEN@github.com/USER/REPO.git
    remote_url = f"https://{GH_USER}:{GH_TOKEN}@github.com/{GH_USER}/{GH_REPO}.git"

    try:
        subprocess.run(["git", "add", "."], check=True)
        # Only commit if there are staged changes
        status = subprocess.run(["git", "status", "--porcelain"],
                                capture_output=True, text=True)
        if not status.stdout.strip():
            print("ℹ️  Nothing to commit.")
        else:
            subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        subprocess.run(["git", "push", remote_url, f"HEAD:{GH_BRANCH}"], check=True)
        print("🚀 Successfully synced with GitHub Pages! App updated.")
    except subprocess.CalledProcessError as e:
        print("❌ Git error:", e)

if __name__ == "__main__":
    # Example: Add a new ring to your store
    add_product(
        item_id="AJ-104",
        title="Emerald Solitaire Ring",
        category="Rings",
        price=1499,
        original_price=2299,
        image_url="https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
        description="Hydro emerald set in sterling 925 silver finish.",
        tag="Hot Pick"
    )

    # Automatically push to GitHub
    push_to_github("Added AJ-104 Emerald Ring")