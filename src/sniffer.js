// Live Packet Sniffer Engine (Simulated tcpdump)

export class PacketSniffer {
  constructor(terminal) {
    this.terminal = terminal;
    this.running = false;
    this.intervalId = null;
  }

  start(args = []) {
    const iface = args.find(a => a.startsWith('-i')) ? args[args.indexOf('-i') + 1] || 'tun0' : 'tun0';
    const showHex = args.includes('-X') || args.includes('-XX');
    const showAscii = args.includes('-A');

    this.running = true;
    this.terminal.printLine(`tcpdump: verbose output suppressed, use -v[v]... for full protocol decode`, 'dim');
    this.terminal.printLine(`listening on ${iface}, link-type RAW (Raw IP), snapshot length 262144 bytes`, 'info');

    const sampleFlows = [
      {
        src: '10.13.37.89.54812',
        dst: '192.168.1.42.22',
        flags: '[SYN]',
        seq: 'seq 2841920145',
        win: 'win 64240',
        len: 'length 0',
        hex: `0x0000:  4500 003c 1a2b 4000 4006 e123 0a0d 2559  E..<.+@.@..#..%Y\n0x0010:  c0a8 012a d61c 0016 a961 4051 0000 0000  ...*.....a@Q....`
      },
      {
        src: '192.168.1.42.22',
        dst: '10.13.37.89.54812',
        flags: '[SYN, ACK]',
        seq: 'seq 4102941021, ack 2841920146',
        win: 'win 65160',
        len: 'length 0',
        hex: `0x0000:  4500 003c 0000 4000 4006 fb4e c0a8 012a  E..<..@.@..N...*\n0x0010:  0a0d 2559 0016 d61c f48d 817d a961 4052  ..%Y.......}.a@R`
      },
      {
        src: '10.13.37.89.54812',
        dst: '192.168.1.42.22',
        flags: '[ACK]',
        seq: 'seq 1, ack 1',
        win: 'win 64240',
        len: 'length 0',
        hex: `0x0000:  4500 0028 1a2c 4000 4006 e136 0a0d 2559  E..(.,@.@..6..%Y\n0x0010:  c0a8 012a d61c 0016 a961 4052 f48d 817e  ...*.....a@R...~`
      },
      {
        src: '10.13.37.89.48910',
        dst: '192.168.1.42.80',
        flags: '[P.]',
        seq: 'seq 1:182, ack 1',
        win: 'win 502',
        len: 'length 181: HTTP: GET /robots.txt HTTP/1.1',
        hex: `0x0000:  4745 5420 2f72 6f62 6f74 732e 7478 7420  GET /robots.txt \n0x0010:  4854 5450 2f31 2e31 0d0a 486f 7374 3a20  HTTP/1.1..Host: \n0x0020:  3139 322e 3136 382e 312e 3432 0d0a 0d0a  192.168.1.42....`
      },
      {
        src: '192.168.1.42.80',
        dst: '10.13.37.89.48910',
        flags: '[P.]',
        seq: 'seq 1:214, ack 182',
        win: 'win 501',
        len: 'length 213: HTTP: HTTP/1.1 200 OK',
        hex: `0x0000:  4854 5450 2f31 2e31 2032 3030 204f 4b0d  HTTP/1.1 200 OK.\n0x0010:  0a53 6572 7665 723a 2041 7061 6368 650d  .Server: Apache.\n0x0020:  0a46 4c41 477b 6469 725f 6469 7363 6f76  .FLAG{dir_discov`
      },
      {
        src: '10.13.37.89.39012',
        dst: '10.0.0.254.88',
        flags: '[P.]',
        seq: 'seq 1:350, ack 1',
        win: 'win 502',
        len: 'length 349: Kerberos 5 TGS-REQ (SPN: MSSQLSvc/db01)',
        hex: `0x0000:  6a82 015b 3082 0157 a103 0201 05a2 0302  j..[0..W........\n0x0010:  010c a381 ea30 81e7 a007 0305 0040 0000  .....0.......@..\n0x0020:  00a1 1e30 1ca0 0302 0101 a115 1b13 7374  ...0..........st`
      }
    ];

    let packetCount = 0;
    this.intervalId = setInterval(() => {
      if (!this.running) {
        clearInterval(this.intervalId);
        return;
      }

      const flow = sampleFlows[packetCount % sampleFlows.length];
      const now = new Date().toISOString().split('T')[1].slice(0, 12);
      this.terminal.printLine(`${now} IP ${flow.src} > ${flow.dst}: Flags ${flow.flags}, ${flow.seq}, ${flow.win}, ${flow.len}`, 'accent');

      if (showHex) {
        this.terminal.printRaw(flow.hex, 'dim');
      }

      packetCount++;
      this.terminal.scrollToBottom();
    }, 450);
  }

  stop() {
    if (this.running) {
      this.running = false;
      if (this.intervalId) clearInterval(this.intervalId);
      this.terminal.printLine(`\n^C\n24 packets captured\n24 packets received by filter\n0 packets dropped by kernel`, 'info');
    }
  }
}
