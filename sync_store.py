import json
import subprocess
import os

PRODUCTS_FILE = "products.json"

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
    """Pushes changes to GitHub to trigger GitHub Pages real-time deploy."""
    try:
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("🚀 Successfully synced with GitHub Pages! App updated.")
    except Exception as e:
        print("❌ Git push error:", e)

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