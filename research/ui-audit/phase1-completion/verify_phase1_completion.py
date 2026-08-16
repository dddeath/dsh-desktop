from __future__ import annotations

import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile


ROOT = pathlib.Path(__file__).resolve().parents[3]
HERE = pathlib.Path(__file__).resolve().parent
BASELINE_COMMIT = "c5046d59d8b63dedf2fc3a88fe3edd4a34d238f8"
NODE = pathlib.Path(r"C:\Program Files\nodejs\node.exe")
LIVE = {
    "desktop/main.js": ROOT / "desktop" / "main.js",
    "themes/maid-atelier-fix/lib/client.js": ROOT / "themes" / "maid-atelier-fix" / "lib" / "client.js",
}
BASELINE = {
    "desktop/main.js": HERE / "baseline" / "desktop-main.original.js",
    "themes/maid-atelier-fix/lib/client.js": HERE / "baseline" / "maid-atelier-client.original.js",
}


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def normalized_bytes(path: pathlib.Path) -> bytes:
    return path.read_bytes().replace(b"\r\n", b"\n")


def run(command: list[str], cwd: pathlib.Path) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, cwd=cwd, text=True, capture_output=True, check=False)
    print("COMMAND=" + subprocess.list2cmdline(command))
    if result.stdout.strip():
        print("STDOUT=" + result.stdout.strip().replace("\n", " | "))
    if result.stderr.strip():
        print("STDERR=" + result.stderr.strip().replace("\n", " | "))
    print(f"EXIT={result.returncode}")
    if result.returncode != 0:
        raise SystemExit(result.returncode)
    return result


for rel, path in LIVE.items():
    run([str(NODE), "--check", str(path)], ROOT)
    print(f"LIVE_SHA256[{rel}]={sha256(path)}")

run([str(NODE), "--check", str(ROOT / "research" / "dom-probe" / "verify-runtime-clarity-sidebar-sync.cjs")], ROOT)
run(["git", "diff", "--check"], ROOT)

for rel, path in BASELINE.items():
    expected = subprocess.run(
        ["git", "show", f"{BASELINE_COMMIT}:{rel}"], cwd=ROOT, capture_output=True, check=True
    ).stdout
    assert path.read_bytes() == expected, f"baseline drift: {rel}"
    print(f"BASELINE_SHA256[{rel}]={sha256(path)}")

source = LIVE["themes/maid-atelier-fix/lib/client.js"].read_text(encoding="utf-8")
for needle in (
    "text-shadow: none !important;",
    "filter: none !important;",
    "-webkit-text-stroke: 0 transparent !important;",
    "max-width: none !important;",
    'root.style.setProperty("margin-right", "var(--dsh-sidebar-width, 0px)", "important")',
):
    assert needle in source, f"missing phase-1 source invariant: {needle}"
print("SOURCE_INVARIANTS=PASS")

metrics_path = HERE / "acceptance" / "right-sidebar-over-50-sync-metrics.json"
metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
assert metrics["panelRatioPercent"] > 50
assert all(metrics["assertions"].values())
print(f"SIDEBAR_RATIO_PERCENT={metrics['panelRatioPercent']}")
print("SIDEBAR_ASSERTIONS=PASS")

with urllib.request.urlopen("http://127.0.0.1:3080/", timeout=10) as response:
    print(f"HTTP_STATUS={response.status}")
    assert response.status == 200

patch = HERE / "phase1-ui.patch"
with tempfile.TemporaryDirectory(prefix="dsh-phase1-patch-") as temp_name:
    temp = pathlib.Path(temp_name)
    for rel, baseline in BASELINE.items():
        target = temp / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(baseline, target)
    run(["git", "init", "-q"], temp)
    run(["git", "apply", "--check", str(patch)], temp)
    run(["git", "apply", str(patch)], temp)
    for rel, live in LIVE.items():
        assert normalized_bytes(temp / rel) == normalized_bytes(live), f"patch output mismatch: {rel}"
        print(f"PATCHED_SHA256[{rel}]={sha256(temp / rel)}")
        print(f"PATCHED_NORMALIZED_MATCH[{rel}]=True")
    print("PATCH_REPLAY=PASS")

    rollback = HERE / "rollback-phase1-ui.ps1"
    run(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(rollback),
            "-Root",
            str(temp),
        ],
        ROOT,
    )
    for rel, baseline in BASELINE.items():
        assert sha256(temp / rel) == sha256(baseline), f"rollback mismatch: {rel}"
    print("ROLLBACK_PROBE=PASS")

archive = HERE / "modified" / "phase1-ui-modified-v1.zip"
with tempfile.TemporaryDirectory(prefix="dsh-phase1-archive-") as temp_name:
    temp = pathlib.Path(temp_name)
    with zipfile.ZipFile(archive) as handle:
        handle.extractall(temp)
    for rel, live in LIVE.items():
        assert sha256(temp / rel) == sha256(live), f"archive mismatch: {rel}"
        run([str(NODE), "--check", str(temp / rel)], temp)
    run([str(NODE), "--check", str(temp / "research" / "dom-probe" / "verify-runtime-clarity-sidebar-sync.cjs")], temp)
    print("ARTIFACT_REOPEN=PASS")

print(f"PATCH_SHA256={sha256(patch)}")
print(f"ARTIFACT_SHA256={sha256(archive)}")
print(f"RUNTIME_SCREENSHOT_SHA256={sha256(HERE / 'acceptance' / 'runtime-status-plain-text.jpg')}")
print(f"SIDEBAR_SCREENSHOT_SHA256={sha256(HERE / 'acceptance' / 'right-sidebar-over-50-sync.png')}")
print("PHASE1_COMPLETION=PASS")
