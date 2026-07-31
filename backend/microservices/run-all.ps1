<#
  Starts the full PharmaTrack microservices stack, each in its own window.
  Order: Eureka (8761) -> all 8 services -> API Gateway (8090).
  Every service auto-creates its own MySQL database (root/root) on first run
  and registers with Eureka as 'localhost' so the gateway can reach it.

  Prereqs: MySQL running on localhost:3306 (root/root), Java 21 on PATH,
  and the jars built once via:  mvnw.cmd -f microservices\pom.xml install -DskipTests
  (build flags for this environment:
     -Dmaven.resolver.transport=wagon -Dmaven.wagon.http.ssl.insecure=true
     -Dmaven.wagon.http.ssl.allowall=true)

  Usage:  powershell -ExecutionPolicy Bypass -File microservices\run-all.ps1
#>

$ErrorActionPreference = 'Stop'
$env:AUDIT_INTERNAL_TOKEN = "local-dev-internal-token-change-me"
$env:AUDIT_HMAC_KEY = "local-dev-hmac-key-change-me"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-Svc($name, $jarRelPath, $extraArgs) {
    $jar = Join-Path $root $jarRelPath
    $argList = @('-jar', $jar) + $extraArgs
    Start-Process -FilePath 'C:\Users\SURIYA PRASAAD S\.jdks\ms-21.0.8\bin\java.exe' -ArgumentList $argList -WorkingDirectory $root -NoNewWindow | Out-Null
    Write-Host ("started {0}" -f $name)
}

$loc = @('--eureka.instance.prefer-ip-address=false', '--eureka.instance.hostname=localhost', '--spring.datasource.password=Sur@6904')

Write-Host '== Starting Eureka discovery (8761) =='
Start-Svc 'discovery-server' 'discovery-server\target\discovery-server-0.0.1-SNAPSHOT.jar' @()
Start-Sleep -Seconds 25

Write-Host '== Starting services =='
Start-Svc 'iam-service (8081)'            'iam-service\target\iam-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'clinicaltrial-service (8082)'  'clinicaltrial-service\target\clinicaltrial-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'subjectenrolment-service (8083)' 'subjectenrolment-service\target\subjectenrolment-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'batch-service (8084)'          'batch-service\target\batch-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'supplychain-service (8085)'    'supplychain-service\target\supplychain-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'deviationcapa-service (8086)'  'deviationcapa-service\target\deviationcapa-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'regulatory-service (8087)'     'regulatory-service\target\regulatory-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'notification-service (8088)'   'notification-service\target\notification-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'audit-service (8089)'           'audit-service\target\audit-service-0.0.1-SNAPSHOT.jar' $loc
Start-Sleep -Seconds 35

Write-Host '== Starting API Gateway (8090) =='
Start-Svc 'api-gateway' 'api-gateway\target\api-gateway-0.0.1-SNAPSHOT.jar' @()

Write-Host ''
Write-Host 'All processes launched. Eureka dashboard: http://localhost:8761'
Write-Host 'Gateway (frontend talks to this): http://localhost:8090'
Write-Host 'PharmaTrack Microservices stack is fully active. Keep-alive active...'

while ($true) {
    Start-Sleep -Seconds 60
}
