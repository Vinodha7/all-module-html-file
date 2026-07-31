<#
  Starts the full PharmaTrack microservices stack on THIS machine.
  - Uses the local JDK 21 (java on PATH / JAVA_HOME).
  - Connects to the local MySQL (root / password 'root') as configured in each
    service's application.yml (no password override needed).
  - Order: Eureka (8761) -> 9 services -> API Gateway (8090).
  - Each service logs to microservices\logs\<name>.log and runs detached.

  Usage:  powershell -ExecutionPolicy Bypass -File microservices\start-local.ps1
#>

$ErrorActionPreference = 'Stop'
$env:AUDIT_INTERNAL_TOKEN = "local-dev-internal-token-change-me"
$env:AUDIT_HMAC_KEY        = "local-dev-hmac-key-change-me"

$root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir  = Join-Path $root 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# Resolve a java.exe: prefer JAVA_HOME, else PATH.
$java = if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
            Join-Path $env:JAVA_HOME 'bin\java.exe'
        } else { 'java' }

$loc = @('--eureka.instance.prefer-ip-address=false', '--eureka.instance.hostname=localhost')

function Start-Svc($name, $jarRelPath, $extraArgs) {
    $jar = Join-Path $root $jarRelPath
    if (-not (Test-Path $jar)) { throw "Jar not found: $jar  (build first: mvn -f microservices\pom.xml install -DskipTests)" }
    $out = Join-Path $logDir "$name.log"
    $err = Join-Path $logDir "$name.err.log"
    $argList = @('-jar', $jar) + $extraArgs
    Start-Process -FilePath $java -ArgumentList $argList -WorkingDirectory $root `
        -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
    Write-Host ("started {0}  (log: logs\{0}.log)" -f $name)
}

Write-Host '== Starting Eureka discovery (8761) =='
Start-Svc 'discovery-server' 'discovery-server\target\discovery-server-0.0.1-SNAPSHOT.jar' @()
Start-Sleep -Seconds 30

Write-Host '== Starting services =='
Start-Svc 'iam-service'              'iam-service\target\iam-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'clinicaltrial-service'   'clinicaltrial-service\target\clinicaltrial-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'subjectenrolment-service' 'subjectenrolment-service\target\subjectenrolment-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'batch-service'           'batch-service\target\batch-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'supplychain-service'     'supplychain-service\target\supplychain-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'deviationcapa-service'   'deviationcapa-service\target\deviationcapa-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'regulatory-service'      'regulatory-service\target\regulatory-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'notification-service'    'notification-service\target\notification-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'audit-service'           'audit-service\target\audit-service-0.0.1-SNAPSHOT.jar' $loc
Start-Sleep -Seconds 40

Write-Host '== Starting API Gateway (8090) =='
Start-Svc 'api-gateway' 'api-gateway\target\api-gateway-0.0.1-SNAPSHOT.jar' @()

Write-Host ''
Write-Host 'All processes launched (detached).'
Write-Host 'Eureka dashboard:              http://localhost:8761'
Write-Host 'API Gateway (frontend target): http://localhost:8090'
