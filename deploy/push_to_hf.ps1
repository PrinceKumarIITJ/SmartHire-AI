# Publishes the backend to a Hugging Face Docker Space.
#
#   .\deploy\push_to_hf.ps1 -Space "your-username/smarthire-api"
#
# Git asks for credentials on push: username = your HF username, password = an HF access
# token with write permission. Secrets are never copied; set them in the Space settings.
param(
    [Parameter(Mandatory = $true)][string]$Space
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$workDir = Join-Path $env:TEMP "smarthire-hf-space"

if (Test-Path $workDir) { Remove-Item -Recurse -Force $workDir -Confirm:$false }
git clone "https://huggingface.co/spaces/$Space" $workDir
if ($LASTEXITCODE -ne 0) { throw "Could not clone the Space. Create it first at https://huggingface.co/new-space (SDK: Docker)." }

# robocopy exit codes below 8 mean success.
robocopy (Join-Path $repoRoot "backend") (Join-Path $workDir "backend") /E /NFL /NDL /NJH /NJS /XD venv .venv __pycache__ .pytest_cache tests /XF *.db *.pyc .env | Out-Null
if ($LASTEXITCODE -ge 8) { throw "Copying the backend failed." }

Copy-Item (Join-Path $repoRoot "backend\Dockerfile") (Join-Path $workDir "Dockerfile") -Force
Copy-Item (Join-Path $repoRoot "deploy\huggingface\README.md") (Join-Path $workDir "README.md") -Force
Copy-Item (Join-Path $repoRoot ".dockerignore") (Join-Path $workDir ".dockerignore") -Force

Push-Location $workDir
try {
    git add -A
    git commit -m "Deploy SmartHire API"
    git push
    if ($LASTEXITCODE -ne 0) { throw "Push failed. Use an HF access token with write permission as the password." }
}
finally {
    Pop-Location
}

Write-Host "Pushed. Watch the build at https://huggingface.co/spaces/$Space"
