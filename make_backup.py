"""
Run this to auto-generate MASTER_BACKUP.txt from your current files.
Just double-click make_backup.bat, or run: python make_backup.py
"""
import os
from datetime import datetime

# Directories to skip during the walk
SKIP_DIRS = {".git", "__pycache__", "node_modules", ".vscode", ".idea"}

# Files that must NEVER be included in the backup (they contain secrets)
SKIP_FILES = {".env", "MASTER_BACKUP.txt", "patch.txt", "pending_catalog.json"}

def _is_skipped(path):
    name = os.path.basename(path)
    return name in SKIP_FILES

# Files at root that MUST appear first (in this exact order)
ROOT_ORDER = [
    
    ".gitignore",
    "sync.bat",
    "start.bat",
    "products.json",
    "server.py",
    "auto_patch_sync.py",
    "make_backup.py",
]

# Collect files: root files first (in ROOT_ORDER), then all files
# found recursively in subfolders (like assets/css/, assets/js/).
def collect_files():
    seen = set()
    ordered = []

    # 1. Root-level priority files
    for f in ROOT_ORDER:
        if os.path.exists(f) and os.path.isfile(f):
            ordered.append(f)
            seen.add(os.path.normpath(f))

    # 2. Everything else at root
    for f in sorted(os.listdir(".")):
        if os.path.isfile(f) and os.path.normpath(f) not in seen and not _is_skipped(f):
            ordered.append(f)
            seen.add(os.path.normpath(f))

    # 3. Walk subfolders (assets/, etc.)
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in sorted(files):
            path = os.path.normpath(os.path.join(root, f))
            if path not in seen and not _is_skipped(path):
                ordered.append(path)
                seen.add(path)

    return ordered

FILES = collect_files()

OUT = "MASTER_BACKUP.txt"
SEP = "=" * 72


def main():
    with open(OUT, "w", encoding="utf-8") as out:
        out.write(SEP + "\n")
        out.write("MANIMEGALAI MARAN WEARABLES - MASTER BACKUP\n")
        out.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        out.write("Repo: https://github.com/manimegalaimaranwearablesMMG/manimegalaimaranwearables\n")
        out.write(SEP + "\n\n")

        for fname in FILES:
            if not os.path.exists(fname):
                out.write(f"--- FILE: {fname} --- [NOT FOUND]\n\n")
                continue
            out.write(f"--- FILE: {fname} ---\n")
            try:
                with open(fname, "r", encoding="utf-8") as f:
                    content = f.read()
                out.write(content)
                if not content.endswith("\n"):
                    out.write("\n")
            except Exception as e:
                out.write(f"[ERROR reading file: {e}]\n")
            out.write("\n")

        out.write(SEP + "\n")
        out.write("END OF BACKUP\n")
        out.write(SEP + "\n")

    print(f"[OK] Wrote {OUT}")
    print(f"     {os.path.getsize(OUT):,} bytes")
    print("     Open it, select all, paste into chat.")


if __name__ == "__main__":
    main()