import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FileTemplateRegistry } from './file-template-registry';

describe('FileTemplateRegistry', () => {
  const catalog = path.join(__dirname, '..', '..', 'templates');

  it('loads GENERIC v1 from the file catalog', () => {
    const registry = FileTemplateRegistry.load(catalog);
    const template = registry.resolve('GENERIC', 1);

    expect(template?.key).toBe('GENERIC');
    expect(template?.version).toBe(1);
    expect(template?.fields.ownerEmail).toEqual({
      wallet: false,
      public: false,
    });
    expect(template?.googleMapping).toEqual({
      classSuffix: 'generic-v1',
      hexBackgroundColor: '#142FE1',
    });
    expect(template?.appleMapping).toEqual({
      organizationName: 'Passport',
      description: 'Wallet pass',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(20, 47, 225)',
    });
  });

  it('defaults to the current version when version is omitted', () => {
    const registry = FileTemplateRegistry.load(catalog);
    expect(registry.resolve('GENERIC')?.version).toBe(1);
  });

  it('loads PET_CARD v1 with provider mappings', () => {
    const registry = FileTemplateRegistry.load(catalog);
    const template = registry.resolve('PET_CARD');

    expect(template?.version).toBe(1);
    expect(template?.fields.ownerEmail).toEqual({
      wallet: false,
      public: false,
    });
    expect(template?.googleMapping).toEqual({
      classSuffix: 'pet-card-v1',
      hexBackgroundColor: '#142FE1',
    });
    expect(template?.appleMapping?.description).toBe('Pet ID card');
  });

  it('returns undefined for an unknown key or version', () => {
    const registry = FileTemplateRegistry.load(catalog);
    expect(registry.resolve('UNKNOWN')).toBeUndefined();
    expect(registry.resolve('GENERIC', 99)).toBeUndefined();
  });

  it('rejects a catalog with no templates', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-tpl-'));
    expect(() => FileTemplateRegistry.load(empty)).toThrow(/No templates found/);
  });
});
