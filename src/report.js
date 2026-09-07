// Executive Penetration Testing Report & MITRE ATT&CK Certificate Generator
// Dynamic findings correlation + Direct PDF generation

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const VULNERABILITY_CATALOG = {
  1: {
    secId: 'SEC-01',
    name: 'Unrestricted Perimeter Port Enumeration & Service Fingerprinting',
    severity: 'MEDIUM',
    cvss: 5.3,
    mitre: ['T1595 Active Scanning', 'T1592 Gather Victim Host'],
    remediation: 'Deploy perimeter firewall rules dropping unsolicited external SYN scans; disable unnecessary service banners.'
  },
  2: {
    secId: 'SEC-02',
    name: 'Sensitive Developer Backup Leaked in Web Document Root (/backup_cred.txt.bak)',
    severity: 'HIGH',
    cvss: 7.5,
    mitre: ['T1190 Exploit Public-Facing App'],
    remediation: 'Remove backup files from public web server docroots. Enforce strict web server deny rules for .bak/.old/.env extensions.'
  },
  3: {
    secId: 'SEC-03',
    name: 'SSH Dictionary Spray & Weak Developer Credentials (devadmin:apex2026!)',
    severity: 'HIGH',
    cvss: 8.1,
    mitre: ['T1110 Brute Force (Hydra)', 'T1078 Valid Accounts'],
    remediation: 'Disable password authentication in sshd_config; mandate ed25519 SSH keys and activate Fail2Ban rate-limiting.'
  },
  4: {
    secId: 'SEC-04',
    name: 'SQL Injection in /search.php Exposing Database Hashes',
    severity: 'CRITICAL',
    cvss: 9.8,
    mitre: ['T1190 Exploit Public-Facing App'],
    remediation: 'Replace string-concatenated SQL queries with PDO prepared parameterized statements across all backend PHP endpoints.'
  },
  5: {
    secId: 'SEC-05',
    name: 'Sudoers Misconfiguration Privilege Escalation to Root via /usr/bin/find',
    severity: 'CRITICAL',
    cvss: 8.8,
    mitre: ['T1548 Sudo Misconfiguration'],
    remediation: 'Audit /etc/sudoers; do not grant NOPASSWD execution permissions to binaries with shell breakout capabilities.'
  },
  6: {
    secId: 'SEC-06',
    name: 'JWT Signature Bypass via Algorithm Confusion ("alg: none")',
    severity: 'HIGH',
    cvss: 8.2,
    mitre: ['T1190 Exploit Public-Facing App'],
    remediation: 'Strictly enforce asymmetric RS256 signature verification in the API gateway and explicitly reject unsigned tokens.'
  },
  7: {
    secId: 'SEC-07',
    name: 'Remote Command Execution (RCE) with Space-Filter Evasion (${IFS})',
    severity: 'CRITICAL',
    cvss: 9.8,
    mitre: ['T1059 Unix Shell'],
    remediation: 'Never invoke shell commands with user-supplied arguments; use native networking ICMP ping APIs.'
  },
  8: {
    secId: 'SEC-08',
    name: 'Missing Network Micro-Segmentation (Dual-Homed SOCKS Pivoting)',
    severity: 'HIGH',
    cvss: 7.8,
    mitre: ['T1572 Protocol Tunneling', 'T1090.003 SOCKS Proxy'],
    remediation: 'Implement VLAN firewall micro-segmentation between DMZ web tiers and internal Active Directory domain subnets.'
  },
  9: {
    secId: 'SEC-09',
    name: 'Active Directory Kerberoasting Weak SPN Service Account (svc_mssql)',
    severity: 'CRITICAL',
    cvss: 8.9,
    mitre: ['T1558.003 Kerberoasting'],
    remediation: 'Upgrade Kerberos encryption to AES-256 and enforce 25+ character complex random passwords for all service accounts.'
  },
  10: {
    secId: 'SEC-10',
    name: 'Linux File Capabilities Privilege Escalation (cap_setuid+ep on Python)',
    severity: 'CRITICAL',
    cvss: 9.1,
    mitre: ['T1068 Linux Capabilities'],
    remediation: 'Audit capabilities with getcap; strip unnecessary capabilities from scripting binaries (setcap -r /usr/bin/python3.8).'
  },
  11: {
    secId: 'SEC-11',
    name: 'AWS Instance Metadata Service (IMDSv1) SSRF & Cloud IAM Role Exfiltration',
    severity: 'CRITICAL',
    cvss: 9.6,
    mitre: ['T1552.005 Cloud Metadata (SSRF)', 'T1530 Data from Cloud Storage'],
    remediation: 'Enforce AWS IMDSv2 with mandatory session tokens and disable unused reverse proxy endpoints.'
  },
  12: {
    secId: 'SEC-12',
    name: 'Mounted Docker Control Socket Container Breakout to Physical Host Node',
    severity: 'CRITICAL',
    cvss: 9.9,
    mitre: ['T1611 Container Escape'],
    remediation: 'Never mount /var/run/docker.sock into containers; enforce rootless container runtimes with AppArmor/SELinux profiles.'
  }
};

