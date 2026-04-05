# Private mirror: github.com/bvalavanis-maker/dev-sidecar-private
# Πλήρης αυτοματισμός: βάλε μόνιμα User env var GITHUB_TOKEN (classic PAT: repo scope) και τρέξε αυτό το script.
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

$token = $env:GITHUB_TOKEN
if (-not $token) { $token = $env:GH_TOKEN }
$gh = Get-Command gh -ErrorAction SilentlyContinue

if ($token -and $gh) {
  $token | & gh auth login --hostname github.com --with-token 2>&1
  $exists = & gh repo view bvalavanis-maker/dev-sidecar-private 2>&1
  if ($LASTEXITCODE -ne 0) {
    & gh repo create dev-sidecar-private --private --confirm 2>&1
  }
  if (-not (git remote get-url private 2>$null)) {
    git remote add private https://github.com/bvalavanis-maker/dev-sidecar-private.git
  }
  git push -u private master
  exit $LASTEXITCODE
}

if (-not (git remote get-url private 2>$null)) {
  git remote add private https://github.com/bvalavanis-maker/dev-sidecar-private.git
}
git push -u private master
exit $LASTEXITCODE
