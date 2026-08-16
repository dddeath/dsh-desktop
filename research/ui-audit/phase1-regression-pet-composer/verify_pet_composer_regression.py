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
BASELINE_COMMIT = "e9ce9e447ea20f6a9c981191da6fe3ee438baa34"
RELATIVE_SOURCE = "themes/maid-atelier-fix/lib/client.js"
NODE = pathlib.Path(r"C:\Program Files\nodejs\node.exe")
LIVE = ROOT / RELATIVE_SOURCE
BASELINE = HERE / "baseline" / "client.pet-composer-original.js"
MODIFIED = HERE / "modified" / "client.pet-composer-modified.js"
PROBE = ROOT / "research" / "dom-probe" / "verify-pet-composer-regression.cjs"
PATCH = HERE / "pet-composer-regression.patch"
ROLLBACK = HERE / "rollback-pet-composer-regression.ps1"
ARCHIVE = HERE / "modified" / "pet-composer-regression-modified-v1.zip"
METRICS = HERE / "acceptance" / "03-pet-composer-fixed-metrics.json"
SCREENSHOT = HERE / "acceptance" / "03-pet-composer-fixed.png"


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def normalized(path: pathlib.Path) -> bytes:
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


run([str(NODE), "--check", str(LIVE)], ROOT)
run([str(NODE), "--check", str(PROBE)], ROOT)
run(["git", "diff", "--check", "--", RELATIVE_SOURCE, str(PROBE.relative_to(ROOT))], ROOT)

expected_baseline = subprocess.run(
    ["git", "show", f"{BASELINE_COMMIT}:{RELATIVE_SOURCE}"], cwd=ROOT, capture_output=True, check=True
).stdout
assert BASELINE.read_bytes() == expected_baseline, "preserved baseline does not match the pre-fix commit"
assert LIVE.read_bytes() == MODIFIED.read_bytes(), "modified copy drifted from production"
print(f"BASELINE_SHA256={sha256(BASELINE)}")
print(f"MODIFIED_SHA256={sha256(LIVE)}")

source = LIVE.read_text(encoding="utf-8")
for needle in (
    "body[data-dsh-maid-atelier] [data-whale-girl]",
    "opacity: var(--pet-opacity, 1) !important;",
    "body[data-dsh-maid-atelier] [data-composer-card='true'][data-dsh-composer-status]::before",
    "content: none !important;",
    "display: none !important;",
):
    assert needle in source, f"missing source invariant: {needle}"
assert "content: attr(data-dsh-composer-status-label);" not in source
print("SOURCE_INVARIANTS=PASS")

metrics = json.loads(METRICS.read_text(encoding="utf-8"))
assert all(metrics["assertions"].values())
assert metrics["idle"]["pet"]["computedOpacity"] == "1"
assert metrics["running"]["composer"]["status"] == "running"
assert metrics["running"]["composer"]["pseudoContent"] == "none"
assert metrics["running"]["composer"]["pseudoDisplay"] == "none"
print("ELECTRON_ASSERTIONS=PASS")

with urllib.request.urlopen("http://127.0.0.1:3080/", timeout=10) as response:
    print(f"HTTP_STATUS={response.status}")
    assert response.status == 200

with tempfile.TemporaryDirectory(prefix="dsh-pet-composer-patch-") as temp_name:
    temp = pathlib.Path(temp_name)
    target = temp / RELATIVE_SOURCE
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(BASELINE, target)
    run(["git", "init", "-q"], temp)
    run(["git", "apply", "--check", str(PATCH)], temp)
    run(["git", "apply", str(PATCH)], temp)
    assert normalized(target) == normalized(LIVE)
    run([str(NODE), "--check", str(target)], temp)
    print("PATCH_REPLAY=PASS")

    run(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(ROLLBACK),
            "-Root",
            str(temp),
        ],
        ROOT,
    )
    assert sha256(target) == sha256(BASELINE)
    print("ROLLBACK_PROBE=PASS")

with tempfile.TemporaryDirectory(prefix="dsh-pet-composer-archive-") as temp_name:
    temp = pathlib.Path(temp_name)
    with zipfile.ZipFile(ARCHIVE) as handle:
        handle.extractall(temp)
    archived_source = temp / RELATIVE_SOURCE
    archived_probe = temp / "research" / "dom-probe" / "verify-pet-composer-regression.cjs"
    assert sha256(archived_source) == sha256(LIVE)
    run([str(NODE), "--check", str(archived_source)], temp)
    run([str(NODE), "--check", str(archived_probe)], temp)
    print("ARTIFACT_REOPEN=PASS")

print(f"PATCH_SHA256={sha256(PATCH)}")
print(f"ARTIFACT_SHA256={sha256(ARCHIVE)}")
print(f"SCREENSHOT_SHA256={sha256(SCREENSHOT)}")
print(f"METRICS_SHA256={sha256(METRICS)}")
print("PHASE1_PET_COMPOSER_REGRESSION=PASS")
