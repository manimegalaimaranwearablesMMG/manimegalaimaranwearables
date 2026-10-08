"""
Run this to auto-generate MASTER_BACKUP.txt from your current files.
Just double-click make_backup.bat, or run: python make_backup.py
"""
import os
from datetime import datetime

FILES = [
    ".env",
    ".gitignore",
    "sync.bat",
    "start.bat",
    "products.json",
    "server.py",
    "auto_patch_sync.py",
    "admin.html",
    "index.html",
    "app.js",
    "style.css",
    "manifest.json",
]

OUT = "MASTER_BACKUP.txt"
SEP = "=" * 72


def main():
    with open(OUT, "w", encoding="utf-8") as out:
        out.write(SEP + "\n")
        out.write("MAHADEV FASHION HUB - MASTER BACKUP\n")
        out.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        out.write("Repo: https://github.com/Madhan-codar/MA-FASHION\n")
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