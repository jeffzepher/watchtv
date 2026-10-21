$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskLocal = Join-Path $taskRoot '.local'
New-Item -ItemType Directory -Force -Path $taskLocal | Out-Null
if (-not (Test-Path (Join-Path $taskRoot 'dist/server.js'))) { throw 'Run npm ci and npm run build first.' }
try {
  $existing = Invoke-RestMethod 'http://127.0.0.1:3210/health' -TimeoutSec 2
  if ($existing.service -eq 'watchtv') { Write-Output 'WatchTV is already running: http://127.0.0.1:3210'; exit 0 }
} catch { }
$taskNode = (Get-Command node).Source
$taskProcess = Start-Process -FilePath $taskNode -ArgumentList @('--env-file-if-exists=.env','dist/server.js') -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskLocal 'server.log') -RedirectStandardError (Join-Path $taskLocal 'server-error.log')
$taskProcess.Id | Set-Content (Join-Path $taskLocal 'server.pid')
for ($attempt=0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 300
  try { $health=Invoke-RestMethod 'http://127.0.0.1:3210/health' -TimeoutSec 1; if($health.service -eq 'watchtv') { Write-Output 'WatchTV ready: http://127.0.0.1:3210'; exit 0 } } catch { }
}
throw 'WatchTV startup failed. Check .local/server-error.log.'
