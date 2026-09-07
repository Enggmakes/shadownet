// Main Application Orchestrator for ShadowNet Web UI (Operations 1 to 12 & Enterprise SOC)
import './style.css';
import confetti from 'canvas-confetti';
import { sound } from './audio.js';
import { VirtualFS } from './fs.js';
import { SecuritySimulation } from './simulation.js';
import { MissionManager } from './missions.js';
import { NetworkTopologyRadar } from './topology.js';
import { TerminalController } from './terminal.js';
import { siem } from './siem.js';
import { PenTestReportGenerator } from './report.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Core Systems
  const fs = new VirtualFS();
  const simulation = new SecuritySimulation();
  const missionManager = new MissionManager();
  const reportGen = new PenTestReportGenerator(missionManager);

  // Topology Radar
  const radarBox = document.getElementById('radarBox');
  const topology = new NetworkTopologyRadar(radarBox);

  // Terminal Controller
  const terminalElement = document.getElementById('terminal');
  const terminal = new TerminalController({
    terminalElement,
    fs,
    simulation,
    missionManager,
    onCommandRun: (cmdStr) => {
      checkCommandTriggers(cmdStr);
    }
  });

  // DOM Elements
  const hudTarget = document.getElementById('hudTarget');
  const hudRank = document.getElementById('hudRank');
  const hudXp = document.getElementById('hudXp');
  const hudSession = document.getElementById('hudSession');
  const missionCode = document.getElementById('missionCode');
  const missionTitle = document.getElementById('missionTitle');
  const missionDesc = document.getElementById('missionDesc');
  const objectivesList = document.getElementById('objectivesList');
  const flagForm = document.getElementById('flagForm');
  const flagInput = document.getElementById('flagInput');
  const hintsBody = document.getElementById('hintsBody');
  const btnToggleHints = document.getElementById('btnToggleHints');
  const portShieldsList = document.getElementById('portShieldsList');
  const portsCountLabel = document.getElementById('portsCountLabel');
  const btnAudio = document.getElementById('btnAudio');
  const audioIcon = document.getElementById('audioIcon');
  const btnCrt = document.getElementById('btnCrt');
  const themeSelector = document.getElementById('themeSelector');
  const scratchpadArea = document.getElementById('scratchpadArea');
  const opSelector = document.getElementById('opSelector');
  const sidebarOpSelect = document.getElementById('sidebarOpSelect');
  const btnReport = document.getElementById('btnReport');
  const reportModal = document.getElementById('reportModal');
  const reportModalContainer = document.getElementById('reportModalContainer');

  // Load Scratchpad
  const savedNotes = localStorage.getItem('shadownet_notes');
  if (savedNotes) {
    scratchpadArea.value = savedNotes;
  }
  scratchpadArea.addEventListener('input', () => {
    localStorage.setItem('shadownet_notes', scratchpadArea.value);
  });

  // Wire Simulation Telemetry to Topology Radar
  simulation.subscribe((event, data) => {
    if (event === 'packet_send') {
      topology.sendPacket(data.from, data.to, data.tool);
    } else if (event === 'host_scanned') {
      topology.updateHostState(data.ip, data.ports);
      updatePortBadges(data.ports);
    } else if (event === 'internal_subnet_discovered') {
      topology.revealInternalSubnet();
      terminal.printLine(`\n[+] TOPOLOGY ALERT: Dynamic SOCKS Pivot established! Internal Subnet (10.0.0.0/24) exposed!`, 'accent');
    } else if (event === 'vault_scanned') {
      topology.updateVaultState(data.ports);
      appendVaultPorts(data.ports);
    } else if (event === 'reverse_shell_triggered') {
      sound.playSuccess();
      terminal.printLine(`\n[+] REVERSE TCP SHELL RECEIVED from 192.168.1.42:4444!`, 'success');
      terminal.printLine(`[+] Type 'whoami' or commands to interact with the host.\n`, 'accent');
    }
  });

  topology.onNodeSelect = (node) => {
    const detailsEl = document.getElementById('radarNodeDetails');
    if (detailsEl) {
      const openPorts = (node.ports || []).filter(p => p.status === 'open').map(p => `${p.num}/${p.name}`).join(', ');
      detailsEl.innerText = `${node.label} (${node.ip}) — ${openPorts ? `Open: [${openPorts}]` : `Status: ${node.status}`}`;
    }
  };

  // Wire SIEM Live Alerts & Defenses
  let totalAlertsCount = 0;
  let critAlertsCount = 0;

  siem.subscribe((event, data) => {
    if (event === 'new_alert') {
      appendSiemAlert(data);
    } else if (event === 'defense_toggle') {
      updateDefenseStatus();
    }
  });

  function appendSiemAlert(alert) {
    totalAlertsCount++;
    if (alert.severity === 'CRITICAL') critAlertsCount++;

    const badgeAlerts = document.getElementById('badgeAlerts');
    const totalEl = document.getElementById('siemTotalEvents');
    const critEl = document.getElementById('siemCritEvents');
    const feed = document.getElementById('siemAlertFeed');

    if (badgeAlerts) badgeAlerts.innerText = `${totalAlertsCount} Alerts`;
    if (totalEl) totalEl.innerText = totalAlertsCount;
    if (critEl) critEl.innerText = critAlertsCount;

    if (feed) {
      const placeholder = feed.querySelector('.siem-placeholder');
      if (placeholder) placeholder.remove();

      const card = document.createElement('div');
      card.className = `siem-alert-card ${alert.severity.toLowerCase()}`;
      card.innerHTML = `
        <div class="alert-top-row">
          <span class="alert-severity-badge ${alert.severity.toLowerCase()}">${alert.severity}</span>
          <span class="alert-rule">${alert.ruleId} [${alert.sensor}]</span>
          <span style="font-size: 0.65rem; color: var(--text-muted);">${alert.timestamp}</span>
        </div>
        <div class="alert-desc">${alert.description}</div>
        <div class="alert-endpoints">
          <span>SRC: ${alert.src}</span>
          <span>➔ DST: ${alert.dst}</span>
        </div>
        <div class="alert-mitigation">Mitigation: ${alert.mitigation}</div>
      `;
      feed.insertBefore(card, feed.firstChild);
    }
  }

  function updateDefenseStatus() {
    const activeList = [];
    if (siem.defenses.fail2ban) activeList.push('Fail2Ban');
    if (siem.defenses.waf) activeList.push('ModSec WAF');
    if (siem.defenses.hardening) activeList.push('Auditd Hardening');

    const statusEl = document.getElementById('socPostureText');
    if (statusEl) {
      if (activeList.length === 0) {
        statusEl.innerText = 'Offensive Training Lab (Permissive)';
        statusEl.style.color = 'var(--accent-primary)';
      } else {
        statusEl.innerText = `Active Shields: [${activeList.join(', ')}]`;
        statusEl.style.color = '#ff8800';
      }
    }
  }

  const toggleFail2ban = document.getElementById('toggleFail2ban');
  const toggleWaf = document.getElementById('toggleWaf');
  const toggleHardening = document.getElementById('toggleHardening');

  if (toggleFail2ban) toggleFail2ban.addEventListener('change', () => { siem.toggleDefense('fail2ban'); });
  if (toggleWaf) toggleWaf.addEventListener('change', () => { siem.toggleDefense('waf'); });
  if (toggleHardening) toggleHardening.addEventListener('change', () => { siem.toggleDefense('hardening'); });

  // Tab Navigation
  const tabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-content-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sound.playEnter();
      const targetTab = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const activePane = document.getElementById(`pane-${targetTab}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      if (targetTab === 'topology') {
        topology.resize();
      } else if (targetTab === 'terminal') {
        terminal.input.focus();
      }
    });
  });

  // Quick Action Chips & Arsenal Cheat Sheet click-to-run
  function attachCommandTriggers() {
    document.querySelectorAll('[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmd) {
          const termTab = document.querySelector('[data-tab="terminal"]');
          if (termTab && !termTab.classList.contains('active')) {
            termTab.click();
          }
          terminal.input.value = cmd;
          terminal.input.focus();
          terminal.processInput(cmd);
        }
      });
    });
  }
  attachCommandTriggers();

  // Operation Selector Dropdowns (Header + Sidebar)
  function handleOpSelection(newId) {
    terminal.handleJumpMission(newId);
  }

  if (opSelector) {
    opSelector.addEventListener('change', (e) => {
      handleOpSelection(e.target.value);
    });
  }

  if (sidebarOpSelect) {
    sidebarOpSelect.addEventListener('change', (e) => {
      handleOpSelection(e.target.value);
    });
  }

  document.addEventListener('shadownet:mission_changed', (e) => {
    const mission = e.detail.mission;
    if (opSelector) opSelector.value = mission.id;
    if (sidebarOpSelect) sidebarOpSelect.value = mission.id;
    updateHUD();
  });

  // Pen-Test Report Modal
  function openReportModal() {
    sound.playEnter();
    reportModalContainer.innerHTML = reportGen.generateReportHTML();
    reportModal.classList.remove('hidden');

    const btnClose = document.getElementById('btnCloseReport');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        reportModal.classList.add('hidden');
      });
    }

    const btnDownload = document.getElementById('btnDownloadPdf');
    if (btnDownload) {
      btnDownload.addEventListener('click', () => {
        sound.playEnter();
        reportGen.downloadPDF();
      });
    }
  }

  if (btnReport) btnReport.addEventListener('click', openReportModal);
  document.addEventListener('shadownet:open_report', openReportModal);

  if (reportModal) {
    reportModal.addEventListener('click', (e) => {
      if (e.target === reportModal) reportModal.classList.add('hidden');
    });
  }

  // Flag Submission Form
  flagForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = flagInput.value.trim();
    if (!val) return;

    terminal.handleFlagSubmit(val);
    flagInput.value = '';
    updateHUD();

    if (missionManager.solvedMissions.size > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ff66', '#00e5ff', '#ffb700', '#ffffff']
      });
    }
  });

  // Toggle Hints
  let hintsRevealed = false;

  function setHintsState(revealed) {
    hintsRevealed = revealed;
    btnToggleHints.innerText = hintsRevealed ? 'HIDE' : 'SHOW';
    if (hintsRevealed) {
      hintsBody.classList.remove('hidden');
      hintsBody.style.display = 'flex';
      renderHints();
    } else {
      hintsBody.classList.add('hidden');
      hintsBody.style.display = 'none';
      hintsBody.innerHTML = '';
    }
  }

  btnToggleHints.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHintsState(!hintsRevealed);
    sound.playKeystroke();
  });

  // Audio Toggle
  btnAudio.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    audioIcon.innerText = isMuted ? '🔇' : '🔊';
  });

  // CRT Scanlines Toggle
  btnCrt.addEventListener('click', () => {
    document.body.classList.toggle('crt-scanlines');
    sound.playKeystroke();
  });

  // Theme Selector
  themeSelector.addEventListener('change', (e) => {
    terminal.handleTheme(e.target.value);
  });

  // Mission Objective Triggers (Operations 1 to 12)
  function checkCommandTriggers(cmdStr) {
    const curr = missionManager.getCurrentMission();

    if (curr.id === 1) {
      if (cmdStr.startsWith('nmap')) {
        curr.objectives[0].done = true;
        if (cmdStr.includes('192.168.1.42')) {
          curr.objectives[1].done = true;
        }
      }
    } else if (curr.id === 2) {
      if (cmdStr.startsWith('gobuster')) curr.objectives[0].done = true;
      if (cmdStr.includes('robots.txt') || cmdStr.includes('backup_cred')) curr.objectives[1].done = true;
    } else if (curr.id === 3) {
      if (cmdStr.startsWith('hydra')) {
        curr.objectives[0].done = true;
        curr.objectives[1].done = true;
      }
    } else if (curr.id === 4) {
      if (cmdStr.startsWith('sqlmap')) {
        curr.objectives[0].done = true;
        if (cmdStr.includes('--dump') || cmdStr.includes('users')) curr.objectives[1].done = true;
      }
    } else if (curr.id === 5) {
      if (cmdStr.startsWith('ssh')) curr.objectives[0].done = true;
      if (cmdStr.includes('sudo -l')) curr.objectives[1].done = true;
      if (cmdStr.includes('sudo su') || cmdStr.includes('find')) curr.objectives[2].done = true;
    } else if (curr.id === 6) {
      if (cmdStr.includes('api/v1/auth')) curr.objectives[0].done = true;
      if (cmdStr.includes('jwt-tool') || cmdStr.includes('base64')) curr.objectives[1].done = true;
      if (cmdStr.includes('api/v1/admin/debug')) curr.objectives[2].done = true;
    } else if (curr.id === 7) {
      if (cmdStr.includes('nc -lvnp 4444') || cmdStr.includes('nc -l')) curr.objectives[0].done = true;
      if (cmdStr.includes('ping') && (cmdStr.includes('${IFS}') || cmdStr.includes('%0A'))) curr.objectives[1].done = true;
      if (cmdStr.includes('4444') || cmdStr.includes('/dev/tcp')) curr.objectives[2].done = true;
    } else if (curr.id === 8) {
      if (cmdStr.startsWith('ip') || cmdStr.startsWith('ifconfig') || cmdStr.startsWith('ipconfig')) curr.objectives[0].done = true;
      if (cmdStr.includes('chisel') || cmdStr.includes('-D 1080')) curr.objectives[1].done = true;
      if (cmdStr.includes('proxychains') && cmdStr.includes('10.0.0.254')) curr.objectives[2].done = true;
    } else if (curr.id === 9) {
      if (cmdStr.includes('GetUserSPNs') || cmdStr.includes('impacket')) curr.objectives[0].done = true;
      if (cmdStr.includes('13100')) curr.objectives[1].done = true;
    } else if (curr.id === 10) {
      if (cmdStr.includes('ssh svc_mssql')) curr.objectives[0].done = true;
      if (cmdStr.includes('getcap')) curr.objectives[1].done = true;
      if (cmdStr.includes('python') && (cmdStr.includes('setuid') || cmdStr.includes('os.setuid'))) curr.objectives[2].done = true;
    } else if (curr.id === 11) {
      if (cmdStr.includes('169.254.169.254') || cmdStr.includes('security-credentials')) curr.objectives[0].done = true;
      if (cmdStr.includes('sts get-caller-identity')) curr.objectives[1].done = true;
      if (cmdStr.includes('s3 cp') || cmdStr.includes('cloud_flag.txt')) curr.objectives[2].done = true;
    } else if (curr.id === 12) {
      if (cmdStr.includes('cgroup')) curr.objectives[0].done = true;
      if (cmdStr.includes('docker ps') || cmdStr.includes('docker.sock')) curr.objectives[1].done = true;
      if (cmdStr.includes('docker run') && (cmdStr.includes('/mnt/host') || cmdStr.includes('chroot'))) curr.objectives[2].done = true;
    }

    updateHUD();
  }

  // Update Port Badges
  function updatePortBadges(ports) {
    ports.forEach(p => {
      const badge = document.getElementById(`port-${p.port}-badge`);
      if (badge) {
        badge.className = 'port-badge-open';
        badge.innerText = `${p.state.toUpperCase()} (${p.service.toUpperCase()})`;
      }
    });

    const openCount = ports.filter(p => p.state === 'open').length;
    portsCountLabel.innerText = `${openCount} / 3 Discovered`;
    document.getElementById('badgePorts').innerText = `${openCount} Ports`;
  }

  function appendVaultPorts(ports) {
    ports.forEach(p => {
      let existing = document.getElementById(`port-${p.port}-badge`);
      if (!existing) {
        const div = document.createElement('div');
        div.className = 'port-card';
        div.innerHTML = `
          <span>Port ${p.port}/tcp - ${p.service.toUpperCase()} (Vault)</span>
          <span class="port-badge-open" id="port-${p.port}-badge">OPEN</span>
        `;
        portShieldsList.appendChild(div);
      }
    });
    portsCountLabel.innerText = `Vault Ports Discovered`;
    document.getElementById('badgePorts').innerText = `7 Ports Active`;
  }

  // Update HUD
  function updateHUD() {
    const curr = missionManager.getCurrentMission();
    const rank = missionManager.getRank();

    hudRank.innerText = `Level ${rank.level} // ${rank.title}`;
    hudXp.innerText = `${missionManager.totalXP} / 6000 XP`;
    hudTarget.innerText = curr.target;
    hudSession.innerText = `${terminal.user}@${terminal.hostname}`;

    missionCode.innerText = curr.code;
    missionTitle.innerText = curr.title;
    missionDesc.innerText = curr.description;

    if (opSelector) opSelector.value = curr.id;
    if (sidebarOpSelect) sidebarOpSelect.value = curr.id;

    // Render Objectives
    objectivesList.innerHTML = '';
    curr.objectives.forEach(obj => {
      const item = document.createElement('div');
      item.className = `obj-item ${obj.done ? 'done' : ''}`;
      item.innerHTML = `
        <div class="obj-checkbox">${obj.done ? '✓' : ''}</div>
        <span>${obj.text}</span>
      `;
      objectivesList.appendChild(item);
    });

    if (hintsRevealed) {
      renderHints();
    } else {
      setHintsState(false);
    }
  }

  // Render Hints
  function renderHints() {
    hintsBody.innerHTML = '';
    const curr = missionManager.getCurrentMission();

    curr.hints.forEach((hint, idx) => {
      const div = document.createElement('div');
      div.className = 'hint-item';
      div.innerHTML = `<strong>Hint ${idx + 1}:</strong> ${hint}`;
      hintsBody.appendChild(div);
    });
  }

  updateHUD();
});
