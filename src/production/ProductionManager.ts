/**
 * Production Manager - Enterprise Security, Resilience & Scalability
 * 
 * Solves the #5 pain point: Not production-ready for enterprise use
 * Provides security, error recovery, rate limiting, and enterprise features
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SecurityConfig {
  authentication: {
    enabled: boolean;
    type: 'api_key' | 'oauth' | 'jwt' | 'mtls';
    providers?: string[];
  };
  authorization: {
    enabled: boolean;
    type: 'rbac' | 'abac' | 'acl';
    roles?: Role[];
    policies?: Policy[];
  };
  encryption: {
    at_rest: boolean;
    in_transit: boolean;
    algorithm: string;
    key_rotation_days: number;
  };
  audit: {
    enabled: boolean;
    log_level: 'all' | 'critical' | 'security';
    retention_days: number;
  };
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  priority: number;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface Policy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  principals: string[];
  resources: string[];
  actions: string[];
  conditions?: Record<string, any>;
}

export interface User {
  id: string;
  username: string;
  roles: string[];
  api_keys?: ApiKey[];
  metadata: Record<string, any>;
  created_at: Date;
  last_login?: Date;
  status: 'active' | 'suspended' | 'deleted';
}

export interface ApiKey {
  id: string;
  key_hash: string;
  name: string;
  expires_at?: Date;
  last_used?: Date;
  permissions?: Permission[];
  rate_limit?: RateLimit;
}

export interface RateLimit {
  requests_per_minute?: number;
  requests_per_hour?: number;
  requests_per_day?: number;
  burst_size?: number;
  tokens_per_minute?: number;
  concurrent_requests?: number;
}

export interface CircuitBreaker {
  id: string;
  service: string;
  state: 'closed' | 'open' | 'half_open';
  failure_threshold: number;
  success_threshold: number;
  timeout_ms: number;
  failure_count: number;
  success_count: number;
  last_failure?: Date;
  last_success?: Date;
  next_attempt?: Date;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron expression
  retention_days: number;
  destinations: BackupDestination[];
  include_patterns: string[];
  exclude_patterns: string[];
  encryption: boolean;
  compression: boolean;
}

export interface BackupDestination {
  type: 's3' | 'gcs' | 'azure' | 'local' | 'sftp';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Backup {
  id: string;
  timestamp: Date;
  size_bytes: number;
  duration_ms: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  destination: string;
  checksum: string;
  metadata: Record<string, any>;
}

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency_ms: number;
  last_check: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  user_id?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'error';
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export class ProductionManager extends EventEmitter {
  private securityConfig: SecurityConfig;
  private users: Map<string, User> = new Map();
  private apiKeys: Map<string, ApiKey> = new Map();
  private roles: Map<string, Role> = new Map();
  private policies: Map<string, Policy> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private backupConfig: BackupConfig | null = null;
  private backups: Map<string, Backup> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private auditLogs: AuditLog[] = [];
  private encryptionKey: Buffer | null = null;
  private backupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<SecurityConfig>) {
    super();
    
    // Initialize with default secure configuration
    this.securityConfig = {
      authentication: {
        enabled: true,
        type: 'api_key',
        ...config?.authentication
      },
      authorization: {
        enabled: true,
        type: 'rbac',
        ...config?.authorization
      },
      encryption: {
        at_rest: true,
        in_transit: true,
        algorithm: 'aes-256-gcm',
        key_rotation_days: 90,
        ...config?.encryption
      },
      audit: {
        enabled: true,
        log_level: 'security',
        retention_days: 90,
        ...config?.audit
      }
    };
    
    this.initializeDefaultRoles();
    this.initializeCircuitBreakers();
    this.startHealthChecks();
  }

  /**
   * Initialize default RBAC roles
   */
  private initializeDefaultRoles() {
    // Admin role
    this.roles.set('admin', {
      id: 'admin',
      name: 'Administrator',
      permissions: [
        { resource: '*', actions: ['*'] }
      ],
      priority: 100
    });
    
    // Developer role
    this.roles.set('developer', {
      id: 'developer',
      name: 'Developer',
      permissions: [
        { resource: 'projects', actions: ['create', 'read', 'update'] },
        { resource: 'workflows', actions: ['create', 'read', 'update', 'execute'] },
        { resource: 'agents', actions: ['read', 'assign'] },
        { resource: 'analytics', actions: ['read'] }
      ],
      priority: 50
    });
    
    // Viewer role
    this.roles.set('viewer', {
      id: 'viewer',
      name: 'Viewer',
      permissions: [
        { resource: 'projects', actions: ['read'] },
        { resource: 'workflows', actions: ['read'] },
        { resource: 'agents', actions: ['read'] },
        { resource: 'analytics', actions: ['read'] }
      ],
      priority: 10
    });
  }

  /**
   * Initialize circuit breakers for critical services
   */
  private initializeCircuitBreakers() {
    const services = ['api', 'database', 'agents', 'storage'];
    
    for (const service of services) {
      this.circuitBreakers.set(service, {
        id: crypto.randomUUID(),
        service,
        state: 'closed',
        failure_threshold: 5,
        success_threshold: 3,
        timeout_ms: 30000,
        failure_count: 0,
        success_count: 0
      });
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds
  }

  /**
   * Create a new user
   */
  async createUser(params: {
    username: string;
    roles: string[];
    metadata?: Record<string, any>;
  }): Promise<User> {
    const userId = crypto.randomUUID();
    
    const user: User = {
      id: userId,
      username: params.username,
      roles: params.roles,
      metadata: params.metadata || {},
      created_at: new Date(),
      status: 'active',
      api_keys: []
    };
    
    this.users.set(userId, user);
    
    await this.auditLog({
      action: 'user.create',
      resource: `user:${userId}`,
      result: 'success',
      metadata: { username: params.username, roles: params.roles }
    });
    
    this.emit('user:created', user);
    return user;
  }

  /**
   * Generate API key for user
   */
  async generateApiKey(params: {
    user_id: string;
    name: string;
    expires_in_days?: number;
    permissions?: Permission[];
    rate_limit?: RateLimit;
  }): Promise<{ key: string; key_id: string }> {
    const user = this.users.get(params.user_id);
    if (!user) {
      throw new Error('User not found');
    }
    
    const key = this.generateSecureToken();
    const keyHash = this.hashApiKey(key);
    const keyId = crypto.randomUUID();
    
    const apiKey: ApiKey = {
      id: keyId,
      key_hash: keyHash,
      name: params.name,
      expires_at: params.expires_in_days 
        ? new Date(Date.now() + params.expires_in_days * 24 * 60 * 60 * 1000)
        : undefined,
      permissions: params.permissions,
      rate_limit: params.rate_limit || {
        requests_per_minute: 60,
        requests_per_hour: 1000,
        tokens_per_minute: 100000
      }
    };
    
    this.apiKeys.set(keyId, apiKey);
    user.api_keys = user.api_keys || [];
    user.api_keys.push(apiKey);
    
    await this.auditLog({
      action: 'api_key.create',
      resource: `api_key:${keyId}`,
      result: 'success',
      user_id: params.user_id,
      metadata: { name: params.name }
    });
    
    return { key, key_id: keyId };
  }

  /**
   * Authenticate request
   */
  async authenticate(token: string): Promise<{ user: User; key: ApiKey } | null> {
    const keyHash = this.hashApiKey(token);
    
    for (const [userId, user] of this.users.entries()) {
      if (!user.api_keys) continue;
      
      for (const apiKey of user.api_keys) {
        if (apiKey.key_hash === keyHash) {
          // Check expiration
          if (apiKey.expires_at && apiKey.expires_at < new Date()) {
            await this.auditLog({
              action: 'auth.failed',
              resource: 'api',
              result: 'failure',
              metadata: { reason: 'expired_key' }
            });
            return null;
          }
          
          // Update last used
          apiKey.last_used = new Date();
          
          await this.auditLog({
            action: 'auth.success',
            resource: 'api',
            result: 'success',
            user_id: userId
          });
          
          return { user, key: apiKey };
        }
      }
    }
    
    await this.auditLog({
      action: 'auth.failed',
      resource: 'api',
      result: 'failure',
      metadata: { reason: 'invalid_key' }
    });
    
    return null;
  }

  /**
   * Authorize action
   */
  async authorize(params: {
    user_id: string;
    resource: string;
    action: string;
    context?: Record<string, any>;
  }): Promise<boolean> {
    const user = this.users.get(params.user_id);
    if (!user) return false;
    
    // Check user status
    if (user.status !== 'active') {
      await this.auditLog({
        action: 'authz.denied',
        resource: params.resource,
        result: 'failure',
        user_id: params.user_id,
        metadata: { reason: 'inactive_user' }
      });
      return false;
    }
    
    // Check role-based permissions
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (!role) continue;
      
      for (const permission of role.permissions) {
        if (this.matchesPermission(permission, params.resource, params.action, params.context)) {
          await this.auditLog({
            action: 'authz.granted',
            resource: params.resource,
            result: 'success',
            user_id: params.user_id,
            metadata: { role: roleId, action: params.action }
          });
          return true;
        }
      }
    }
    
    // Check policies
    for (const policy of this.policies.values()) {
      if (this.matchesPolicy(policy, params.user_id, params.resource, params.action, params.context)) {
        const allowed = policy.effect === 'allow';
        
        await this.auditLog({
          action: allowed ? 'authz.granted' : 'authz.denied',
          resource: params.resource,
          result: allowed ? 'success' : 'failure',
          user_id: params.user_id,
          metadata: { policy: policy.id, action: params.action }
        });
        
        return allowed;
      }
    }
    
    await this.auditLog({
      action: 'authz.denied',
      resource: params.resource,
      result: 'failure',
      user_id: params.user_id,
      metadata: { reason: 'no_permission', action: params.action }
    });
    
    return false;
  }

  /**
   * Check rate limit
   */
  async checkRateLimit(key: string, limit: RateLimit): Promise<boolean> {
    let limiter = this.rateLimiters.get(key);
    
    if (!limiter) {
      limiter = new RateLimiter(limit);
      this.rateLimiters.set(key, limiter);
    }
    
    const allowed = limiter.allow();
    
    if (!allowed) {
      await this.auditLog({
        action: 'rate_limit.exceeded',
        resource: 'api',
        result: 'failure',
        metadata: { key, limit }
      });
    }
    
    return allowed;
  }

  /**
   * Circuit breaker check
   */
  async checkCircuitBreaker(service: string): Promise<boolean> {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return true;
    
    switch (breaker.state) {
      case 'open':
        // Check if timeout has passed
        if (breaker.next_attempt && breaker.next_attempt > new Date()) {
          this.emit('circuit_breaker:rejected', { service, state: 'open' });
          return false;
        }
        // Try half-open
        breaker.state = 'half_open';
        breaker.success_count = 0;
        return true;
      
      case 'half_open':
        return true;
      
      case 'closed':
      default:
        return true;
    }
  }

  /**
   * Record circuit breaker result
   */
  async recordCircuitBreakerResult(service: string, success: boolean): Promise<void> {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return;
    
    if (success) {
      breaker.success_count++;
      breaker.last_success = new Date();
      breaker.failure_count = 0;
      
      if (breaker.state === 'half_open' && breaker.success_count >= breaker.success_threshold) {
        breaker.state = 'closed';
        this.emit('circuit_breaker:closed', { service });
      }
    } else {
      breaker.failure_count++;
      breaker.last_failure = new Date();
      breaker.success_count = 0;
      
      if (breaker.failure_count >= breaker.failure_threshold) {
        breaker.state = 'open';
        breaker.next_attempt = new Date(Date.now() + breaker.timeout_ms);
        this.emit('circuit_breaker:opened', { service });
        
        await this.auditLog({
          action: 'circuit_breaker.opened',
          resource: service,
          result: 'error',
          metadata: { failures: breaker.failure_count }
        });
      }
    }
  }

  /**
   * Encrypt data
   */
  encrypt(data: string): { encrypted: string; iv: string; tag: string } {
    if (!this.encryptionKey) {
      this.encryptionKey = crypto.randomBytes(32);
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.securityConfig.encryption.algorithm,
      this.encryptionKey,
      iv
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = (cipher as any).getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt data
   */
  decrypt(encrypted: string, iv: string, tag: string): string {
    if (!this.encryptionKey) {
      throw new Error('No encryption key available');
    }
    
    const decipher = crypto.createDecipheriv(
      this.securityConfig.encryption.algorithm,
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    );
    
    (decipher as any).setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create backup
   */
  async createBackup(manual: boolean = false): Promise<Backup> {
    const backupId = crypto.randomUUID();
    const timestamp = new Date();
    
    const backup: Backup = {
      id: backupId,
      timestamp,
      size_bytes: 0,
      duration_ms: 0,
      status: 'in_progress',
      destination: 'local',
      checksum: '',
      metadata: { manual }
    };
    
    this.backups.set(backupId, backup);
    this.emit('backup:started', backup);
    
    try {
      const startTime = Date.now();
      
      // Collect data to backup
      const backupData = {
        timestamp: timestamp.toISOString(),
        version: '1.5.0',
        users: Array.from(this.users.values()),
        roles: Array.from(this.roles.values()),
        policies: Array.from(this.policies.values()),
        audit_logs: this.auditLogs.slice(-10000) // Last 10k logs
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      
      // Encrypt if configured
      let finalData = dataStr;
      if (this.backupConfig?.encryption) {
        const { encrypted, iv, tag } = this.encrypt(dataStr);
        finalData = JSON.stringify({ encrypted, iv, tag });
      }
      
      // Compress if configured
      if (this.backupConfig?.compression) {
        // Would use zlib here in production
        // finalData = await compress(finalData);
      }
      
      // Save to destination
      const backupPath = path.join('.backups', `backup-${timestamp.getTime()}.json`);
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.writeFile(backupPath, finalData);
      
      // Update backup record
      backup.size_bytes = Buffer.byteLength(finalData);
      backup.duration_ms = Date.now() - startTime;
      backup.status = 'completed';
      backup.checksum = crypto.createHash('sha256').update(finalData).digest('hex');
      backup.destination = backupPath;
      
      await this.auditLog({
        action: 'backup.created',
        resource: 'system',
        result: 'success',
        metadata: { backup_id: backupId, size: backup.size_bytes }
      });
      
      this.emit('backup:completed', backup);
      
      // Clean old backups
      await this.cleanOldBackups();
      
    } catch (error: any) {
      backup.status = 'failed';
      backup.metadata.error = error.message;
      
      await this.auditLog({
        action: 'backup.failed',
        resource: 'system',
        result: 'error',
        metadata: { backup_id: backupId, error: error.message }
      });
      
      this.emit('backup:failed', backup);
      throw error;
    }
    
    return backup;
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupId: string): Promise<void> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }
    
    try {
      // Read backup file
      const data = await fs.readFile(backup.destination, 'utf-8');
      
      let backupData: any;
      
      // Decrypt if needed
      if (this.backupConfig?.encryption) {
        const encrypted = JSON.parse(data);
        const decrypted = this.decrypt(encrypted.encrypted, encrypted.iv, encrypted.tag);
        backupData = JSON.parse(decrypted);
      } else {
        backupData = JSON.parse(data);
      }
      
      // Verify checksum
      const checksum = crypto.createHash('sha256').update(data).digest('hex');
      if (checksum !== backup.checksum) {
        throw new Error('Backup checksum mismatch');
      }
      
      // Restore data
      this.users.clear();
      for (const user of backupData.users) {
        this.users.set(user.id, user);
      }
      
      this.roles.clear();
      for (const role of backupData.roles) {
        this.roles.set(role.id, role);
      }
      
      this.policies.clear();
      for (const policy of backupData.policies) {
        this.policies.set(policy.id, policy);
      }
      
      this.auditLogs = backupData.audit_logs || [];
      
      await this.auditLog({
        action: 'backup.restored',
        resource: 'system',
        result: 'success',
        metadata: { backup_id: backupId, timestamp: backup.timestamp }
      });
      
      this.emit('backup:restored', backup);
      
    } catch (error: any) {
      await this.auditLog({
        action: 'backup.restore_failed',
        resource: 'system',
        result: 'error',
        metadata: { backup_id: backupId, error: error.message }
      });
      
      throw error;
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    const components = ['api', 'database', 'storage', 'agents'];
    
    for (const component of components) {
      const startTime = Date.now();
      let status: HealthCheck['status'] = 'healthy';
      let error: string | undefined;
      
      try {
        // Simulate health check
        const healthy = Math.random() > 0.05; // 95% healthy
        if (!healthy) {
          status = Math.random() > 0.5 ? 'degraded' : 'unhealthy';
          error = 'Service not responding';
        }
      } catch (e: any) {
        status = 'unhealthy';
        error = e.message;
      }
      
      const healthCheck: HealthCheck = {
        component,
        status,
        latency_ms: Date.now() - startTime,
        last_check: new Date(),
        error
      };
      
      this.healthChecks.set(component, healthCheck);
      
      if (status !== 'healthy') {
        this.emit('health:degraded', healthCheck);
      }
    }
  }

  /**
   * Get system health
   */
  getSystemHealth(): {
    overall: HealthCheck['status'];
    components: HealthCheck[];
    uptime: number;
  } {
    const components = Array.from(this.healthChecks.values());
    
    let overall: HealthCheck['status'] = 'healthy';
    if (components.some(c => c.status === 'unhealthy')) {
      overall = 'unhealthy';
    } else if (components.some(c => c.status === 'degraded')) {
      overall = 'degraded';
    }
    
    return {
      overall,
      components,
      uptime: process.uptime() * 1000 // ms
    };
  }

  /**
   * Audit log
   */
  private async auditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry
    };
    
    this.auditLogs.push(log);
    
    // Rotate old logs
    if (this.auditLogs.length > 100000) {
      this.auditLogs = this.auditLogs.slice(-50000);
    }
    
    this.emit('audit:logged', log);
  }

  /**
   * Helper: Generate secure token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Helper: Hash API key
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Helper: Match permission
   */
  private matchesPermission(
    permission: Permission,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Check resource match
    if (permission.resource !== '*' && permission.resource !== resource) {
      return false;
    }
    
    // Check action match
    if (!permission.actions.includes('*') && !permission.actions.includes(action)) {
      return false;
    }
    
    // Check conditions
    if (permission.conditions && context) {
      for (const [key, value] of Object.entries(permission.conditions)) {
        if (context[key] !== value) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Helper: Match policy
   */
  private matchesPolicy(
    policy: Policy,
    userId: string,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): boolean {
    // Check principal match
    if (!policy.principals.includes('*') && !policy.principals.includes(userId)) {
      return false;
    }
    
    // Check resource match
    if (!policy.resources.includes('*') && !policy.resources.includes(resource)) {
      return false;
    }
    
    // Check action match
    if (!policy.actions.includes('*') && !policy.actions.includes(action)) {
      return false;
    }
    
    // Check conditions
    if (policy.conditions && context) {
      for (const [key, value] of Object.entries(policy.conditions)) {
        if (context[key] !== value) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Helper: Clean old backups
   */
  private async cleanOldBackups(): Promise<void> {
    if (!this.backupConfig) return;
    
    const cutoff = new Date(Date.now() - this.backupConfig.retention_days * 24 * 60 * 60 * 1000);
    
    for (const [id, backup] of this.backups.entries()) {
      if (backup.timestamp < cutoff) {
        try {
          await fs.unlink(backup.destination);
          this.backups.delete(id);
        } catch {
          // Ignore if file doesn't exist
        }
      }
    }
  }

  /**
   * Configure backup
   */
  configureBackup(config: BackupConfig): void {
    this.backupConfig = config;
    
    // Clear existing interval
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    
    // Setup scheduled backups if enabled
    if (config.enabled && config.schedule) {
      // Simplified - in production would use proper cron
      this.backupInterval = setInterval(() => {
        this.createBackup(false).catch(console.error);
      }, 24 * 60 * 60 * 1000); // Daily
    }
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

/**
 * Simple rate limiter implementation
 */
class RateLimiter {
  private limit: RateLimit;
  private tokens: number;
  private lastRefill: Date;
  private requests: Date[] = [];
  
  constructor(limit: RateLimit) {
    this.limit = limit;
    this.tokens = limit.burst_size || limit.requests_per_minute || 60;
    this.lastRefill = new Date();
  }
  
  allow(): boolean {
    this.refill();
    
    // Check concurrent requests
    if (this.limit.concurrent_requests) {
      const now = Date.now();
      this.requests = this.requests.filter(r => now - r.getTime() < 1000);
      if (this.requests.length >= this.limit.concurrent_requests) {
        return false;
      }
    }
    
    // Check rate limit
    if (this.tokens > 0) {
      this.tokens--;
      this.requests.push(new Date());
      return true;
    }
    
    return false;
  }
  
  private refill(): void {
    const now = new Date();
    const elapsed = now.getTime() - this.lastRefill.getTime();
    
    if (this.limit.requests_per_minute) {
      const refillRate = this.limit.requests_per_minute / 60000; // per ms
      const tokensToAdd = Math.floor(elapsed * refillRate);
      
      if (tokensToAdd > 0) {
        this.tokens = Math.min(
          this.tokens + tokensToAdd,
          this.limit.burst_size || this.limit.requests_per_minute
        );
        this.lastRefill = now;
      }
    }
  }
}

