param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

$keyPath = "$env:USERPROFILE\.ssh\id_ed25519"
$hostName = "23.80.89.116"
$user = "root"

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "ssh.exe"
$psi.Arguments = "-i `"$keyPath`" -o BatchMode=yes -o StrictHostKeyChecking=no -o ConnectTimeout=10 $user@$hostName `"$Command`""
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true

$proc = [System.Diagnostics.Process]::Start($psi)
$proc.StandardInput.Close()

$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()

if ($stdout) { [Console]::Out.Write($stdout) }
if ($stderr) { [Console]::Error.Write($stderr) }
exit $proc.ExitCode
