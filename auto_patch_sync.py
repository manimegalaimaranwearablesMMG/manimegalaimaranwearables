import os
import sys
import json
import subprocess

PATCH_FILE = "patch.txt"
ENV_FILE   = ".env"
PRODUCTS   = "products.json"
QUEUE_FILE = "pending_catalog.json"


# ─────────────────────────────────────────────────────
# Load .env (no external deps)
# ─────────────────────────────────────────────────────
def load_env():
    if not os.path.exists(ENV_FILE):
        return {}
    env = {}
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


# ─────────────────────────────────────────────────────
# Patch.txt parser (find / replace)
# ─────────────────────────────────────────────────────
def parse_patch_file(filepath):
    if not os.path.exists(filepath):
        print(f"❌ '{filepath}' not found.")
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    patches = []
    for sec in content.split("\nFILE:"):
        sec = sec.strip()
        if not sec:
            continue
        lines = sec.splitlines()
        filename = lines[0].strip()
        if filename.startswith("FILE:"):
            filename = filename[5:].strip()
        remaining = "\n".join(lines[1:])

        # CREATE
        if "<<<<<<< CREATE" in remaining:
            body, _ = remaining.split(">>>>>>>", 1)
            body = body.split("<<<<<<< CREATE", 1)[1].strip("\r\n")
            patches.append({"file": filename, "mode": "create", "content": body})
            continue

        # COPY
        if "<<<<<<< COPY" in remaining:
            body, _ = remaining.split(">>>>>>>", 1)
            src = body.split("<<<<<<< COPY", 1)[1].strip()
            patches.append({"file": filename, "mode": "copy", "source": src})
            continue

        # FIND/REPLACE
        for blk in remaining.split("<<<<<<< FIND"):
            if "=======" in blk and ">>>>>>>" in blk:
                find_part, rest = blk.split("=======", 1)
                replace_part, _ = rest.split(">>>>>>>", 1)
                find_str = find_part.strip("\r\n")
                replace_str = replace_part.strip("\r\n")
                if find_str:
                    patches.append({"file": filename, "mode": "replace",
                                    "find": find_str, "replace": replace_str})
    return patches


def apply_patches(patches, dry_run=False):
    if not patches:
        print("⚠️  No patches to apply.")
        return 0
    count = 0
    for p in patches:
        tf = p["file"]
        mode = p.get("mode", "replace")

        # ── CREATE mode ─────────────────────────────────────────
        if mode == "create":
            if os.path.exists(tf):
                print(f"⚠️  Already exists, skipped: {tf}")
                continue
            # Auto-create parent folders if needed
            parent = os.path.dirname(tf)
            if parent and not os.path.exists(parent):
                if dry_run:
                    print(f"🧪 Would MKDIR [{parent}]")
                else:
                    os.makedirs(parent, exist_ok=True)
                    print(f"📁 Created folder [{parent}]")
            if dry_run:
                print(f"🧪 Would CREATE [{tf}] ({len(p['content'])} chars)")
            else:
                with open(tf, "w", encoding="utf-8", newline="\n") as f:
                    f.write(p["content"] + "\n")
                print(f"✅ Created [{tf}]")
            count += 1
            continue

        # ── COPY mode ───────────────────────────────────────────
        if mode == "copy":
            src = p["source"]
            if not os.path.exists(src):
                print(f"❌ Copy source missing: {src}")
                continue
            if os.path.exists(tf):
                print(f"⚠️  Already exists, skipped: {tf}")
                continue
            parent = os.path.dirname(tf)
            if parent and not os.path.exists(parent):
                if dry_run:
                    print(f"🧪 Would MKDIR [{parent}]")
                else:
                    os.makedirs(parent, exist_ok=True)
                    print(f"📁 Created folder [{parent}]")
            if dry_run:
                print(f"🧪 Would COPY [{src}] → [{tf}]")
            else:
                with open(src, "r", encoding="utf-8") as f:
                    content = f.read()
                with open(tf, "w", encoding="utf-8", newline="\n") as f:
                    f.write(content)
                print(f"✅ Copied [{src}] → [{tf}]")
            count += 1
            continue

        # ── REPLACE mode ────────────────────────────────────────
        if not os.path.exists(tf):
            print(f"❌ Missing file: {tf}")
            continue
        with open(tf, "r", encoding="utf-8") as f:
            data = f.read().replace("\r\n", "\n")
        find    = p["find"].replace("\r\n", "\n")
        replace = p["replace"].replace("\r\n", "\n")
        if find in data:
            if dry_run:
                print(f"🧪 Would patch [{tf}] → {find[:50]!r}…")
            else:
                with open(tf, "w", encoding="utf-8", newline="\n") as f:
                    f.write(data.replace(find, replace, 1))
                print(f"✅ Patched [{tf}]")
            count += 1
        else:
            print(f"❌ No match in [{tf}] → {find[:60]!r}")
    return count


