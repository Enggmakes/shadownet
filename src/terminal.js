// Interactive Terminal Controller with ANSI coloring, autocompletion, and realistic CLI mechanics (Levels 1 to 10)

import { sound } from './audio.js';
import { VirtualFS } from './fs.js';
import { siem } from './siem.js';
import { PacketSniffer } from './sniffer.js';

export class TerminalController {
  constructor({ terminalElement, fs, simulation, missionManager, onCommandRun }) {
    this.container = terminalElement;
    this.fs = fs;
    this.sim = simulation;
    this.missionManager = missionManager;
    this.onCommandRun = onCommandRun;
    this.sniffer = new PacketSniffer(this);

    this.history = [];
    this.historyIndex = -1;
    this.isAwaitingPassword = false;
    this.passwordCallback = null;
    this.isExecuting = false;

    // Remote session state
    this.isRemote = false;
    this.remoteFS = null;
    this.currentFS = this.fs;
    this.user = 'guest';
    this.hostname = 'shadownet';
    this.isRoot = false;

    this.setupDOM();
    this.printBanner();
  }

  setupDOM() {
    this.container.innerHTML = `
      <div class="term-output" id="termOutput"></div>
      <div class="term-prompt-line" id="termPromptLine">
        <span class="term-prompt" id="termPromptText">guest@shadownet:~$ </span>
        <div class="term-input-wrapper">
          <input type="text" id="termInput" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
          <span class="term-cursor" id="termCursor"></span>
        </div>
      </div>
    `;

    this.output = this.container.querySelector('#termOutput');
    this.promptText = this.container.querySelector('#termPromptText');
    this.input = this.container.querySelector('#termInput');
    this.cursor = this.container.querySelector('#termCursor');

    this.container.addEventListener('click', () => {
      this.input.focus();
    });

    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    this.input.addEventListener('input', () => {
      sound.playKeyClick();
      this.updateCursorPosition();
    });

    this.updatePrompt();
  }

  updatePrompt() {
    const rawCwd = this.currentFS.cwd;
    const home = this.currentFS.home;
    const displayDir = rawCwd === home ? '~' : (rawCwd.startsWith(home + '/') ? '~' + rawCwd.slice(home.length) : rawCwd);

    const userClass = this.isRoot ? 'prompt-root' : (this.isRemote ? 'prompt-remote' : 'prompt-local');
    const symbol = this.isRoot ? '#' : '$';

    this.promptText.innerHTML = `<span class="${userClass}">${this.user}@${this.hostname}</span>:<span class="prompt-path">${displayDir}</span>${symbol} `;
  }

  updateCursorPosition() {}

