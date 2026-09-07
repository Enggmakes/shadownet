// Interactive Visual Network Topology Radar for ShadowNet (Levels 1 to 10)

export class NetworkTopologyRadar {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);

    this.nodes = [
      {
        id: 'attacker',
        label: 'OPERATOR [tun0]',
        ip: '10.13.37.89',
        x: 0.12,
        y: 0.45,
        type: 'local',
        status: 'SECURE',
        color: '#00ff66',
        visible: true,
        ports: []
      },
      {
        id: 'proxy',
        label: 'TOR RELAY CHAIN',
        ip: '185.220.101.5',
        x: 0.35,
        y: 0.45,
        type: 'proxy',
        status: 'ANONYMIZED',
        color: '#00e5ff',
        visible: true,
        ports: []
      },
      {
        id: 'target',
        label: 'APEX STAGING (eth0)',
        ip: '192.168.1.42',
        x: 0.62,
        y: 0.32,
        type: 'target',
        status: 'UNSCANNED',
        color: '#ffb700',
        visible: true,
        ports: [
          { num: 22, name: 'SSH', status: 'unknown' },
          { num: 80, name: 'HTTP', status: 'unknown' },
          { num: 3306, name: 'MySQL', status: 'unknown' }
        ]
      },
      {
        id: 'database',
        label: 'DB CLUSTER [INTERNAL]',
        ip: '192.168.1.100',
        x: 0.82,
        y: 0.22,
        type: 'internal_db',
        status: 'ISOLATED',
        color: '#7928ca',
        visible: true,
        ports: [
          { num: 3306, name: 'MySQL (Internal)', status: 'unknown' }
        ]
      },
      {
        id: 'vault',
        label: 'DOMAIN VAULT (eth1)',
        ip: '10.0.0.254',
        x: 0.82,
        y: 0.68,
        type: 'vault',
        status: 'FOG OF WAR',
        color: '#ff0055',
        visible: false, // Discovered upon pivoting in Mission 8!
        ports: [
          { num: 88, name: 'Kerberos', status: 'unknown' },
          { num: 389, name: 'LDAP', status: 'unknown' },
          { num: 445, name: 'SMB', status: 'unknown' },
          { num: 1433, name: 'MSSQL', status: 'unknown' }
        ]
      }
    ];

    this.links = [
      { from: 'attacker', to: 'proxy' },
      { from: 'proxy', to: 'target' },
      { from: 'target', to: 'database' }
    ];

    this.packets = [];
    this.hoveredNode = null;
    this.selectedNode = this.nodes[2];
    this.animationId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.setupInteractions();
    this.startLoop();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 600;
    this.height = rect.height || 340;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
  }

  revealInternalSubnet() {
    const vault = this.getNode('vault');
    if (vault && !vault.visible) {
      vault.visible = true;
      vault.status = 'PIVOT ACTIVE';
      vault.color = '#bd00ff';
      // Add pivot link
      if (!this.links.some(l => l.from === 'target' && l.to === 'vault')) {
        this.links.push({ from: 'target', to: 'vault', isPivot: true });
      }
      this.selectedNode = vault;
      if (this.onNodeSelect) {
        this.onNodeSelect(vault);
      }
    }
  }

  setupInteractions() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found = null;
      for (const node of this.nodes) {
        if (!node.visible) continue;
        const nx = node.x * this.width;
        const ny = node.y * this.height;
        const dist = Math.hypot(mouseX - nx, mouseY - ny);
        if (dist < 28) {
          found = node;
          break;
        }
      }

      this.hoveredNode = found;
      this.canvas.style.cursor = found ? 'pointer' : 'default';
    });

    this.canvas.addEventListener('click', () => {
      if (this.hoveredNode) {
        this.selectedNode = this.hoveredNode;
        if (this.onNodeSelect) {
          this.onNodeSelect(this.selectedNode);
        }
      }
    });
  }

  sendPacket(fromId = 'attacker', toId = 'target', tool = 'nmap') {
    const colors = {
      nmap: '#00ff66',
      gobuster: '#00e5ff',
      curl: '#ffb700',
      hydra: '#ff0055',
      sqlmap: '#9d4edd',
      hashcat: '#ff5500',
      'jwt-tool': '#ff00aa',
      kerberoast: '#00ffff',
      cap_root: '#ff0000'
    };

    const packetColor = colors[tool] || '#00ff66';

    if (toId === 'vault' || toId === '10.0.0.254') {
      this.revealInternalSubnet();
      // Attacker -> Target -> Vault
      this.packets.push({
        fromNode: this.getNode('attacker'),
        toNode: this.getNode('target'),
        progress: 0,
        speed: 0.04,
        color: packetColor,
        tool,
        onComplete: () => {
          this.packets.push({
            fromNode: this.getNode('target'),
            toNode: this.getNode('vault'),
            progress: 0,
            speed: 0.04,
            color: packetColor,
            tool
          });
        }
      });
      return;
    }

    // Packet 1: Attacker -> Proxy
    this.packets.push({
      fromNode: this.getNode('attacker'),
      toNode: this.getNode('proxy'),
      progress: 0,
      speed: 0.04,
      color: packetColor,
      tool,
      onComplete: () => {
        // Packet 2: Proxy -> Target
        this.packets.push({
          fromNode: this.getNode('proxy'),
          toNode: this.getNode(toId === 'database' ? 'database' : 'target'),
          progress: 0,
          speed: 0.04,
          color: packetColor,
          tool
        });
      }
    });
  }

  getNode(id) {
    return this.nodes.find(n => n.id === id);
  }

  updateHostState(ip, portData = []) {
    const targetNode = this.nodes.find(n => n.ip === ip);
    if (targetNode) {
      targetNode.status = 'DISCOVERED';
      targetNode.color = '#00ff66';
      targetNode.ports = portData.map(p => ({
        num: p.port,
        name: p.service.toUpperCase(),
        status: p.state,
        version: p.version
      }));

      if (portData.some(p => p.port === 3306)) {
        const dbNode = this.getNode('database');
        if (dbNode) {
          dbNode.status = 'DETECTED';
          dbNode.color = '#00e5ff';
        }
      }

      if (this.onNodeSelect && this.selectedNode?.id === targetNode.id) {
        this.onNodeSelect(targetNode);
      }
    }
  }

  updateVaultState(portData = []) {
    this.revealInternalSubnet();
    const vault = this.getNode('vault');
    if (vault) {
      vault.status = 'BREACHED';
      vault.color = '#00ff66';
      vault.ports = portData.map(p => ({
        num: p.port,
        name: p.service.toUpperCase(),
        status: p.state,
        version: p.version
      }));
      if (this.onNodeSelect && this.selectedNode?.id === vault.id) {
        this.onNodeSelect(vault);
      }
    }
  }

  startLoop() {
    let t = 0;
    const render = () => {
      t += 0.03;
      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Draw Tech Grid
      this.ctx.strokeStyle = 'rgba(0, 255, 102, 0.03)';
      this.ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < this.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }
      for (let y = 0; y < this.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }

      // 2. Draw Links
      for (const link of this.links) {
        const from = this.getNode(link.from);
        const to = this.getNode(link.to);
        if (!from || !to || !from.visible || !to.visible) continue;

        const x1 = from.x * this.width;
        const y1 = from.y * this.height;
        const x2 = to.x * this.width;
        const y2 = to.y * this.height;

        this.ctx.beginPath();
        this.ctx.strokeStyle = link.isPivot ? 'rgba(189, 0, 255, 0.35)' : 'rgba(0, 255, 102, 0.15)';
        this.ctx.lineWidth = link.isPivot ? 2.5 : 2;
        this.ctx.setLineDash(link.isPivot ? [6, 3] : [4, 4]);
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      // 3. Update & Draw Data Packets
      for (let i = this.packets.length - 1; i >= 0; i--) {
        const p = this.packets[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          if (p.onComplete) p.onComplete();
          this.packets.splice(i, 1);
          continue;
        }

        const x1 = p.fromNode.x * this.width;
        const y1 = p.fromNode.y * this.height;
        const x2 = p.toNode.x * this.width;
        const y2 = p.toNode.y * this.height;

        const px = x1 + (x2 - x1) * p.progress;
        const py = y1 + (y2 - y1) * p.progress;

        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = p.color;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }

      // 4. Draw Nodes
      for (const node of this.nodes) {
        if (!node.visible) continue;
        const nx = node.x * this.width;
        const ny = node.y * this.height;
        const isHovered = this.hoveredNode === node;
        const isSelected = this.selectedNode === node;

        const pulse = (Math.sin(t + node.x * 10) + 1) * 3;
        this.ctx.beginPath();
        this.ctx.arc(nx, ny, 20 + pulse, 0, Math.PI * 2);
        this.ctx.strokeStyle = `${node.color}33`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(nx, ny, 18, 0, Math.PI * 2);
        this.ctx.fillStyle = '#080c14';
        this.ctx.fill();

        this.ctx.lineWidth = isSelected ? 3 : 2;
        this.ctx.strokeStyle = isSelected ? '#ffffff' : node.color;
        this.ctx.shadowBlur = isHovered || isSelected ? 12 : 6;
        this.ctx.shadowColor = node.color;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        this.ctx.beginPath();
        this.ctx.arc(nx, ny, 6, 0, Math.PI * 2);
        this.ctx.fillStyle = node.color;
        this.ctx.fill();

        this.ctx.font = '11px "JetBrains Mono", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(node.label, nx, ny + 32);

        this.ctx.font = '9px "JetBrains Mono", monospace';
        this.ctx.fillStyle = node.color;
        this.ctx.fillText(`${node.ip} [${node.status}]`, nx, ny + 44);
      }

      this.animationId = requestAnimationFrame(render);
    };

    this.animationId = requestAnimationFrame(render);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
