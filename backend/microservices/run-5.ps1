<#
  Starts a TRIMMED PharmaTrack stack: only the 5 services you asked for.
  Order: Eureka (8761) -> iam / subjectenrolment / regulatory -> API Gateway (8090).

  Runs the pre-built jars with `java -jar` (no Maven, no VS Code build) so each
  service boots in ~3s. Each opens in its own window.

  Prereqs (already satisfied on this machine):
    - MySQL on localhost:3306 (root/root)
    - Java 21 on PATH
    - jars built once:  <maven> -f microservices\pom.xml install -DskipTests

  Usage:  powershell -ExecutionPolicy Bypass -File microservices\run-5.ps1
#>

$ErrorActionPreference = 'Stop'
$env:AUDIT_INTERNAL_TOKEN = "local-dev-internal-token-change-me"
$env:AUDIT_HMAC_KEY = "local-dev-hmac-key-change-me"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Start-Svc($name, $jarRelPath, $extraArgs) {
    $jar = Join-Path $root $jarRelPath
    if (-not (Test-Path $jar)) { throw "Jar not found: $jar  (build with: install -DskipTests)" }
    $argList = @('-jar', $jar) + $extraArgs
    Start-Process -FilePath 'C:\Users\SURIYA PRASAAD S\.jdks\ms-21.0.8\bin\java.exe' -ArgumentList $argList -WorkingDirectory $root -WindowStyle Normal | Out-Null
    Write-Host ("started {0}" -f $name)
}

$loc = @('--eureka.instance.prefer-ip-address=false', '--eureka.instance.hostname=localhost')

# MySQL 8 uses the caching_sha2_password auth plugin. Over a non-SSL connection the
# JDBC driver refuses to fetch the server public key unless allowPublicKeyRetrieval=true,
# so without it the datasource fails and the service shuts down on startup. These
# command-line overrides take precedence over the application.yml baked into each jar.
# (The source application.yml files are also fixed; this keeps the pre-built jars working
#  without a rebuild.)
function Db($name) {
    @(
      "--spring.datasource.url=jdbc:mysql://localhost:3306/$name`?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Kolkata",
      "--spring.datasource.password=Sur@6904"
    )
}

Write-Host '== Starting Eureka discovery (8761) =='
Start-Svc 'discovery-server' 'discovery-server\target\discovery-server-0.0.1-SNAPSHOT.jar' @()
Start-Sleep -Seconds 25

Write-Host '== Starting services =='
Start-Svc 'iam-service (8081)'              'iam-service\target\iam-service-0.0.1-SNAPSHOT.jar'              ($loc + (Db 'pharmatrack_iam_ms'))
Start-Svc 'subjectenrolment-service (8083)' 'subjectenrolment-service\target\subjectenrolment-service-0.0.1-SNAPSHOT.jar' ($loc + (Db 'pharmatrack_subjectenrolment'))
Start-Svc 'regulatory-service (8087)'       'regulatory-service\target\regulatory-service-0.0.1-SNAPSHOT.jar' ($loc + (Db 'pharmatrack_regulatory'))
Start-Sleep -Seconds 30

Write-Host '== Starting API Gateway (8090) =='
Start-Svc 'api-gateway' 'api-gateway\target\api-gateway-0.0.1-SNAPSHOT.jar' @()

Write-Host ''
Write-Host 'Launched: discovery-server, iam, subjectenrolment, regulatory, api-gateway'
Write-Host 'Eureka dashboard: http://localhost:8761'
Write-Host 'API Gateway:      http://localhost:8090'
