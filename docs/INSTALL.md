\# tplinked Installation Guide



tplinked turns an OpenWrt router into a lightweight offline community network with a local portal, shared chat, device dashboard, bulletin board, wiki, and router status page.



\## Supported target



This project is designed for small OpenWrt routers, especially old TP-Link devices such as:



\* TP-Link TL-WR740N

\* Other lightweight OpenWrt routers with `/www` and CGI support



The router should already be running OpenWrt and should be reachable through SSH.



\## Requirements



On your PC:



\* Git

\* PowerShell

\* OpenSSH client

\* SCP client



On the router:



\* OpenWrt

\* SSH access as `root`

\* Web server serving `/www`

\* CGI support through `/www/cgi-bin`



\## Default router IP



The installer uses this router IP by default:



```txt

192.168.1.1

```



If your router has a different IP, you can pass it to the installer.



\---



\## Windows installation



Clone the repository:



```powershell

git clone https://github.com/toxi-dev/tplinked.git

cd tplinked

```



Run the installer:



```powershell

powershell -ExecutionPolicy Bypass -File .\\install.ps1

```



If your router IP is different:



```powershell

powershell -ExecutionPolicy Bypass -File .\\install.ps1 -RouterIP 192.168.0.1

```



When SSH asks if you trust the router, type:



```txt

yes

```



After installation, open:



```txt

http://192.168.1.1/

```



or directly:



```txt

http://192.168.1.1/tplinked/

```



\---



\## What the installer does



The installer copies the portal files to:



```txt

/www/tplinked/

```



It installs the shared chat script at:



```txt

/www/cgi-bin/tplinked-chat

```



It installs the router status script at:



```txt

/root/tplinked-status.sh

```



It also creates a homepage redirect at:



```txt

/www/index.html

```



The router status file is generated here:



```txt

/www/tplinked/status.json

```



A cron job updates the status file every minute.



\---



\## Features installed



\* Offline portal

\* Shared router chat

\* Router status dashboard

\* Connected device list from DHCP leases

\* Radar-style dashboard

\* Local bulletin board

\* Offline wiki

\* File notes page



\---



\## Notes for tiny routers



Some old routers have very little storage and memory. tplinked avoids heavy software like Node.js, PHP, databases, or package installs.



Chat messages are stored in RAM at:



```txt

/tmp/tplinked-chat.db

```



This means messages reset when the router reboots. This protects the router flash from unnecessary writes.



\---



\## Uninstall manually



SSH into the router:



```powershell

ssh root@192.168.1.1

```



Then run:



```sh

rm -rf /www/tplinked

rm -f /www/cgi-bin/tplinked-chat

rm -f /root/tplinked-status.sh

rm -f /tmp/tplinked-chat.db

rm -f /tmp/tplinked-devices.json

crontab -l | grep -v tplinked-status | crontab -

```



If you want to remove the homepage redirect too:



```sh

rm -f /www/index.html

```



\---



\## Troubleshooting



\### SSH error about `ssh-rsa`



Some old OpenWrt routers use older SSH keys. The installer already includes compatibility options for this.



Manual SSH command:



```powershell

ssh -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedAlgorithms=+ssh-rsa root@192.168.1.1

```



\### SCP upload fails



Use legacy SCP mode:



```powershell

scp -O -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedAlgorithms=+ssh-rsa file.txt root@192.168.1.1:/tmp/

```



\### Chat does not sync between devices



Check that the chat script exists:



```sh

ls -l /www/cgi-bin/tplinked-chat

```



Check that it is executable:



```sh

chmod +x /www/cgi-bin/tplinked-chat

```



Then open:



```txt

http://192.168.1.1/cgi-bin/tplinked-chat?action=read

```



You should see JSON output.



\### Device list does not update



Run the status script manually:



```sh

/root/tplinked-status.sh

```



Then check:



```txt

http://192.168.1.1/tplinked/status.json

```