# ─────────────────────────────────────────────────────
# Apply admin queue → products.json
# ─────────────────────────────────────────────────────
def apply_admin_queue():
    if not os.path.exists(QUEUE_FILE):
        return False
    try:
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            incoming = json.load(f)
    except Exception as e:
        print(f"⚠️  Bad queue file: {e}")
        return False

    with open(PRODUCTS, "w", encoding="utf-8") as f:
        json.dump(incoming, f, indent=2, ensure_ascii=False)
    os.remove(QUEUE_FILE)
    print(f"✅ Applied {len(incoming)} product(s) from admin queue → {PRODUCTS}")
    return True


# ─────────────────────────────────────────────────────
# Git push
# ─────────────────────────────────────────────────────
def git_push(commit_msg="Update store via auto-patch"):
    print("\n🚀 Pushing to GitHub...")

    env = load_env()
    user   = env.get("GITHUB_USER", "")
    repo   = env.get("GITHUB_REPO", "")
    token  = env.get("GITHUB_TOKEN", "")
    branch = env.get("GITHUB_BRANCH", "main")

    if not user or not repo or not token:
        print("❌ .env missing GITHUB_USER / GITHUB_REPO / GITHUB_TOKEN.")
        return

    remote_url = f"https://{user}:{token}@github.com/{user}/{repo}.git"

    try:
        subprocess.run(["git", "add", "."], check=True)
        res = subprocess.run(["git", "status", "--porcelain"],
                             capture_output=True, text=True)
        if not res.stdout.strip():
            print("ℹ️  Nothing to commit.")
            return
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        subprocess.run(["git", "push", remote_url, f"HEAD:{branch}"], check=True)
        print("🎉 Pushed! GitHub Pages live in ~20s.")
    except subprocess.CalledProcessError as e:
        print("❌ Git error:", e)


# ─────────────────────────────────────────────────────
# Menu
# ─────────────────────────────────────────────────────
def menu():
    print("=" * 55)
    print("🛠️   MANIMEGALAI MARAN WEARABLES — BACKEND SYNC")
    print("=" * 55)
    print("  1.  Update files  +  Push to Git")
    print("  2.  Update files only  (no push)")
    print("  3.  Push only          (no patch)")
    print("  4.  Dry-run preview    (no changes)")
    print("=" * 55)
    return input("👉 Choose [1/2/3/4]: ").strip()


def main():
    env = load_env()
    if not env.get("GITHUB_USER") or not env.get("GITHUB_REPO"):
        print("⚠️  .env missing GITHUB_USER / GITHUB_REPO.")
        print("    Create .env next to this script (see instructions).")

    choice = menu()
    if choice not in ("1", "2", "3", "4"):
        print("❌ Invalid.")
        return

    # 4 → dry run only
    if choice == "4":
        patches = parse_patch_file(PATCH_FILE)
        if patches:
            print(f"\n📦 {len(patches)} patch block(s) — DRY RUN:")
            apply_patches(patches, dry_run=True)
        else:
            print("ℹ️  patch.txt empty.")
        print("\n🏁 Done. Press Enter to close.")
        input()
        return

    # 1 & 2 → apply patches + admin queue
    if choice in ("1", "2"):
        patches = parse_patch_file(PATCH_FILE)
        if patches:
            print(f"\n📦 {len(patches)} patch block(s)...")
            apply_patches(patches)
            ans = input("🧹 Clear patch.txt? (Y/n): ").strip().lower()
            if ans != "n":
                open(PATCH_FILE, "w").close()
                print("   Cleared.")
        else:
            print("ℹ️  patch.txt empty.")

        if apply_admin_queue():
            print("📥 Admin queue applied.")

    # 1 & 3 → git push
    if choice in ("1", "3"):
        msg = input("\n📝 Commit message (Enter = default): ").strip() \
              or "Update store via backend sync"
        git_push(msg)

    print("\n🏁 Done. Press Enter to close.")
    input()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  Cancelled.")