export class PenTestReportGenerator {
  constructor(missionManager) {
    this.mm = missionManager;
    this.auditId = 'SN-SEC-' + Math.floor(100000 + Math.random() * 900000);
  }

  generateReportHTML() {
    const solved = Array.from(this.mm.solvedMissions);
    const clearedCount = solved.length;
    const totalCount = this.mm.missions.length;
    const rank = this.mm.getRank();
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // 1. Gather all active findings dynamically from solved missions
    const activeFindings = solved
      .filter(id => VULNERABILITY_CATALOG[id])
      .map(id => ({ ...VULNERABILITY_CATALOG[id], missionId: id }));

    // 2. Compute dynamic CVSS and Risk Rating
    let maxCvss = 0;
    activeFindings.forEach(f => {
      if (f.cvss > maxCvss) maxCvss = f.cvss;
    });

    let riskClass = 'medium';
    let riskLabel = 'LOW / RECON ONLY';

    if (maxCvss >= 9.0) {
      riskClass = 'critical';
      riskLabel = `OVERALL RISK: CRITICAL (CVSS ${maxCvss.toFixed(1)})`;
    } else if (maxCvss >= 7.0) {
      riskClass = 'high';
      riskLabel = `OVERALL RISK: HIGH (CVSS ${maxCvss.toFixed(1)})`;
    } else if (maxCvss >= 4.0) {
      riskClass = 'medium';
      riskLabel = `OVERALL RISK: MEDIUM (CVSS ${maxCvss.toFixed(1)})`;
    } else if (clearedCount === 0) {
      riskClass = 'medium';
      riskLabel = 'AUDIT PHASE: RECONNAISSANCE ONLY';
    }

    // 3. Gather active MITRE techniques dynamically
    const activeMitreSet = new Set();
    activeFindings.forEach(f => {
      (f.mitre || []).forEach(m => activeMitreSet.add(m.trim()));
    });

    // 4. Build MITRE column badges dynamically
    const mitreTaxonomy = [
      {
        cat: 'Reconnaissance',
        techniques: ['T1595 Active Scanning', 'T1592 Gather Victim Host']
      },
      {
        cat: 'Initial Access',
        techniques: ['T1190 Exploit Public-Facing App', 'T1078 Valid Accounts']
      },
      {
        cat: 'Credential Access',
        techniques: ['T1110 Brute Force (Hydra)', 'T1558.003 Kerberoasting']
      },
      {
        cat: 'Privilege Escalation',
        techniques: ['T1548 Sudo Misconfiguration', 'T1068 Linux Capabilities', 'T1611 Container Escape']
      },
      {
        cat: 'Lateral Movement',
        techniques: ['T1572 Protocol Tunneling', 'T1090.003 SOCKS Proxy']
      },
      {
        cat: 'Impact / Exfil',
        techniques: ['T1552.005 Cloud Metadata (SSRF)', 'T1530 Data from Cloud Storage']
      }
    ];

    const mitreGridHTML = mitreTaxonomy.map(col => `
      <div class="mitre-col">
        <span class="mitre-head">${col.cat}</span>
        ${col.techniques.map(t => {
          const isActive = activeMitreSet.has(t);
          return `<span class="mitre-badge ${isActive ? 'active' : 'inactive'}">${isActive ? '● ' : '○ '}${t}</span>`;
        }).join('')}
      </div>
    `).join('');

    // 5. Build Dynamic Findings Table Rows
    let tableRowsHTML = '';
    if (activeFindings.length === 0) {
      tableRowsHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted); font-style: italic;">
            No verified exploits confirmed yet. Run attack tools in the terminal (nmap, gobuster, hydra, sqlmap, etc.) and submit flags to document confirmed findings.
          </td>
        </tr>
      `;
    } else {
      tableRowsHTML = activeFindings.map(f => {
        let tagClass = 'tag-med';
        if (f.severity === 'CRITICAL') tagClass = 'tag-crit';
        else if (f.severity === 'HIGH') tagClass = 'tag-high';

        return `
          <tr>
            <td><strong>${f.secId}</strong></td>
            <td>${f.name}</td>
            <td><span class="${tagClass}">${f.severity}</span></td>
            <td><strong>${f.cvss.toFixed(1)}</strong></td>
            <td>${f.remediation}</td>
          </tr>
        `;
      }).join('');
    }

    // 6. Dynamic Certificate Status
    const isMasterComplete = clearedCount === totalCount && totalCount > 0;
    let certSectionHTML = '';

    if (isMasterComplete) {
      certSectionHTML = `
        <div class="cert-card">
          <div class="cert-border">
            <div class="cert-watermark">★ SHADOWNET AUDIT VERIFIED ★</div>
            <div class="cert-title">CERTIFICATE OF OFFENSIVE MASTERY</div>
            <p class="cert-sub">This verifies that the operator designated below has successfully cleared all 12 Cyber Warfare & Penetration Testing operations:</p>
            
            <div class="cert-user-name">${rank.title.toUpperCase()}</div>
            <div class="cert-stats">
              <span>Total XP: <strong>${this.mm.totalXP} / 6000 XP</strong></span>
              <span>Standing: <strong>Level ${rank.level} (Domain Sovereign)</strong></span>
              <span>Audit Status: <strong style="color: var(--accent-primary);">VERIFIED 100% COMPLETE</strong></span>
            </div>

            <div class="cert-footer">
              <span>Verification Hash: <code>${this.auditId}-SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}</code></span>
              <span>Issuing Authority: ShadowNet Cyber Warfare Institute</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const pct = Math.round((clearedCount / totalCount) * 100);
      certSectionHTML = `
        <div class="cert-locked-card">
          <div class="cert-locked-icon">🔒</div>
          <div class="cert-locked-title">OFFICIAL CERTIFICATE LOCKED</div>
          <p class="cert-sub">
            The official <strong>Certificate of Offensive Mastery</strong> unlocks automatically once all 12 campaign levels are cleared and flags submitted.
          </p>
          
          <div class="cert-progress-wrapper">
            <div class="cert-progress-label">
              <span>CURRENT AUDIT PROGRESS</span>
              <strong style="color: var(--accent-primary);">${clearedCount} / ${totalCount} Operations Cleared (${pct}%)</strong>
            </div>
            <div class="cert-progress-bar">
              <div class="cert-progress-fill" style="width: ${pct}%;"></div>
            </div>
          </div>

          <div class="cert-stats" style="margin-top: 16px; margin-bottom: 0;">
            <span>Current Operator Rank: <strong>${rank.title} (Level ${rank.level})</strong></span>
            <span>Total XP: <strong>${this.mm.totalXP} XP</strong></span>
            <span>Remaining Operations: <strong>${totalCount - clearedCount}</strong></span>
          </div>
        </div>
      `;
    }

    return `
      <div class="report-modal-content" id="reportExportArea">
        <!-- TOP SECURITY CLASSIFICATION BANNER -->
        <div class="report-top-banner">
          <span>TOP SECRET // RED TEAM ADVERSARY EMULATION // TLP:AMBER</span>
          <span>OPERATOR CLEARANCE: LEVEL ${rank.level}</span>
        </div>

        <div class="report-header">
          <div class="report-brand">
            <span class="report-logo">[+] SHADOWNET DEFENSIVE & OFFENSIVE CYBER LABS</span>
            <h2>EXECUTIVE PENETRATION TESTING & RISK AUDIT REPORT</h2>
            <p class="report-sub">Engagement ID: ${this.auditId} | Target: Apex Corp Infrastructure | Date: ${dateStr}</p>
          </div>
          <div class="report-badge-box">
            <div class="risk-pill ${riskClass}">${riskLabel}</div>
          </div>
        </div>

        <!-- 1. DYNAMIC MITRE ATT&CK MATRIX -->
        <div class="report-section">
          <h3>1. MITRE ATT&CK® ENTERPRISE MATRIX MAPPING (DYNAMIC AUDIT)</h3>
          <p class="report-sub" style="margin-bottom: 8px;">Techniques highlighted in green indicate verified attack pathways confirmed during active security testing:</p>
          <div class="mitre-grid">
            ${mitreGridHTML}
          </div>
        </div>

        <!-- 2. DYNAMIC FINDINGS TABLE -->
        <div class="report-section">
          <h3>2. VERIFIED TECHNICAL COMPROMISE FINDINGS (${clearedCount} / ${totalCount} Operations Cleared)</h3>
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 70px;">ID</th>
                <th>Operation & Vulnerability Discovered</th>
                <th style="width: 90px;">Severity</th>
                <th style="width: 60px;">CVSS</th>
                <th>Remediation Recommendation</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>
        </div>

        <!-- 3. OFFICIAL CERTIFICATE STATUS -->
        <div class="report-section cert-section">
          <h3>3. OFFICIAL SHADOWNET OFFENSIVE SECURITY CERTIFICATION</h3>
          ${certSectionHTML}
        </div>

        <!-- DOCUMENT EXECUTIVE FOOTER -->
        <div class="report-doc-footer">
          <div>
            <span>CLASSIFICATION: <strong>CONFIDENTIAL / TLP:AMBER</strong></span> &bull;
            <span>FRAMEWORK: <strong>MITRE ATT&CK v14.1 & CVSS v3.1</strong></span>
          </div>
          <div>
            <span>ISSUED BY: <strong>SHADOWNET CYBER WARFARE LABS</strong></span>
          </div>
        </div>
      </div>

      <!-- ACTION BUTTONS (EXCLUDED FROM PDF RENDER) -->
      <div class="report-actions">
        <button class="btn-ctrl btn-report" id="btnDownloadPdf">📥 Download PDF</button>
        <button class="btn-ctrl" id="btnCloseReport">Close Report</button>
      </div>
    `;
  }

  // Direct PDF Download Handler using html2canvas & jsPDF with Full-Bleed Executive Canvas
  async downloadPDF() {
    const reportElement = document.getElementById('reportExportArea');
    if (!reportElement) return;

    const btn = document.getElementById('btnDownloadPdf');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.innerHTML = '⏳ Generating PDF...';
      btn.disabled = true;
    }

    try {
      // 1. Render at 2x resolution with clean options
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#080d14',
        logging: false,
        windowWidth: 1024
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
      const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

      // Fill full page with dark cyber background to eliminate white voids and borders
      pdf.setFillColor(8, 13, 20);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Full width with internal CSS padding providing safe margins
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.setFillColor(8, 13, 20);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const filename = `ShadowNet_Security_Audit_${this.auditId}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Direct PDF export error:', err);
      window.print();
    } finally {
      if (btn) {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    }
  }
}
