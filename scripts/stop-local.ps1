$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskPidFile = Join-Path $taskRoot '.local/server.pid'
if (Test-Path $taskPidFile) {
  $taskPid = [int](Get-Content $taskPidFile)
  $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $taskPid" -ErrorAction SilentlyContinue
  if ($taskProcess -and $taskProcess.Name -eq 'node.exe' -and $taskProcess.CommandLine -like '*dist/server.js*') { Stop-Process -Id $taskPid }
  Remove-Item -LiteralPath $taskPidFile
}
