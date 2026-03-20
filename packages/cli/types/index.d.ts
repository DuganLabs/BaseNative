export interface CreateOptions {
  template?: 'minimal' | 'enterprise' | 'api';
}

export interface DevOptions {
  port?: string;
  host?: string;
}

export interface BuildOptions {
  outdir?: string;
}

export interface GenerateOptions {
  type: 'component' | 'route' | 'page';
  name: string;
}
