$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskLocal = Join-Path $taskRoot '.local'
New-Item -ItemType Directory -Force $taskLocal | Out-Null
try { $health = Invoke-RestMethod http://127.0.0.1:13210/health -TimeoutSec 2; if ($health.service -eq 'watchtv') { Write-Output 'Server tunnel ready: http://127.0.0.1:13210'; exit 0 } } catch {}
$taskKey = Join-Path $env:USERPROFILE '.ssh/watchtv_deploy_ed25519'
if (-not (Test-Path $taskKey)) { throw 'Dedicated deployment SSH key is missing.' }
$taskProcess = Start-Process ssh -ArgumentList @('-i',$taskKey,'-o','BatchMode=yes','-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=30','-N','-L','127.0.0.1:13210:127.0.0.1:3210','ubuntu@193.112.55.186') -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $taskLocal 'tunnel-error.log')
$taskProcess.Id | Set-Content (Join-Path $taskLocal 'tunnel.pid')
for ($attempt=0; $attempt -lt 20; $attempt++) { Start-Sleep -Milliseconds 400; try { $health = Invoke-RestMethod http://127.0.0.1:13210/health -TimeoutSec 2; if ($health.service -eq 'watchtv') { Write-Output 'Server tunnel ready: http://127.0.0.1:13210'; exit 0 } } catch {} }
throw 'Tunnel startup failed. Check .local/tunnel-error.log.'
