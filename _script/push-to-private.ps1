# Push this project to a PRIVATE GitHub repo (bvalavanis-maker/dev-sidecar-private).
#
# Option A — GitHub CLI (δημιουργεί το repo αν δεν υπάρχει):
#   1) gh auth login
#   2) Από τη ρίζα του project: gh repo create dev-sidecar-private --private --source=. --remote=private --push
#
# Option B — Χειροκίνητα:
#   1) Δημιούργησε κενό private repo: https://github.com/new?name=dev-sidecar-private&visibility=private
#   2) Τρέξε αυτό το script από τη ρίζα ή: powershell -File _script/push-to-private.ps1

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root
Write-Host "Root: $root"

$remoteName = "private"
$url = "https://github.com/bvalavanis-maker/dev-sidecar-private.git"

if (-not (git remote get-url $remoteName 2>$null)) {
  git remote add $remoteName $url
  Write-Host "Added remote $remoteName"
} else {
  Write-Host "Remote '$remoteName' already configured."
}

Write-Host "Pushing master -> $remoteName ..."
git push -u $remoteName master
