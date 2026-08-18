from pathlib import Path

OLD = "0.9.47"
NEW = "0.9.48"


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(path, old, new, label):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match in {path}, found {count}")
    write(path, text.replace(old, new, 1))


# Bump the canonical version first, then use the repository's own synchroniser
# so every repeated app/Worker/test/cache-busting version moves together.
if read("VERSION").strip() != OLD:
    raise SystemExit(f"VERSION: expected {OLD}")
write("VERSION", NEW + "\n")
exec(compile(read(".github/scripts/sync-version.py"), ".github/scripts/sync-version.py", "exec"), {"__name__": "__main__"})
