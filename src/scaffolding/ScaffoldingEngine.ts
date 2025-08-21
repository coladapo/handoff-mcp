import Handlebars from 'handlebars';
import natural from 'natural';
import * as yaml from 'js-yaml';
import * as glob from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TemplateConfig {
  name: string;
  framework: string;
  description: string;
  variables: Record<string, any>;
  files: Array<{
    path: string;
    template: string;
    condition?: string;
  }>;
}

export interface ScaffoldOptions {
  projectName: string;
  targetPath: string;
  templateName: string;
  variables: Record<string, any>;
  requirements?: string[];
}

export interface ScaffoldResult {
  success: boolean;
  filesCreated: string[];
  errors?: string[];
  duration: number;
}

export interface PreviewResult {
  files: Array<{
    path: string;
    content: string;
    size: number;
  }>;
  totalSize: number;
  estimatedTime: number;
}

export class ScaffoldingEngine {
  private templatesPath: string;
  private templateCache: Map<string, TemplateConfig>;
  private nlpTokenizer: natural.WordTokenizer;
  private nlpClassifier: natural.BayesClassifier;
  private scaffoldCache: Map<string, string>;

  constructor(templatesPath: string = path.join(__dirname, '../../../templates')) {
    this.templatesPath = templatesPath;
    this.templateCache = new Map();
    this.scaffoldCache = new Map();
    this.nlpTokenizer = new natural.WordTokenizer();
    this.nlpClassifier = new natural.BayesClassifier();
    this.initializeNLP();
    this.registerHandlebarsHelpers();
  }

  private initializeNLP(): void {
    // Train classifier to extract code hints from requirements
    this.nlpClassifier.addDocument('create api endpoint', 'api');
    this.nlpClassifier.addDocument('add rest api', 'api');
    this.nlpClassifier.addDocument('build api service', 'api');
    
    this.nlpClassifier.addDocument('create database model', 'database');
    this.nlpClassifier.addDocument('add schema', 'database');
    this.nlpClassifier.addDocument('define entity', 'database');
    
    this.nlpClassifier.addDocument('add authentication', 'auth');
    this.nlpClassifier.addDocument('implement login', 'auth');
    this.nlpClassifier.addDocument('secure endpoints', 'auth');
    
    this.nlpClassifier.addDocument('create tests', 'testing');
    this.nlpClassifier.addDocument('add unit tests', 'testing');
    this.nlpClassifier.addDocument('implement testing', 'testing');
    
    this.nlpClassifier.train();
  }

