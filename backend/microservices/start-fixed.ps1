<#
  Corrected launcher: quotes the jar path so it survives the space in
  "Pharmatrack updated". Starts Eureka -> 9 services -> API Gateway, detached,
  logging to logs\<name>.log / .err.log.
#>
$ErrorActionPreference = 'Stop'
$env:AUDIT_INTERNAL_TOKEN = "local-dev-internal-token-change-me"
$env:AUDIT_HMAC_KEY        = "local-dev-hmac-key-change-me"

$root   = Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir = Join-Path $root 'logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$java = if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
            Join-Path $env:JAVA_HOME 'bin\java.exe'
        } else { 'java' }

$loc = '--eureka.instance.prefer-ip-address=false --eureka.instance.hostname=localhost'

function Start-Svc($name, $jarRelPath, $extraArgs) {
    $jar = Join-Path $root $jarRelPath
    if (-not (Test-Path $jar)) { throw "Jar not found: $jar" }
    $out = Join-Path $logDir "$name.log"
    $err = Join-Path $logDir "$name.err.log"
    # Single argument string with the jar path double-quoted.
    $argString = "-jar `"$jar`" $extraArgs".Trim()
    Start-Process -FilePath $java -ArgumentList $argString -WorkingDirectory $root `
        -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err | Out-Null
    Write-Host ("started {0}" -f $name)
}

Write-Host '== Eureka (8761) =='
Start-Svc 'discovery-server' 'discovery-server\target\discovery-server-0.0.1-SNAPSHOT.jar' ''
Start-Sleep -Seconds 30

Write-Host '== Services =='
Start-Svc 'iam-service'               'iam-service\target\iam-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'clinicaltrial-service'     'clinicaltrial-service\target\clinicaltrial-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'subjectenrolment-service'  'subjectenrolment-service\target\subjectenrolment-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'batch-service'             'batch-service\target\batch-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'supplychain-service'       'supplychain-service\target\supplychain-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'deviationcapa-service'     'deviationcapa-service\target\deviationcapa-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'regulatory-service'        'regulatory-service\target\regulatory-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'notification-service'      'notification-service\target\notification-service-0.0.1-SNAPSHOT.jar' $loc
Start-Svc 'audit-service'             'audit-service\target\audit-service-0.0.1-SNAPSHOT.jar' $loc
Start-Sleep -Seconds 40

Write-Host '== API Gateway (8090) =='
Start-Svc 'api-gateway' 'api-gateway\target\api-gateway-0.0.1-SNAPSHOT.jar' ''

Write-Host ''
Write-Host 'Launched. Eureka: http://localhost:8761   Gateway: http://localhost:8090'