  handleKeyDown(e) {
    if (this.isExecuting && !this.isAwaitingPassword) {
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.abortExecution();
      }
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const val = this.input.value;
      this.input.value = '';
      sound.playEnter();
      this.processInput(val);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.history.length > 0) {
        if (this.historyIndex === -1) {
          this.historyIndex = this.history.length - 1;
        } else if (this.historyIndex > 0) {
          this.historyIndex--;
        }
        this.input.value = this.history[this.historyIndex] || '';
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.historyIndex !== -1) {
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input.value = this.history[this.historyIndex] || '';
        } else {
          this.historyIndex = -1;
          this.input.value = '';
        }
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      this.handleTabAutocomplete();
      return;
    }

    if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (this.sniffer && this.sniffer.running) {
        this.sniffer.stop();
        return;
      }
      this.printLine(`${this.promptText.innerText}${this.input.value}^C`, 'dim');
      this.input.value = '';
      this.isAwaitingPassword = false;
      this.passwordCallback = null;
      this.input.type = 'text';
      this.updatePrompt();
      return;
    }

    if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.clear();
      return;
    }
  }

  handleTabAutocomplete() {
    const text = this.input.value;
    const parts = text.split(/\s+/);
    const lastPart = parts[parts.length - 1] || '';

    const systemCommands = [
      'help', 'hint', 'objective', 'progress', 'clear', 'missions', 'submit', 'theme', 'sound',
      'nmap', 'gobuster', 'curl', 'hydra', 'sqlmap', 'hashcat', 'nc', 'ssh', 'sudo',
      'jwt-tool', 'base64', 'proxychains', 'chisel', 'impacket-getuserspns', 'getcap', 'strings', 'python3',
      'ip', 'ifconfig', 'netstat',
      'ls', 'cd', 'cat', 'pwd', 'whoami', 'id', 'uname', 'history', 'mkdir', 'rm', 'grep', 'exit'
    ];

    if (parts.length === 1) {
      const matches = systemCommands.filter(c => c.startsWith(lastPart));
      if (matches.length === 1) {
        this.input.value = matches[0] + ' ';
      } else if (matches.length > 1) {
        this.printLine(`${this.promptText.innerText}${this.input.value}`, 'dim');
        this.printLine(matches.join('   '), 'info');
      }
    } else {
      const completions = this.currentFS.getCompletions(lastPart);
      if (completions.length === 1) {
        parts[parts.length - 1] = lastPart.includes('/')
          ? lastPart.slice(0, lastPart.lastIndexOf('/') + 1) + completions[0].match
          : completions[0].match;
        this.input.value = parts.join(' ');
      } else if (completions.length > 1) {
        this.printLine(`${this.promptText.innerText}${this.input.value}`, 'dim');
        this.printLine(completions.map(c => c.match).join('   '), 'info');
      }
    }
  }

  abortExecution() {
    this.printLine('\n[!] Process interrupted by user (SIGINT)', 'warning');
    sound.playError();
    this.isExecuting = false;
    this.updatePrompt();
  }

  async processInput(rawInput) {
    const trimmed = rawInput.trim();

    if (this.isAwaitingPassword) {
      this.printLine(`${this.promptText.innerText}********`, 'dim');
      this.input.type = 'text';
      this.isAwaitingPassword = false;
      const cb = this.passwordCallback;
      this.passwordCallback = null;
      if (cb) cb(trimmed);
      return;
    }

    this.printLine(`${this.promptText.innerText}${rawInput}`);

    if (!trimmed) {
      this.scrollToBottom();
      return;
    }

    // Real-time SIEM correlation
    siem.correlateCommand(trimmed);

    this.history.push(rawInput);
    this.historyIndex = -1;

    if (this.onCommandRun) {
      this.onCommandRun(trimmed);
    }

    const tokens = trimmed.split(/\s+/);
    const cmd = tokens[0].toLowerCase();
    const args = tokens.slice(1);

    this.isExecuting = true;
    await this.executeCommand(cmd, args, trimmed);
    this.isExecuting = false;
    this.updatePrompt();
    this.scrollToBottom();
  }

  async executeCommand(cmd, args, fullCommand) {
    switch (cmd) {
      case 'help':
        this.printHelp();
        break;

      case 'hint':
        this.printHint();
        break;

      case 'objective':
        this.printObjective();
        break;

      case 'progress':
        this.printProgress();
        break;

      case 'clear':
        this.clear();
        break;

      case 'goto':
      case 'load':
      case 'select':
        this.handleJumpMission(args[0]);
        break;

      case 'report':
        document.dispatchEvent(new CustomEvent('shadownet:open_report'));
        this.printLine('[+] Opening Executive Penetration Testing & Risk Audit Report...', 'success');
        break;

      case 'tcpdump':
        this.sniffer.start(args);
        break;

      case 'aws':
        await this.handleAws(args);
        break;

      case 'docker':
        await this.handleDocker(args);
        break;

      case 'missions':
        this.printMissionsList();
        break;

      case 'flag':
      case 'submit':
        this.handleFlagSubmit(args[0] || '');
        break;

      case 'theme':
        this.handleTheme(args[0]);
        break;

      case 'sound':
        this.handleSound(args[0]);
        break;

      // LINUX UTILITIES
      case 'pwd':
        this.printLine(this.currentFS.cwd);
        break;

      case 'whoami':
        this.printLine(this.user);
        break;

      case 'id':
        if (this.isRoot) {
          this.printLine('uid=0(root) gid=0(root) groups=0(root)');
        } else if (this.user === 'svc_mssql') {
          this.printLine('uid=1002(svc_mssql) gid=1002(svc_mssql) groups=1002(svc_mssql)');
        } else if (this.isRemote) {
          this.printLine('uid=1000(devadmin) gid=1000(devadmin) groups=1000(devadmin),27(sudo)');
        } else {
          this.printLine('uid=1001(guest) gid=1001(guest) groups=1001(guest)');
        }
        break;

      case 'ls':
        this.handleLs(args);
        break;

      case 'cd':
        this.handleCd(args[0]);
        break;

      case 'cat':
        this.handleCat(args[0]);
        break;

      case 'echo':
        this.printLine(args.join(' '));
        break;

      case 'uname':
        if (args.includes('-a')) {
          this.printLine(`Linux ${this.hostname} 6.8.9-shadow-hardened #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux`);
        } else {
          this.printLine('Linux');
        }
        break;

      case 'date':
        this.printLine(new Date().toUTCString());
        break;

      case 'history':
        this.history.forEach((h, i) => {
          this.printLine(`  ${(i + 1).toString().padStart(4, ' ')}  ${h}`);
        });
        break;

      case 'mkdir':
        if (!args[0]) {
          this.printLine('mkdir: missing operand', 'error');
        } else {
          const res = this.currentFS.mkdir(args[0]);
          if (!res.success) this.printLine(res.error, 'error');
        }
        break;

      case 'ip':
      case 'ifconfig':
      case 'ipconfig':
        this.handleIpConfig();
        break;

      case 'netstat':
        this.handleNetstat();
        break;

      case 'sudo':
        await this.handleSudo(args);
        break;

      case 'ssh':
        await this.handleSSH(args);
        break;

      case 'exit':
        this.handleExit();
        break;

      // SECURITY TOOLS
      case 'nmap':
        await this.handleNmap(args);
        break;

      case 'gobuster':
        await this.handleGobuster(args);
        break;

      case 'curl':
        await this.handleCurl(args);
        break;

      case 'hydra':
        await this.handleHydra(args);
        break;

      case 'sqlmap':
        await this.handleSqlmap(args);
        break;

      case 'hashcat':
        await this.handleHashcat(args);
        break;

      case 'nc':
      case 'netcat':
        await this.handleNc(args);
        break;

      case 'jwt-tool':
        await this.handleJwtTool(args);
        break;

      case 'base64':
        await this.handleBase64(args);
        break;

      case 'proxychains':
        await this.handleProxychains(args);
        break;

      case 'chisel':
        await this.handleChisel(args);
        break;

      case 'impacket-getuserspns':
      case 'getuserspns.py':
        await this.handleImpacket(args);
        break;

      case 'getcap':
        await this.handleGetcap(args);
        break;

      case 'strings':
        await this.handleStrings(args);
        break;

      case 'python':
      case 'python3':
        await this.handlePython3(args);
        break;

      default:
        sound.playError();
        this.printLine(`bash: ${cmd}: command not found`, 'error');
        this.printLine(`Type 'help' to inspect available tools and commands.`, 'dim');
        break;
    }
  }

  printBanner() {
    const banner = `
 ███████╗██╗  ██╗ █████╗ ██████╗  ██████╗ ██╗    ██╗███╗   ██╗███████╗████████╗
 ██╔════╝██║  ██║██╔══██╗██╔══██╗██╔═══██╗██║    ██║████╗  ██║██╔════╝╚══██╔══╝
 ███████╗███████║███████║██║  ██║██║   ██║██║ █╗ ██║██╔██╗ ██║█████╗     ██║   
 ╚════██║██╔══██║██╔══██║██║  ██║██║   ██║██║███╗██║██║╚██╗██║██╔══╝     ██║   
 ███████║██║  ██║██║  ██║██████╔╝╚██████╔╝╚███╔███╔╝██║ ╚████║███████╗   ██║   
 ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═══╝╚══════╝   ╚═╝   
                                                           [ v1.0.4 - SOVEREIGN ]

[   0.001248] Linux shadownet-core 6.8.9-shadow-hardened x86_64
[   0.014291] Initializing virtual network interface tun0... [ OK ]
[   0.038102] Loading cryptographic modules (AES-256-GCM, ed25519)... [ OK ]
[   0.091140] Initializing security sandbox & ephemeral storage... [ OK ]
[   0.142857] Spawning daemon: shadownetd (PID 1337)... [ OK ]
[   0.210492] Bypassing IDS/IPS heuristic telemetry... [ OK ]
[   0.284109] Encrypted proxy chain configured: 10.13.37.4 -> 185.220.101.5

[*] Connection established.
[*] Assigned internal IP : 10.13.37.89 / mask 255.255.255.0
[*] Session ID           : SN-SEC-9941-OMEGA
[*] User context         : guest (uid=1001, gid=1001)

==============================================================================
                    MISSION 0x01: TARGET RECONNAISSANCE
==============================================================================
 TARGET IP   : 192.168.1.42
 DOMAIN      : internal.stag-apex.corp
 OBJECTIVE   : Perform network reconnaissance against the target using 'nmap'.
               Identify open ports, active services, and discover potential
               entry points for exploitation.

 INSTRUCTIONS: Run a port scan against 192.168.1.42 (e.g. 'nmap 192.168.1.42').
               Type 'help' for tool list or 'hint' for tactical guidance.
==============================================================================
`;
    this.printRaw(banner, 'accent');
  }

  printHelp() {
    const helpText = `
========================= [ SHADOWNET SYSTEM MANUAL (10 LEVELS) ] =========================
SIMULATOR CORE COMMANDS:
  help               - Display this help reference guide
  objective          - Show active mission briefing and parameters
  hint               - Receive progressive tactical hints
  progress           - Check completed operations, rank, and XP
  missions           - List all 10 operations in the campaign
  submit <FLAG>      - Submit a captured flag (e.g., submit FLAG{...})
  clear              - Clear terminal viewport (or Ctrl+L)
  theme <name>       - Switch color theme (matrix, cyber, amber, blood)
  sound <on|off>     - Toggle audio sound effects

ADVANCED SECURITY & PENTESTING ARSENAL:
  nmap [flags] <IP>  - Port scanning & service version fingerprinting (-sV, -A, -p-)
  gobuster dir ...   - Web directory brute-forcer (-u <url> -w <wordlist>)
  curl [flags] <url> - HTTP headers, REST endpoints, and diagnostic testing
  jwt-tool [options] - Inspect, tamper, and exploit JWT signatures ('alg: none', HMAC cracking)
  base64 [-d] <str>  - Base64 encode and decode data
  hydra [flags] ...  - Fast network login cracker (-l <user> -P <passlist>)
  sqlmap -u <url>    - Automatic SQL injection and database dump
  nc -lvnp <port>    - Netcat listeners & reverse shell handlers
  proxychains <cmd>  - Route any tool through dynamic SOCKS proxy tunnel
  chisel [args]      - Fast TCP/UDP tunneling and SOCKS proxy
  impacket-GetUserSPNs - Active Directory Kerberoasting TGS ticket extractor
  hashcat -m <mode>  - Password & hash cracker (1400=SHA256, 13100=Kerberos TGS)
  getcap -r /        - Enumerate Linux capabilities (cap_setuid+ep)
  python3 -c <code>  - Execute Python capability exploits and payload one-liners
  ssh <user>@<host>  - Connect to remote host targets (devadmin@192.168.1.42, svc_mssql@10.0.0.254)

LINUX UTILITIES:
  ls [-la], cd, cat, pwd, whoami, id, ip, ifconfig, netstat, sudo, history, exit
==========================================================================================
`;
    this.printRaw(helpText, 'info');
  }

  printHint() {
    const curr = this.missionManager.getCurrentMission();
    this.printLine(`\n[TACTICAL INTEL // MISSION ${curr.code}: ${curr.title.toUpperCase()}]`, 'warning');
    curr.hints.forEach((h, i) => {
      this.printLine(`  [Hint ${i + 1}] ${h}`, 'info');
    });
    this.printLine('');
  }

  printObjective() {
    const curr = this.missionManager.getCurrentMission();
    this.printLine(`\n================== [ CURRENT OPERATION: ${curr.code} ] ==================`, 'accent');
    this.printLine(`TITLE       : ${curr.title}`);
    this.printLine(`TARGET      : ${curr.target}`);
    this.printLine(`CATEGORY    : ${curr.category} | REWARD: +${curr.xp} XP`);
    this.printLine(`DESCRIPTION : ${curr.description}`);
    this.printLine(`OBJECTIVES  :`);
    curr.objectives.forEach(obj => {
      const mark = obj.done ? '[x]' : '[ ]';
      this.printLine(`  ${mark} ${obj.text}`, obj.done ? 'success' : 'dim');
    });
    this.printLine(`=================================================================\n`);
  }

  printProgress() {
    const rank = this.missionManager.getRank();
    const curr = this.missionManager.getCurrentMission();
    this.printLine(`\n================ [ OPERATIVE PROFILE & TELEMETRY ] ================`, 'accent');
    this.printLine(`OPERATOR CALLSIGN : ${this.user}@${this.hostname}`);
    this.printLine(`SECURITY RANK     : Level ${rank.level} - ${rank.title.toUpperCase()}`);
    this.printLine(`TOTAL XP          : ${this.missionManager.totalXP} XP`);
    this.printLine(`ACTIVE MISSION    : ${curr.code} - ${curr.title}`);
    this.printLine(`MISSIONS CLEARED  : ${this.missionManager.solvedMissions.size} / ${this.missionManager.missions.length}`);
    this.printLine(`===================================================================\n`);
  }

  printMissionsList() {
    this.printLine(`\n==================== [ OPERATIONS CAMPAIGN (10 LEVELS) ] ====================`, 'accent');
    this.missionManager.missions.forEach(m => {
      const isCleared = this.missionManager.solvedMissions.has(m.id);
      const isCurrent = m.id === this.missionManager.getCurrentMission().id;
      const statusBadge = isCleared ? '[COMPLETED]' : (isCurrent ? '[ACTIVE]' : '[LOCKED]');
      const tag = isCleared ? 'success' : (isCurrent ? 'accent' : 'dim');
      this.printLine(`  ${statusBadge.padEnd(12)} ${m.code}: ${m.title.padEnd(36)} (+${m.xp} XP)`, tag);
    });
    this.printLine(`============================================================================\n`);
  }

  handleJumpMission(target) {
    if (!target) {
      this.printLine('Usage: goto <1-12> or load <1-12> (e.g. goto 11 for Cloud SSRF, goto 12 for Docker Breakout)', 'warning');
      return;
    }
    const mission = this.missionManager.jumpToMission(target);
    if (!mission) {
      this.printLine(`[-] Mission '${target}' not found. Available: 1 to 12 or 0x01 to 0x0C`, 'error');
      return;
    }

    if (mission.id >= 8 && mission.id <= 10) {
      this.sim.state.socksProxyActive = true;
    }
    if (mission.id === 10) {
      this.isRemote = true;
      this.hostname = 'vault01';
      this.user = 'svc_mssql';
      this.isRoot = false;
      this.currentFS = VirtualFS.getVaultTree();
    } else if (mission.id === 5) {
      this.isRemote = true;
      this.hostname = 'stag-apex';
      this.user = 'devadmin';
      this.isRoot = false;
      this.currentFS = VirtualFS.getRemoteTree();
    } else {
      this.isRemote = false;
      this.hostname = 'shadownet';
      this.user = 'guest';
      this.isRoot = false;
      this.currentFS = this.fs;
    }

    this.updatePrompt();
    sound.playPortFound();
    this.printLine(`\n[+] ACTIVATED OPERATION ${mission.code}: ${mission.title.toUpperCase()}`, 'accent');
    this.printLine(`[*] Target: ${mission.target} | Category: ${mission.category} | Reward: +${mission.xp} XP`, 'info');
    this.printLine(`[*] Briefing: ${mission.description}`);
    this.printLine(`[!] Type 'hint' for tactical guidance or 'objective' to view mission tasks.\n`, 'dim');

    document.dispatchEvent(new CustomEvent('shadownet:mission_changed', { detail: { mission } }));
  }

  async handleAws(args) {
    sound.playKeystroke();
    const out = await this.sim.runAws(args);
    this.printLine(out, 'info');
  }

  async handleDocker(args) {
    sound.playKeystroke();
    const out = await this.sim.runDocker(args);
    this.printLine(out, 'info');
  }

  handleFlagSubmit(flagStr) {
    if (!flagStr) {
      this.printLine('Usage: submit FLAG{...} or flag FLAG{...}', 'error');
      return;
    }

    const res = this.missionManager.submitFlag(flagStr);
    if (res.success) {
      sound.playMissionComplete();
      this.printLine(`\n[+] CONGRATULATIONS! FLAG VERIFIED AND ACCEPTED!`, 'success');
      this.printLine(`[+] Awarded: +${res.awardedXp} XP | Current Rank: Level ${res.rank.level} (${res.rank.title})`, 'success');
      if (res.isGameComplete) {
        this.printLine(`\n[★★★] MASTER OF SHADOWNET: ALL 10 OPERATIONS CLEARED! FULL DOMAIN DOMINION ACHIEVED! [★★★]\n`, 'accent');
      } else {
        this.printLine(`[*] Advancing to next mission: ${res.nextMission.code} - ${res.nextMission.title}\n`, 'info');
      }
    } else if (res.alreadySolved) {
      this.printLine('[-] Flag already submitted for this operation.', 'warning');
    } else {
      sound.playError();
      this.printLine(`[-] ${res.message || 'Invalid flag. Try again or check your findings.'}`, 'error');
    }
  }

  handleTheme(name) {
    const themes = ['matrix', 'cyber', 'amber', 'blood'];
    if (!name || !themes.includes(name.toLowerCase())) {
      this.printLine(`Usage: theme <matrix | cyber | amber | blood>`, 'warning');
      return;
    }
    document.documentElement.setAttribute('data-theme', name.toLowerCase());
    this.printLine(`[+] Theme set to: ${name.toUpperCase()}`, 'success');
  }

  handleSound(val) {
    if (val === 'off') {
      sound.muted = true;
      this.printLine('[*] Sound effects muted.', 'info');
    } else if (val === 'on') {
      sound.muted = false;
      this.printLine('[*] Sound effects enabled.', 'info');
    } else {
      const isMuted = sound.toggleMute();
      this.printLine(`[*] Sound is now ${isMuted ? 'MUTED' : 'ENABLED'}.`, 'info');
    }
  }

  handleIpConfig() {
    if (this.hostname === 'vault01') {
      this.printLine(`Ethernet adapter eth0 (Domain Vault PDC):
   IPv4 Address. . . . . . . . . . . : 10.0.0.254
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.0.0.1
   Primary DNS Suffix. . . . . . . . : stag-apex.corp
   Domain Role . . . . . . . . . . . : Primary Domain Controller (PDC)
   Status. . . . . . . . . . . . . . : COMPROMISED (Root UID 0)`);
      return;
    }

    if (this.isRemote) {
      this.printLine(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    inet 192.168.1.42/24 brd 192.168.1.255 scope global eth0
3: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    inet 10.0.0.5/24 brd 10.0.0.255 scope global eth1`);
      this.printLine(`[!] Notice: eth1 connects to private internal subnet 10.0.0.0/24!`, 'warning');
    } else {
      this.printLine(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN
    inet 127.0.0.1/8 scope host lo
2: tun0: <POINTOPOINT,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 state UP
    inet 10.13.37.89/24 brd 10.13.37.255 scope global tun0`);
    }
  }

  handleNetstat() {
    this.printLine(`Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      401/sshd            
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      512/apache2         
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      620/mysqld          
tcp        0      0 10.0.0.5:445            10.0.0.254:445          ESTABLISHED -                   `);
  }

  handleLs(args) {
    const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
    const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al');
    const pathArg = args.find(a => !a.startsWith('-')) || '';

    const res = this.currentFS.ls(pathArg, showAll, longFormat);
    if (!res.success) {
      this.printLine(res.error, 'error');
      return;
    }

    if (longFormat) {
      this.printLine(`total ${res.items.length * 4}`);
      res.items.forEach(item => {
        const perms = item.type === 'dir' ? 'drwxr-xr-x' : (item.isExec ? '-rwxr-xr-x' : '-rw-r--r--');
        const user = this.user.padEnd(8, ' ');
        const size = item.size.toString().padStart(6, ' ');
        const date = 'Sep 03 14:00';
        const colorClass = item.type === 'dir' ? 'dir' : (item.isExec ? 'exec' : 'file');
        this.printLine(`${perms} 1 ${user} ${user} ${size} ${date} <span class="term-${colorClass}">${item.name}</span>`);
      });
    } else {
      const styled = res.items.map(item => {
        const colorClass = item.type === 'dir' ? 'dir' : (item.isExec ? 'exec' : 'file');
        return `<span class="term-${colorClass}">${item.name}</span>`;
      });
      this.printLine(styled.join('   '));
    }
  }

  handleCd(target) {
    const res = this.currentFS.cd(target);
    if (!res.success) {
      this.printLine(res.error, 'error');
    }
  }

  handleCat(target) {
    const res = this.currentFS.cat(target);
    if (!res.success) {
      this.printLine(res.error, 'error');
    } else {
      this.printRaw(res.content);
    }
  }

  async handleSudo(args) {
    const cmd = args[0];
    if (!this.isRemote) {
      this.printLine(`guest is not in the sudoers file. This incident will be reported.`, 'error');
      return;
    }

    if (cmd === '-l') {
      this.printLine(`Matching Defaults entries for devadmin on internal.stag-apex.corp:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\\:/usr/local/bin\\:/usr/sbin\\:/usr/bin\\:/sbin\\:/bin

User devadmin may run the following commands on internal.stag-apex.corp:
    (root) NOPASSWD: /usr/bin/find`);
      return;
    }

    if (cmd === 'su' || (cmd && cmd.includes('find'))) {
      sound.playSuccess();
      this.isRoot = true;
      this.user = 'root';
      this.currentFS.home = '/root';
      this.currentFS.cwd = '/root';
      this.updatePrompt();
      this.printLine(`[#] Privilege escalation successful! You are now ROOT (uid=0).`, 'accent');
      this.printLine(`[#] Reading flag from /root/root_flag.txt:`, 'info');
      const flagRes = this.currentFS.cat('/root/root_flag.txt');
      if (flagRes.success) {
        this.printRaw(flagRes.content, 'success');
      }
      return;
    }

    this.printLine(`sudo: ${cmd}: command not allowed or requires password`, 'error');
  }

  async handleSSH(args) {
    const target = args.find(a => a.includes('@')) || '';
    if (!target) {
      this.printLine('Usage: ssh user@host (e.g. ssh devadmin@192.168.1.42 or ssh svc_mssql@10.0.0.254)', 'error');
      return;
    }

    const [u, host] = target.split('@');

    // Remote target 1: Staging Host (192.168.1.42)
    if (host === '192.168.1.42' || host === 'internal.stag-apex.corp') {
      if (u !== 'devadmin' && u !== 'root') {
        this.printLine(`Permission denied (publickey,password).`, 'error');
        return;
      }

      this.promptPassword(`${u}@${host}'s password: `, (enteredPass) => {
        if ((u === 'devadmin' && enteredPass === 'apex2026!') || (u === 'root' && enteredPass === 'password')) {
          sound.playSuccess();
          this.isRemote = true;
          this.user = u;
          this.hostname = 'stag-apex';
          this.isRoot = (u === 'root');
          this.remoteFS = new VirtualFS(VirtualFS.getRemoteTree(), u === 'root' ? '/root' : '/home/devadmin');
          this.currentFS = this.remoteFS;
          this.updatePrompt();
          this.printLine(`\nWelcome to Ubuntu 20.04.5 LTS (GNU/Linux 5.4.0-137-generic x86_64)`);
          this.printLine(` * Management:     https://landscape.canonical.com`);
          this.printLine(`Last login: Wed Sep  3 14:02:11 2026 from 10.13.37.89`);
          this.printLine(`[+] REMOTE SHELL ESTABLISHED: ${this.user}@${this.hostname}:~$ \n`, 'success');
          this.scrollToBottom();
        } else {
          sound.playError();
          this.printLine(`Permission denied, please try again.`, 'error');
          this.scrollToBottom();
        }
      });
      return;
    }

    // Remote target 2: Domain Vault (10.0.0.254)
    if (host === '10.0.0.254' || host === 'vault01.stag-apex.corp') {
      if (!this.sim.state.socksProxyActive) {
        this.printLine(`ssh: connect to host 10.0.0.254 port 22: Network is unreachable`, 'error');
        this.printLine(`[!] Target is inside isolated 10.0.0.0/24 subnet. Use SOCKS tunnel / proxychains!`, 'warning');
        return;
      }

      if (u !== 'svc_mssql') {
        this.printLine(`Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password).`, 'error');
        return;
      }

      this.promptPassword(`svc_mssql@10.0.0.254's password: `, (enteredPass) => {
        if (enteredPass === 'Winter2026!') {
          sound.playSuccess();
          this.isRemote = true;
          this.user = 'svc_mssql';
          this.hostname = 'vault01';
          this.isRoot = false;
          this.remoteFS = new VirtualFS(VirtualFS.getVaultTree(), '/home/svc_mssql');
          this.currentFS = this.remoteFS;
          this.updatePrompt();
          this.printLine(`\nMicrosoft Windows Server 2022 [Version 10.0.17763.4974]`);
          this.printLine(`OpenSSH_for_Windows_8.1p1, LibreSSL 3.0.2`);
          this.printLine(`[+] INTERNAL DOMAIN VAULT SESSION ESTABLISHED: svc_mssql@vault01:~$ \n`, 'success');
          this.scrollToBottom();
        } else {
          sound.playError();
          this.printLine(`Permission denied, please try again.`, 'error');
          this.scrollToBottom();
        }
      });
      return;
    }

    this.printLine(`ssh: connect to host ${host} port 22: Connection timed out`, 'error');
  }

  handleExit() {
    if (this.isRemote) {
      this.isRemote = false;
      this.user = 'guest';
      this.hostname = 'shadownet';
      this.isRoot = false;
      this.currentFS = this.fs;
      this.updatePrompt();
      this.printLine(`Connection closed. Returned to local workstation.`, 'warning');
    } else {
      this.printLine(`Session active. Type 'clear' to clear display or 'help' for commands.`, 'dim');
    }
  }

  promptPassword(promptText, callback) {
    this.promptText.innerText = promptText;
    this.input.type = 'password';
    this.isAwaitingPassword = true;
    this.passwordCallback = callback;
    this.input.focus();
  }

  async handleNmap(args) {
    sound.playPacketBlip();
    this.printLine(`[*] Initiating SYN Stealth Scan & Service Fingerprint...`, 'info');
    await new Promise(r => setTimeout(r, 600));
    sound.playPacketBlip();
    const res = await this.sim.runNmap(args);
    sound.playPortFound();
    this.printRaw(res);
  }

  async handleGobuster(args) {
    sound.playPacketBlip();
    this.printLine(`[*] Spawning 10 worker threads for directory fuzzing...`, 'info');
    await new Promise(r => setTimeout(r, 700));
    sound.playPacketBlip();
    const res = await this.sim.runGobuster(args);
    sound.playSuccess();
    this.printRaw(res);
  }

  async handleCurl(args) {
    sound.playPacketBlip();
    const res = await this.sim.runCurl(args);
    this.printRaw(res);
  }

  async handleHydra(args) {
    sound.playPacketBlip();
    this.printLine(`[*] Initializing dictionary attack with 16 parallel threads...`, 'info');
    await new Promise(r => setTimeout(r, 800));
    sound.playPacketBlip();
    const res = await this.sim.runHydra(args);
    if (res.includes('valid password found')) sound.playSuccess();
    this.printRaw(res);
  }

  async handleSqlmap(args) {
    sound.playPacketBlip();
    this.printLine(`[*] Testing injection heuristics on parameters...`, 'info');
    await new Promise(r => setTimeout(r, 700));
    const res = await this.sim.runSqlmap(args);
    sound.playSuccess();
    this.printRaw(res);
  }

  async handleHashcat(args) {
    sound.playPacketBlip();
    this.printLine(`[*] Initializing OpenCL backend and kernel compilation...`, 'info');
    await new Promise(r => setTimeout(r, 700));
    const res = await this.sim.runHashcat(args);
    sound.playSuccess();
    this.printRaw(res);
  }

  async handleNc(args) {
    const res = await this.sim.runNc(args);
    this.printRaw(res);
  }

  async handleJwtTool(args) {
    sound.playPacketBlip();
    const res = await this.sim.runJwtTool(args);
    sound.playSuccess();
    this.printRaw(res);
  }

  async handleBase64(args) {
    const res = await this.sim.runBase64(args);
    this.printRaw(res);
  }

  async handleProxychains(args) {
    sound.playPacketBlip();
    const res = await this.sim.runProxychains(args);
    sound.playPortFound();
    this.printRaw(res);
  }

  async handleChisel(args) {
    sound.playPacketBlip();
    const res = await this.sim.runChisel(args);
    sound.playSuccess();
    this.printRaw(res);
  }

  async handleImpacket(args) {
    sound.playPacketBlip();
    this.printLine(`[*] Initializing Impacket Kerberos TGS extraction...`, 'info');
    await new Promise(r => setTimeout(r, 600));
    const res = await this.sim.runImpacket(args);
    sound.playSuccess();
    this.printRaw(res);
  }

  async handleGetcap(args) {
    sound.playPacketBlip();
    const res = await this.sim.runGetcap(args);
    sound.playSuccess();
    this.printRaw(res);
  }

  async handleStrings(args) {
    this.printLine(`/lib64/ld-linux-x86-64.so.2\nlibc.so.6\nsetuid\ngetuid\nexecve\n/bin/bash\ncap_setuid+ep`);
  }

  async handlePython3(args) {
    sound.playPacketBlip();
    const res = await this.sim.runPython3(args);
    if (res.includes('UID 0')) {
      sound.playMissionComplete();
      this.isRoot = true;
      this.user = 'root';
      this.updatePrompt();
    }
    this.printRaw(res);
  }

  printLine(text, tag = '') {
    const div = document.createElement('div');
    div.className = `term-line ${tag ? `term-${tag}` : ''}`;
    div.innerHTML = text;
    this.output.appendChild(div);
  }

  printRaw(text, tag = '') {
    const pre = document.createElement('pre');
    pre.className = `term-raw ${tag ? `term-${tag}` : ''}`;
    pre.textContent = text;
    this.output.appendChild(pre);
  }

  clear() {
    this.output.innerHTML = '';
  }

  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }
}
