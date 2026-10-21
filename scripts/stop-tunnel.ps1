$ErrorActionPreference = 'Stop'
$taskPidFile = Join-Path (Split-Path -Parent $PSScriptRoot) '.local/tunnel.pid'
if (Test-Path $taskPidFile) {
 $taskPid = [int](Get-Content $taskPidFile)
 $taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$taskPid"
 if ($taskProcess -and $taskProcess.Name -eq 'ssh.exe' -and $taskProcess.CommandLine -like '*127.0.0.1:13210:127.0.0.1:3210*') { Stop-Process -Id $taskPid }
 Remove-Item -LiteralPath $taskPidFile
}
