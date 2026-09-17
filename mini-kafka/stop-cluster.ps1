$ports = 9090,9091,9092
foreach ($port in $ports) {
  $lines = netstat -ano | Select-String ":$port\s+.*LISTENING"
  foreach ($line in $lines) {
    $parts = ($line.ToString() -split '\s+') | Where-Object { $_ -ne '' }
    $pid = $parts[-1]
    if ($pid -match '^\d+$') { Stop-Process -Id ([int]$pid) -Force -ErrorAction SilentlyContinue }
  }
}
Write-Host "Mini-Kafka cluster stopped."
