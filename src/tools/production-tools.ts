/**
 * Production & Enterprise MCP Tools
 * Tools for security, resilience, and enterprise operations
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const PRODUCTION_TOOLS: Tool[] = [
  // Security Tools
  {
    name: 'create_user',
    description: '👤 Create a new user account',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Unique username'
        },
        roles: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['admin', 'developer', 'viewer', 'custom']
          },
          description: 'User roles'
        },
        metadata: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            team: { type: 'string' },
            department: { type: 'string' }
          },
          description: 'User metadata'
        }
      },
      required: ['username', 'roles']
    }
  },

  {
    name: 'generate_api_key',
    description: '🔑 Generate API key for authentication',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User ID to generate key for'
        },
        name: {
          type: 'string',
          description: 'Key name/description'
        },
        expires_in_days: {
          type: 'number',
          description: 'Key expiration in days'
        },
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resource: { type: 'string' },
              actions: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          },
          description: 'Custom permissions for this key'
        },
        rate_limit: {
          type: 'object',
          properties: {
            requests_per_minute: { type: 'number' },
            requests_per_hour: { type: 'number' },
            tokens_per_minute: { type: 'number' }
          },
          description: 'Rate limiting configuration'
        }
      },
      required: ['user_id', 'name']
    }
  },

  {
    name: 'authenticate',
    description: '🔐 Authenticate with API key',
    inputSchema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          description: 'API key to authenticate'
        }
      },
      required: ['api_key']
    }
  },

  {
    name: 'authorize',
    description: '✅ Check authorization for action',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'User to check'
        },
        resource: {
          type: 'string',
          description: 'Resource to access'
        },
        action: {
          type: 'string',
          description: 'Action to perform'
        },
        context: {
          type: 'object',
          description: 'Additional context for authorization'
        }
      },
      required: ['user_id', 'resource', 'action']
    }
  },

  {
    name: 'create_role',
    description: '👥 Create custom role',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Role name'
        },
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              resource: { type: 'string' },
              actions: {
                type: 'array',
                items: { type: 'string' }
              },
              conditions: { type: 'object' }
            },
            required: ['resource', 'actions']
          },
          description: 'Role permissions'
        },
        priority: {
          type: 'number',
          default: 50,
          description: 'Role priority (higher = more precedence)'
        }
      },
      required: ['name', 'permissions']
    }
  },

  {
    name: 'create_policy',
    description: '📜 Create security policy',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Policy name'
        },
        effect: {
          type: 'string',
          enum: ['allow', 'deny'],
          description: 'Policy effect'
        },
        principals: {
          type: 'array',
          items: { type: 'string' },
          description: 'Users or roles affected'
        },
        resources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Resources covered'
        },
        actions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Actions covered'
        },
        conditions: {
          type: 'object',
          description: 'Policy conditions'
        }
      },
      required: ['name', 'effect', 'principals', 'resources', 'actions']
    }
  },

  // Resilience Tools
  {
    name: 'check_circuit_breaker',
    description: '⚡ Check circuit breaker status',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['api', 'database', 'agents', 'storage'],
          description: 'Service to check'
        }
      },
      required: ['service']
    }
  },

  {
    name: 'record_service_result',
    description: '📊 Record service call result for circuit breaker',
    inputSchema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          description: 'Service name'
        },
        success: {
          type: 'boolean',
          description: 'Whether the call succeeded'
        },
        latency_ms: {
          type: 'number',
          description: 'Call latency'
        },
        error: {
          type: 'string',
          description: 'Error message if failed'
        }
      },
      required: ['service', 'success']
    }
  },

  {
    name: 'check_rate_limit',
    description: '🚦 Check rate limit status',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Rate limit key (user, IP, etc.)'
        },
        limit: {
          type: 'object',
          properties: {
            requests_per_minute: { type: 'number' },
            requests_per_hour: { type: 'number' },
            burst_size: { type: 'number' }
          },
          description: 'Rate limit configuration'
        }
      },
      required: ['key', 'limit']
    }
  },

  // Backup & Recovery Tools
  {
    name: 'create_backup',
    description: '💾 Create system backup',
    inputSchema: {
      type: 'object',
      properties: {
        manual: {
          type: 'boolean',
          default: true,
          description: 'Manual vs scheduled backup'
        },
        include_patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to include'
        },
        exclude_patterns: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patterns to exclude'
        },
        destination: {
          type: 'string',
          enum: ['local', 's3', 'gcs', 'azure'],
          default: 'local',
          description: 'Backup destination'
        },
        encrypt: {
          type: 'boolean',
          default: true,
          description: 'Encrypt backup'
        },
        compress: {
          type: 'boolean',
          default: true,
          description: 'Compress backup'
        }
      }
    }
  },

  {
    name: 'restore_backup',
    description: '♻️ Restore from backup',
    inputSchema: {
      type: 'object',
      properties: {
        backup_id: {
          type: 'string',
          description: 'Backup ID to restore'
        },
        verify_checksum: {
          type: 'boolean',
          default: true,
          description: 'Verify backup integrity'
        },
        dry_run: {
          type: 'boolean',
          default: false,
          description: 'Test restore without applying'
        }
      },
      required: ['backup_id']
    }
  },

  {
    name: 'list_backups',
    description: '📋 List available backups',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 10,
          description: 'Number of backups to list'
        },
        status_filter: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'failed']
          },
          description: 'Filter by status'
        }
      }
    }
  },

  {
    name: 'configure_backup',
    description: '⚙️ Configure backup settings',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Enable automatic backups'
        },
        schedule: {
          type: 'string',
          description: 'Cron expression for schedule'
        },
        retention_days: {
          type: 'number',
          default: 30,
          description: 'Backup retention period'
        },
        destinations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['s3', 'gcs', 'azure', 'local', 'sftp']
              },
              config: { type: 'object' },
              enabled: { type: 'boolean' }
            }
          },
          description: 'Backup destinations'
        }
      },
      required: ['enabled']
    }
  },

  // Health & Monitoring Tools
  {
    name: 'get_system_health',
    description: '💚 Get system health status',
    inputSchema: {
      type: 'object',
      properties: {
        detailed: {
          type: 'boolean',
          default: false,
          description: 'Include detailed component health'
        }
      }
    }
  },

  {
    name: 'get_audit_logs',
    description: '📝 Get audit logs',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 100,
          description: 'Number of logs to retrieve'
        },
        filters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            action: { type: 'string' },
            resource: { type: 'string' },
            result: {
              type: 'string',
              enum: ['success', 'failure', 'error']
            },
            start_date: { type: 'string', format: 'date-time' },
            end_date: { type: 'string', format: 'date-time' }
          },
          description: 'Log filters'
        }
      }
    }
  },

  // Data Protection Tools
  {
    name: 'encrypt_data',
    description: '🔒 Encrypt sensitive data',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'string',
          description: 'Data to encrypt'
        },
        algorithm: {
          type: 'string',
          enum: ['aes-256-gcm', 'aes-256-cbc', 'chacha20-poly1305'],
          default: 'aes-256-gcm',
          description: 'Encryption algorithm'
        }
      },
      required: ['data']
    }
  },

  {
    name: 'decrypt_data',
    description: '🔓 Decrypt sensitive data',
    inputSchema: {
      type: 'object',
      properties: {
        encrypted: {
          type: 'string',
          description: 'Encrypted data'
        },
        iv: {
          type: 'string',
          description: 'Initialization vector'
        },
        tag: {
          type: 'string',
          description: 'Authentication tag'
        }
      },
      required: ['encrypted', 'iv', 'tag']
    }
  },

  {
    name: 'rotate_encryption_keys',
    description: '🔄 Rotate encryption keys',
    inputSchema: {
      type: 'object',
      properties: {
        immediate: {
          type: 'boolean',
          default: false,
          description: 'Rotate immediately vs scheduled'
        },
        reencrypt_data: {
          type: 'boolean',
          default: true,
          description: 'Re-encrypt existing data'
        }
      }
    }
  },

  // Compliance Tools
  {
    name: 'generate_compliance_report',
    description: '📑 Generate compliance report',
    inputSchema: {
      type: 'object',
      properties: {
        standard: {
          type: 'string',
          enum: ['soc2', 'gdpr', 'hipaa', 'pci-dss', 'iso27001'],
          description: 'Compliance standard'
        },
        period: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date' },
            end: { type: 'string', format: 'date' }
          },
          description: 'Report period'
        },
        include_evidence: {
          type: 'boolean',
          default: true,
          description: 'Include audit evidence'
        }
      },
      required: ['standard', 'period']
    }
  },

  {
    name: 'data_retention_policy',
    description: '⏰ Configure data retention',
    inputSchema: {
      type: 'object',
      properties: {
        data_type: {
          type: 'string',
          enum: ['logs', 'metrics', 'backups', 'user_data', 'all'],
          description: 'Type of data'
        },
        retention_days: {
          type: 'number',
          description: 'Days to retain data'
        },
        action: {
          type: 'string',
          enum: ['delete', 'archive', 'anonymize'],
          default: 'delete',
          description: 'Action after retention period'
        }
      },
      required: ['data_type', 'retention_days']
    }
  },

  // Emergency Tools
  {
    name: 'emergency_shutdown',
    description: '🚨 Emergency system shutdown',
    inputSchema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Shutdown reason'
        },
        components: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['all', 'api', 'agents', 'workflows', 'analytics']
          },
          default: ['all'],
          description: 'Components to shutdown'
        },
        create_backup: {
          type: 'boolean',
          default: true,
          description: 'Create backup before shutdown'
        },
        notify_users: {
          type: 'boolean',
          default: true,
          description: 'Notify active users'
        }
      },
      required: ['reason']
    }
  },

  {
    name: 'disaster_recovery',
    description: '🔥 Initiate disaster recovery',
    inputSchema: {
      type: 'object',
      properties: {
        scenario: {
          type: 'string',
          enum: ['data_loss', 'security_breach', 'system_failure', 'corruption'],
          description: 'Disaster scenario'
        },
        recovery_point: {
          type: 'string',
          description: 'Backup ID or timestamp to recover to'
        },
        validation_mode: {
          type: 'boolean',
          default: true,
          description: 'Validate recovery before applying'
        }
      },
      required: ['scenario']
    }
  }
];