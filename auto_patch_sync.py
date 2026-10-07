import os
import sys
import subprocess

PATCH_FILE = "patch.txt"


def parse_patch_file(filepath):
    """Parses patch blocks: FILE: <name> + <<<<<<< FIND / ======= / >>>>>>>"""
    if not os.path.exists(filepath):
        print(f"❌ Patch file '{filepath}' not found.")
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    patches = []
    sections = content.split("FILE:")
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        lines = sec.splitlines()
        filename = lines[0].strip()
        remaining = "\n".join(lines[1:])

        blocks = remaining.split("<<<<<<< FIND")
        for blk in blocks:
            if "=======" in blk and ">>>>>>>" in blk:
                find_part, rest = blk.split("=======", 1)
                replace_part, _ = rest.split(">>>>>>>", 1)

                find_str = find_part.strip("\r\n")
                replace_str = replace_part.strip("\r\n")

                if find_str:
                    patches.append({
                        "file": filename,
                        "find": find_str,
                        "replace": replace_str
                    })
    return patches


def apply_patches(patches):
    if not patches:
        print("⚠️  No valid patches found in patch file.")
        return 0

    success_count = 0
    for p in patches:
        target_file = p["file"]
        if not os.path.exists(target_file):
            print(f"❌ Target file '{target_file}' does not exist. Skipping.")
            continue

        with open(target_file, "r", encoding="utf-8") as f:
            data = f.read()

        norm_data = data.replace("\r\n", "\n")
        norm_find = p["find"].replace("\r\n", "\n")
        norm_replace = p["replace"].replace("\r\n", "\n")

        if norm_data.count(norm_find) > 1:
            print(f"⚠️  Multiple matches in [{target_file}]. Patching first only.")
        if norm_find in norm_data:
            updated = norm_data.replace(norm_find, norm_replace, 1)
            with open(target_file, "w", encoding="utf-8", newline="\n") as f:
                f.write(updated)
            print(f"✅ Patched [{target_file}]")
            success_count += 1
        else:
            print(f"❌ Failed to locate block in [{target_file}]")
            print("   SEARCH SNIPPET:", p["find"][:80].replace("\n", " ⏎ "))
    return success_count


def git_push(commit_msg="Update store via auto-patch"):
    print("\n🚀 Pushing changes to GitHub...")
    try:
        subprocess.run(["git", "add", "."], check=True)
        res = subprocess.run(["git", "status", "--porcelain"],
                             capture_output=True, text=True)
        if not res.stdout.strip():
            print("ℹ️  No changes to commit. Already up to date.")
            return
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("🎉 Pushed to GitHub! Live in ~20s.")
    except subprocess.CalledProcessError as e:
        print("❌ Git error:", e)


def menu():
    print("=" * 55)
    print("🛠️   MAHADEV FASHION HUB — PATCHER & SYNC")
    print("=" * 55)
    print("  1.  Update files  +  Push to Git")
    print("  2.  Update files only  (no push)")
    print("  3.  Push only          (no patch)")
    print("=" * 55)

    choice = input("👉 Choose an option [1/2/3]: ").strip()
    return choice


def main():
    choice = menu()

    if choice not in ("1", "2", "3"):
        print("❌ Invalid choice. Exiting.")
        return

    # ── Step 1: Apply patches (options 1 & 2) ──
    if choice in ("1", "2"):
        patches = parse_patch_file(PATCH_FILE)
        if not patches:
            print("⚠️  patch.txt is empty or invalid. Nothing to apply.")
        else:
            print(f"\n📦 Found {len(patches)} patch block(s). Applying...\n")
            count = apply_patches(patches)
            print(f"\n✅ Applied {count}/{len(patches)} patches.")

            # Clear patch.txt after successful run
            if count > 0:
                ans = input("\n🧹 Clear patch.txt now? (Y/n): ").strip().lower()
                if ans != "n":
                    with open(PATCH_FILE, "w", encoding="utf-8") as f:
                        f.write("")
                    print("   patch.txt cleared.")

    # ── Step 2: Push (options 1 & 3) ──
    if choice in ("1", "3"):
        msg = input("\n📝 Commit message (Enter for default): ").strip()
        if not msg:
            msg = "Update store via auto-patch"
        git_push(msg)

    print("\n🏁 All done. Press Enter to exit.")
    input()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Cancelled by user.")