// Live Blue Team SOC SIEM & EDR Telemetry Engine

export class SIEMEngine {
  constructor() {
    this.alerts = [];
    this.defenses = {
      fail2ban: false,
      waf: false,
      hardening: false
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

  toggleDefense(defenseKey) {
    if (this.defenses.hasOwnProperty(defenseKey)) {
      this.defenses[defenseKey] = !this.defenses[defenseKey];
      this.notify('defense_toggle', { key: defenseKey, active: this.defenses[defenseKey] });
      return this.defenses[defenseKey];
    }
    return false;
  }

  addAlert({ ruleId, severity, sensor, description, src, dst, mitigation }) {
    const alert = {
      id: 'EVT-' + Math.floor(100000 + Math.random() * 900000),
      timestamp: new Date().toISOString().split('T')[1].slice(0, 8),
      ruleId,
      severity, // 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO'
      sensor,   // 'Suricata IDS', 'Wazuh EDR', 'Fail2ban', 'ModSecurity', 'Auditd', 'AWS CloudTrail', 'Falco'
      description,
      src: src || '10.13.37.89',
      dst: dst || '192.168.1.42',
      mitigation
    };

    this.alerts.unshift(alert);
    if (this.alerts.length > 50) this.alerts.pop();

    this.notify('new_alert', alert);
    return alert;
  }

  // Correlate terminal commands with real SIEM signatures
  correlateCommand(cmdStr) {
    const cmd = cmdStr.toLowerCase();

    if (cmd.startsWith('nmap')) {
      return this.addAlert({
        ruleId: 'SURICATA-1002',
        severity: 'HIGH',
        sensor: 'Suricata IDS',
        description: 'High-frequency SYN port scan detected against TCP ports (22, 80, 3306)',
        src: '10.13.37.89',
        dst: '192.168.1.42',
        mitigation: 'Deploy firewall rate-limiting or drop aggressive scanning CIDRs.'
      });
    }

    if (cmd.startsWith('gobuster') || cmd.startsWith('dirb')) {
      return this.addAlert({
        ruleId: 'MODSEC-1044',
        severity: 'MEDIUM',
        sensor: 'ModSecurity WAF',
        description: 'Rapid URI brute-forcing & 404 anomaly threshold exceeded (common.txt wordlist)',
        src: '10.13.37.89',
        dst: '192.168.1.42:80',
        mitigation: 'Implement Nginx/Apache fail2ban jail for HTTP 404 burst requests.'
      });
    }

    if (cmd.startsWith('hydra')) {
      return this.addAlert({
        ruleId: 'FAIL2BAN-2004',
        severity: 'CRITICAL',
        sensor: 'Fail2ban / SSHd',
        description: 'Multi-threaded SSH dictionary attack detected for user: devadmin',
        src: '10.13.37.89',
        dst: '192.168.1.42:22',
        mitigation: 'Enforce publickey-only authentication and enable fail2ban maxretry=3.'
      });
    }

    if (cmd.startsWith('sqlmap') || cmd.includes('--dbs') || cmd.includes('--dump')) {
      return this.addAlert({
        ruleId: 'MODSEC-3011',
        severity: 'CRITICAL',
        sensor: 'ModSecurity WAF',
        description: 'Heuristic SQL injection sequence detected in parameter [query] (UNION/Blind)',
        src: '10.13.37.89',
        dst: '192.168.1.42/search.php',
        mitigation: 'Refactor PHP queries to use PDO parameterized prepared statements.'
      });
    }

    if (cmd.includes('jwt-tool') || cmd.includes('alg:none') || cmd.includes('alg: none')) {
      return this.addAlert({
        ruleId: 'APIGW-3045',
        severity: 'HIGH',
        sensor: 'Kong API Gateway',
        description: 'JWT signature bypass attempt: token payload parsed with algorithm "none"',
        src: '10.13.37.89',
        dst: '192.168.1.42/api/v1',
        mitigation: 'Enforce asymmetric RS256 algorithm verification and strictly reject unsigned tokens.'
      });
    }

    if (cmd.includes('nc -lvnp 4444') || cmd.includes('/dev/tcp')) {
      return this.addAlert({
        ruleId: 'ZEEK-4001',
        severity: 'CRITICAL',
        sensor: 'Zeek Network Monitor',
        description: 'Anomalous outbound reverse TCP connection established on high-port 4444',
        src: '192.168.1.42:54122',
        dst: '10.13.37.89:4444',
        mitigation: 'Deploy strict egress filtering: block all outbound traffic except 80/443.'
      });
    }

    if (cmd.includes('chisel') || cmd.includes('proxychains')) {
      return this.addAlert({
        ruleId: 'SURICATA-4015',
        severity: 'CRITICAL',
        sensor: 'Suricata IDS',
        description: 'Encrypted SOCKS5 tunneling proxy beaconing across subnet boundary 10.0.0.0/24',
        src: '10.0.0.5',
        dst: '10.0.0.254',
        mitigation: 'Enforce micro-segmentation between DMZ hosts and Active Directory controllers.'
      });
    }

    if (cmd.includes('getuserspns') || cmd.includes('impacket')) {
      return this.addAlert({
        ruleId: 'WIN-4769',
        severity: 'HIGH',
        sensor: 'Wazuh EDR (AD Domain)',
        description: 'Kerberos TGS request ticket generated for SPN: MSSQLSvc/db01 with RC4-HMAC',
        src: '10.0.0.5',
        dst: '10.0.0.254:88',
        mitigation: 'Configure AES256 Kerberos encryption for service accounts and set 25+ char passwords.'
      });
    }

    if (cmd.includes('python3') && (cmd.includes('setuid') || cmd.includes('os.setuid'))) {
      return this.addAlert({
        ruleId: 'AUDITD-5022',
        severity: 'CRITICAL',
        sensor: 'Linux Auditd (Host)',
        description: 'Privilege escalation alert: Process setuid(0) executed via cap_setuid+ep',
        src: '10.0.0.254',
        dst: 'Local Process',
        mitigation: 'Strip unnecessary file capabilities: setcap -r /usr/bin/python3.8'
      });
    }

    if (cmd.includes('169.254.169.254') || cmd.includes('aws')) {
      return this.addAlert({
        ruleId: 'CLOUDTRAIL-6001',
        severity: 'HIGH',
        sensor: 'AWS CloudTrail & GuardDuty',
        description: 'SSRF Instance Metadata query to IMDSv1. Role credentials accessed: ApexCloudRole',
        src: '192.168.1.42',
        dst: '169.254.169.254',
        mitigation: 'Enforce AWS IMDSv2 with mandatory token session headers (HttpPutResponseHopLimit=1).'
      });
    }

    if (cmd.includes('docker.sock') || (cmd.includes('docker run') && cmd.includes('/mnt/host'))) {
      return this.addAlert({
        ruleId: 'FALCO-7001',
        severity: 'CRITICAL',
        sensor: 'Falco Container Runtime',
        description: 'Container Escape: Root mount of physical host filesystem (/:/mnt/host) detected!',
        src: 'Container Namespace',
        dst: 'Physical Host Node',
        mitigation: 'Do not mount docker.sock inside containers. Enforce rootless Docker & AppArmor.'
      });
    }

    return null;
  }
}

export const siem = new SIEMEngine();
