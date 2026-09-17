$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:MINI_KAFKA_BROKERS = "1@localhost:9090,2@localhost:9091,3@localhost:9092"
$env:MINI_KAFKA_REPLICATION_FACTOR = "3"

$brokers = @(
  @{ Id = "1"; Port = "9090" },
  @{ Id = "2"; Port = "9091" },
  @{ Id = "3"; Port = "9092" }
)

foreach ($b in $brokers) {
  $command = "Set-Location '$root'; `$env:BROKER_ID='$($b.Id)'; `$env:MINI_KAFKA_PORT='$($b.Port)'; `$env:MINI_KAFKA_BROKERS='1@localhost:9090,2@localhost:9091,3@localhost:9092'; `$env:MINI_KAFKA_REPLICATION_FACTOR='3'; node src/broker.js"
  Start-Process powershell -ArgumentList @("-NoExit", "-Command", $command)
}
Write-Host "Started Mini-Kafka brokers B1=9090, B2=9091, B3=9092"