  private registerHandlebarsHelpers(): void {
    // Register case conversion helpers
    Handlebars.registerHelper('pascalCase', (str: string) => {
      return str.replace(/(?:^|[-_\s])(\w)/g, (_, letter) => letter.toUpperCase())
                .replace(/[-_\s]/g, '');
    });

    Handlebars.registerHelper('camelCase', (str: string) => {
      const pascal = str.replace(/(?:^|[-_\s])(\w)/g, (_, letter) => letter.toUpperCase())
                        .replace(/[-_\s]/g, '');
      return pascal.charAt(0).toLowerCase() + pascal.slice(1);
    });

    Handlebars.registerHelper('kebabCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2')
                .replace(/[\s_]+/g, '-')
                .toLowerCase();
    });

    Handlebars.registerHelper('snakeCase', (str: string) => {
      return str.replace(/([a-z])([A-Z])/g, '$1_$2')
                .replace(/[\s-]+/g, '_')
                .toLowerCase();
    });

    // Helper for checking if array includes value
    Handlebars.registerHelper('includes', (array: any[], value: any) => {
      return Array.isArray(array) && array.includes(value);
    });

    // Helper for conditional logic
    Handlebars.registerHelper('if_eq', function(this: any, a: any, b: any, options: any) {
      if (a === b) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });
  }

  async loadTemplate(templateName: string): Promise<TemplateConfig> {
    const cached = this.templateCache.get(templateName);
    if (cached) return cached;

    const templatePath = path.join(this.templatesPath, templateName, 'template.yaml');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const config = yaml.load(templateContent) as TemplateConfig;
    
    this.templateCache.set(templateName, config);
    return config;
  }

  async listTemplates(): Promise<Array<{ name: string; framework: string; description: string }>> {
    const templateDirs = await glob.glob('*/', { cwd: this.templatesPath });
    const templates = [];
    
    for (const dir of templateDirs) {
      const templateName = dir.replace('/', '');
      try {
        const config = await this.loadTemplate(templateName);
        templates.push({
          name: templateName,
          framework: config.framework,
          description: config.description
        });
      } catch (error) {
        // Skip invalid templates
      }
    }
    
    return templates;
  }

  parseRequirements(requirements: string[]): Record<string, any> {
    const hints: Record<string, any> = {
      features: [],
      patterns: []
    };
    
    for (const req of requirements) {
      const tokens = this.nlpTokenizer.tokenize(req.toLowerCase());
      const classification = this.nlpClassifier.classify(req);
      
      hints.features.push(classification);
      
      // Extract patterns
      if (tokens.includes('crud')) hints.patterns.push('crud');
      if (tokens.includes('rest') || tokens.includes('api')) hints.patterns.push('rest');
      if (tokens.includes('graphql')) hints.patterns.push('graphql');
      if (tokens.includes('websocket') || tokens.includes('realtime')) hints.patterns.push('websocket');
    }
    
    return hints;
  }

  private async compileTemplate(templateContent: string, variables: Record<string, any>): Promise<string> {
    const template = Handlebars.compile(templateContent);
    return template(variables);
  }

  private getCacheKey(options: ScaffoldOptions): string {
    const data = JSON.stringify({
      templateName: options.templateName,
      variables: options.variables,
      requirements: options.requirements
    });
    return createHash('md5').update(data).digest('hex');
  }

  async generateScaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const startTime = Date.now();
    const filesCreated: string[] = [];
    const errors: string[] = [];
    
    try {
      // Load template
      const template = await this.loadTemplate(options.templateName);
      
      // Parse requirements if provided
      let codeHints = {};
      if (options.requirements) {
        codeHints = this.parseRequirements(options.requirements);
      }
      
      // Merge variables
      const variables = {
        ...template.variables,
        ...options.variables,
        projectName: options.projectName,
        codeHints
      };
      
      // Create project directory
      const projectPath = path.join(options.targetPath, options.projectName);
      await fs.mkdir(projectPath, { recursive: true });
      
      // Generate files
      for (const fileConfig of template.files) {
        try {
          // Check condition if specified
          if (fileConfig.condition) {
            const conditionFunc = new Function('codeHints', 'projectName', 'vars', `with (vars) { return ${fileConfig.condition}; }`);
            if (!conditionFunc(variables.codeHints, variables.projectName, variables)) continue;
          }
          
          // Load and compile template
          const templatePath = path.join(this.templatesPath, options.templateName, fileConfig.template);
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          const compiledContent = await this.compileTemplate(templateContent, variables);
          
          // Create file
          const filePath = path.join(projectPath, fileConfig.path);
          const fileDir = path.dirname(filePath);
          await fs.mkdir(fileDir, { recursive: true });
          await fs.writeFile(filePath, compiledContent);
          
          filesCreated.push(fileConfig.path);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Failed to create ${fileConfig.path}: ${errorMessage}`);
        }
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: errors.length === 0,
        filesCreated,
        errors: errors.length > 0 ? errors : undefined,
        duration
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        filesCreated,
        errors: [errorMessage],
        duration: Date.now() - startTime
      };
    }
  }

  async previewScaffold(options: Omit<ScaffoldOptions, 'targetPath'>): Promise<PreviewResult> {
    const files: PreviewResult['files'] = [];
    let totalSize = 0;
    
    try {
      // Load template
      const template = await this.loadTemplate(options.templateName);
      
      // Parse requirements if provided
      let codeHints = {};
      if (options.requirements) {
        codeHints = this.parseRequirements(options.requirements);
      }
      
      // Merge variables
      const variables = {
        ...template.variables,
        ...options.variables,
        projectName: options.projectName,
        codeHints
      };
      
      // Preview files
      for (const fileConfig of template.files) {
        // Check condition if specified
        if (fileConfig.condition) {
          const conditionFunc = new Function('codeHints', 'projectName', 'vars', `with (vars) { return ${fileConfig.condition}; }`);
          if (!conditionFunc(variables.codeHints, variables.projectName, variables)) continue;
        }
        
        // Load and compile template
        const templatePath = path.join(this.templatesPath, options.templateName, fileConfig.template);
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const compiledContent = await this.compileTemplate(templateContent, variables);
        
        const size = Buffer.byteLength(compiledContent, 'utf-8');
        totalSize += size;
        
        files.push({
          path: fileConfig.path,
          content: compiledContent,
          size
        });
      }
      
      // Estimate generation time based on file count and size
      const estimatedTime = Math.max(100, files.length * 50 + totalSize / 1000);
      
      return {
        files,
        totalSize,
        estimatedTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Preview failed: ${errorMessage}`);
    }
  }

  async validateTemplate(templateName: string): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    
    try {
      const config = await this.loadTemplate(templateName);
      
      // Validate required fields
      if (!config.name) errors.push('Template name is required');
      if (!config.framework) errors.push('Framework is required');
      if (!config.files || config.files.length === 0) errors.push('At least one file must be defined');
      
      // Validate file templates exist
      for (const fileConfig of config.files) {
        const templatePath = path.join(this.templatesPath, templateName, fileConfig.template);
        try {
          await fs.access(templatePath);
        } catch {
          errors.push(`Template file not found: ${fileConfig.template}`);
        }
      }
      
      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [`Failed to load template: ${errorMessage}`]
      };
    }
  }
}