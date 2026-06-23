param(
    [string]$RouterIP = "192.168.1.1",
    [string]$RouterUser = "root"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " tplinked OpenWrt Installer" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if (!(Test-Path ".\portal\index.html") -or !(Test-Path ".\portal\style.css") -or !(Test-Path ".\portal\app.js")) {
    Write-Host "ERROR: Run this script from the tplinked repo folder." -ForegroundColor Red
    Write-Host "Expected files:"
    Write-Host "  .\portal\index.html"
    Write-Host "  .\portal\style.css"
    Write-Host "  .\portal\app.js"
    exit 1
}

$SshOptions = @(
    "-oHostKeyAlgorithms=+ssh-rsa",
    "-oPubkeyAcceptedAlgorithms=+ssh-rsa"
)

$ScpOptions = @(
    "-O",
    "-oHostKeyAlgorithms=+ssh-rsa",
    "-oPubkeyAcceptedAlgorithms=+ssh-rsa"
)

$Target = "$RouterUser@$RouterIP"

Write-Host "[1/7] Creating temporary installer files..." -ForegroundColor Yellow

$TempDir = Join-Path $env:TEMP "tplinked-installer"
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

$ChatScript = @'
#!/bin/sh

DB="/tmp/tplinked-chat.db"
MAX_LINES=50

urldecode() {
  printf '%b' "$(printf '%s' "$1" | sed 's/+/ /g;s/%/\\x/g')"
}

get_field() {
  echo "$POST_DATA" | tr '&' '\n' | sed -n "s/^$1=//p" | head -n 1
}

send_json_header() {
  echo "Content-Type: application/json"
  echo "Cache-Control: no-store"
  echo ""
}

ACTION="$(echo "$QUERY_STRING" | sed -n 's/.*action=\([^&]*\).*/\1/p')"

if [ "$ACTION" = "read" ]; then
  send_json_header
  echo -n '{"messages":['

  if [ -f "$DB" ]; then
    awk -F'|' '
    function esc(s) {
      gsub(/\\/,"\\\\",s)
      gsub(/"/,"\\\"",s)
      gsub(/\r/," ",s)
      gsub(/\n/," ",s)
      return s
    }
    {
      if (n > 0) printf ","
      n++

      text = $3
      for (i = 4; i <= NF; i++) text = text "|" $i

      printf "{\"time\":\"%s\",\"name\":\"%s\",\"text\":\"%s\"}", esc($1), esc($2), esc(text)
    }
    ' "$DB"
  fi

  echo ']}'
  exit 0
fi

if [ "$ACTION" = "clear" ]; then
  : > "$DB"
  send_json_header
  echo '{"ok":true}'
  exit 0
fi

read -r POST_DATA

NAME_RAW="$(get_field name)"
TEXT_RAW="$(get_field text)"

NAME="$(urldecode "$NAME_RAW" | tr -d '\r\n|' | cut -c1-20)"
TEXT="$(urldecode "$TEXT_RAW" | tr -d '\r\n|' | cut -c1-180)"

[ -z "$NAME" ] && NAME="Guest"

if [ -n "$TEXT" ]; then
  echo "$(date '+%H:%M:%S')|$NAME|$TEXT" >> "$DB"
  tail -n "$MAX_LINES" "$DB" > "$DB.tmp"
  mv "$DB.tmp" "$DB"
fi

send_json_header
echo '{"ok":true}'
'@

$StatusScript = @'
#!/bin/sh

DIR="/www/tplinked"
OUT="$DIR/status.json"
TMP="/tmp/tplinked-devices.json"

mkdir -p "$DIR"

UPTIME="$(cut -d. -f1 /proc/uptime 2>/dev/null)"
MEMTOTAL="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null)"
MEMFREE="$(awk '/MemAvailable/ {print $2}' /proc/meminfo 2>/dev/null)"

[ -z "$MEMFREE" ] && MEMFREE="$(awk '/MemFree/ {print $2}' /proc/meminfo 2>/dev/null)"
[ -z "$UPTIME" ] && UPTIME="0"
[ -z "$MEMTOTAL" ] && MEMTOTAL="1"
[ -z "$MEMFREE" ] && MEMFREE="1"

MEMUSED=$((100 - (MEMFREE * 100 / MEMTOTAL)))

echo "[" > "$TMP"

if [ -f /tmp/dhcp.leases ]; then
  awk '
  {
    name=$4;
    if (name == "*" || name == "") name="unknown";
    gsub(/[^A-Za-z0-9._-]/, "_", name);

    if (NR > 1) printf ",\n";
    printf "{\"name\":\"%s\",\"ip\":\"%s\",\"mac\":\"%s\"}", name, $3, $2;
  }
  ' /tmp/dhcp.leases >> "$TMP"
fi

echo "]" >> "$TMP"

COUNT=0
[ -f /tmp/dhcp.leases ] && COUNT="$(wc -l < /tmp/dhcp.leases)"

cat > "$OUT" << EOFJSON
{
  "status": "online",
  "ssid": "tplinked",
  "uptime": $UPTIME,
  "memory_used_percent": $MEMUSED,
  "device_count": $COUNT,
  "generated": "$(date '+%Y-%m-%d %H:%M:%S')",
  "devices": $(cat "$TMP")
}
EOFJSON
'@

$RedirectPage = @'
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=/tplinked/">
  <title>tplinked</title>
</head>
<body>
  <p>Opening tplinked...</p>
  <a href="/tplinked/">Open tplinked</a>
</body>
</html>
'@

Set-Content -Path "$TempDir\tplinked-chat" -Value $ChatScript -NoNewline
Set-Content -Path "$TempDir\tplinked-status.sh" -Value $StatusScript -NoNewline
Set-Content -Path "$TempDir\index.html" -Value $RedirectPage -NoNewline

Write-Host "[2/7] Testing SSH connection to $RouterIP..." -ForegroundColor Yellow
ssh @SshOptions $Target "echo tplinked-ssh-ok"

Write-Host "[3/7] Creating router folders..." -ForegroundColor Yellow
ssh @SshOptions $Target "mkdir -p /www/tplinked /www/cgi-bin"

Write-Host "[4/7] Uploading portal files..." -ForegroundColor Yellow
scp @ScpOptions .\portal\index.html .\portal\style.css .\portal\app.js "${Target}:/www/tplinked/"

Write-Host "[5/7] Uploading router scripts..." -ForegroundColor Yellow
scp @ScpOptions "$TempDir\tplinked-chat" "${Target}:/www/cgi-bin/tplinked-chat"
scp @ScpOptions "$TempDir\tplinked-status.sh" "${Target}:/root/tplinked-status.sh"
scp @ScpOptions "$TempDir\index.html" "${Target}:/www/index.html"

Write-Host "[6/7] Setting permissions and generating first status file..." -ForegroundColor Yellow
ssh @SshOptions $Target "chmod +x /www/cgi-bin/tplinked-chat /root/tplinked-status.sh && /root/tplinked-status.sh"

Write-Host "[7/7] Enabling status auto-update cron..." -ForegroundColor Yellow
ssh @SshOptions $Target "crontab -l > /tmp/tplinked-cron 2>/dev/null; grep -v tplinked-status /tmp/tplinked-cron > /tmp/tplinked-cron-new 2>/dev/null; echo '* * * * * /root/tplinked-status.sh' >> /tmp/tplinked-cron-new; crontab /tmp/tplinked-cron-new; /etc/init.d/cron enable; /etc/init.d/cron restart"

Remove-Item $TempDir -Recurse -Force

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host " tplinked installed successfully!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Open this in your browser:"
Write-Host "http://$RouterIP/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Direct portal URL:"
Write-Host "http://$RouterIP/tplinked/" -ForegroundColor Cyan
Write-Host ""