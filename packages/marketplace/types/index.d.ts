export interface Package {
  name: string;
  version: string;
  description?: string;
  author?: string;
  downloads?: number;
  tags?: string[];
  category?: string;
  latestVersion?: string;
}

export interface Version {
  version: string;
  publishedAt?: string;
  deprecated?: boolean;
}

export interface SearchResult {
  packages: Package[];
  total: number;
}

export interface Theme {
  name: string;
  version?: string;
  description?: string;
  author?: string;
  active?: boolean;
  installedAt?: string;
}

export interface InstalledPackage {
  name: string;
  version: string;
  installedAt: string;
}

export interface RegistryOptions {
  url?: string;
  token?: string;
}

export interface SearchOptions {
  offset?: number;
  limit?: number;
  tag?: string;
  category?: string;
  sort?: string;
}

export interface Registry {
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  getPackage(name: string): Promise<Package>;
  getVersions(name: string): Promise<Version[]>;
  publish(packageData: Partial<Package>): Promise<Package>;
  unpublish(name: string, version: string): Promise<void>;
}

export interface InstallerOptions {
  registry?: Registry;
  targetDir?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn';
}

export interface Installer {
  install(packageName: string, version?: string): Promise<InstalledPackage>;
  uninstall(packageName: string): Promise<void>;
  list(): Promise<InstalledPackage[]>;
  update(packageName: string): Promise<InstalledPackage>;
  updateAll(): Promise<InstalledPackage[]>;
}

export interface ThemeManagerOptions {
  registry?: Registry;
  themesDir?: string;
}

export interface ThemeManager {
  install(themeName: string): Promise<Theme>;
  list(): Promise<Theme[]>;
  activate(themeName: string): Promise<void>;
  getActive(): Promise<Theme | null>;
  remove(themeName: string): Promise<void>;
}

export function createRegistry(options?: RegistryOptions): Registry;
export function createInstaller(options?: InstallerOptions): Installer;
export function createThemeManager(options?: ThemeManagerOptions): ThemeManager;

/** Package data accepted by `renderPackageCard`. Only `name` is required. */
export interface PackageCardData {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  category?: string;
  tags?: string[];
  downloads?: number;
  /** ISO timestamp. */
  updatedAt?: string;
  /** Repository URL; turns the name into a link. */
  repo?: string;
}

/** Renders a marketplace package card as an HTML string. */
export function renderPackageCard(pkg: PackageCardData): string;
/** CSS for package cards. Include once on the page. */
export function packageCardStyles(): string;
