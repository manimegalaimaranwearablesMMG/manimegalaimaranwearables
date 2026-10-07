import os
import sys
import subprocess

PATCH_FILE = "patch.txt"

def parse_patch_file(filepath):
    """
    Parses patch instructions structured as:
    FILE: <filename>
    <<<<<<< FIND
    <code to find>
    =======
    <code to replace>
    >>>>>>>
    """
    if not os.path.exists(filepath):
        print(f"❌ Patch file '{filepath}' not found.")
        return []

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    patches = []
    # Split by FILE:
    sections = content.split("FILE:")
    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue
        lines = sec.splitlines()
        filename = lines[0].strip()
        remaining = "\n".join(lines[1:])
        
        # Look for FIND / REPLACE blocks
        blocks = remaining.split("<<<<<<< FIND")
        for blk in blocks:
            if "=======" in blk and ">>>>>>>" in blk:
                find_part, rest = blk.split("=======", 1)
                replace_part, _ = rest.split(">>>>>>>", 1)
                
                # Strip leading/trailing single newline if present for exact matching
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
        print("⚠️ No valid patches found in patch file.")
        return False

    success_count = 0
    for p in patches:
        target_file = p["file"]
        if not os.path.exists(target_file):
            print(f"❌ Target file '{target_file}' does not exist.")
            continue

        with open(target_file, "r", encoding="utf-8") as f:
            data = f.read()

        # Handle Windows CRLF vs Unix LF discrepancies
        norm_data = data.replace("\r\n", "\n")
        norm_find = p["find"].replace("\r\n", "\n")
        norm_replace = p["replace"].replace("\r\n", "\n")

        if norm_find in norm_data:
            updated_data = norm_data.replace(norm_find, norm_replace, 1)
            # Write back maintaining file integrity
            with open(target_file, "w", encoding="utf-8", newline="\n") as f:
                f.write(updated_data)
            print(f"✅ Successfully patched in [{target_file}]")
            success_count += 1
        else:
            print(f"❌ Failed to locate target block in [{target_file}]. Snippet preview:")
            print("--- SEARCHED FOR ---")
            print(p["find"][:100] + ("..." if len(p["find"]) > 100 else ""))
            print("--------------------")

    return success_count > 0

def git_commit_and_push(commit_msg="Auto patch and sync"):
    print("\n🚀 Initiating Git push to GitHub repository...")
    try:
        subprocess.run(["git", "add", "."], check=True)
        # Check if there are changes staged
        res = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if not res.stdout.strip():
            print("ℹ️ No code changes detected to commit.")
            return

        subprocess.run(["git", "commit", "-m", commit_msg], check=True)
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("🎉 Successfully pushed to GitHub! Pages/Cloudflare will update in ~20s.")
    except subprocess.CalledProcessError as e:
        print("❌ Git error encountered:", e)

def main():
    print("=" * 50)
    print("🛠️  AURA JEWELS - CODE PATCHER & REPO SYNC")
    print("=" * 50)
    
    patches = parse_patch_file(PATCH_FILE)
    if not patches:
        input("\nPress Enter to exit...")
        return

    modified = apply_patches(patches)
    if modified:
        # Prompt or auto-commit
        commit_title = input("\nEnter commit message (or press Enter for default): ").strip()
        if not commit_title:
            commit_title = "Update store features via auto-patch"
        git_commit_and_push(commit_title)
        
        # Clear patch.txt to avoid duplicate accidental runs
        choice = input("\nClear patch.txt now? (Y/n): ").strip().lower()
        if choice != "n":
            with open(PATCH_FILE, "w", encoding="utf-8") as f:
                f.write("")
            print("🧹 Cleared patch.txt.")
    else:
        print("\n⚠️ No changes were applied. Check if FIND blocks match your file content.")

    print("\nAll operations completed.")

if __name__ == "__main__":
    main()