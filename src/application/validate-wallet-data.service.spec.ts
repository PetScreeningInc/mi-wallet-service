import * as fs from 'node:fs';
import * as path from 'node:path';
import { Test } from '@nestjs/testing';
import {
  defaultTemplatesDirectory,
  FileTemplateRegistry,
} from '../adapters/templates/file-template-registry';
import { pickPublicData } from '../domain/wallet-template';
import { TEMPLATE_REGISTRY } from '../ports/template-registry.port';
import { ValidateWalletDataService } from './validate-wallet-data.service';

function skillPayload(name: string): Record<string, unknown> {
  const file = path.join(
    __dirname,
    '..',
    '..',
    '.cursor',
    'skills',
    'con-1309-mock-wallet-call',
    'payloads',
    name,
  );
  return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
}

describe('ValidateWalletDataService', () => {
  let service: ValidateWalletDataService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: TEMPLATE_REGISTRY,
          useValue: FileTemplateRegistry.load(defaultTemplatesDirectory()),
        },
        ValidateWalletDataService,
      ],
    }).compile();
    service = moduleRef.get(ValidateWalletDataService);
  });

  it('accepts CON-1309 demo payloads without persistence', () => {
    for (const name of ['demo-a.json', 'demo-b.json']) {
      const payload = skillPayload(name);
      const result = service.execute({
        template: payload.template as string,
        templateVersion: payload.templateVersion as number,
        data: payload.data,
      });
      expect(result.ok).toBe(true);
    }
  });

  it('rejects unknown templates before any store is involved', () => {
    const result = service.execute({
      template: 'PET_CARD',
      data: { title: 'x', fields: { a: '1', b: '2', c: '3' } },
    });
    expect(result).toEqual({ ok: false, code: 'UNKNOWN_TEMPLATE' });
  });

  it('rejects invalid data against GENERIC v1', () => {
    const result = service.execute({
      template: 'GENERIC',
      templateVersion: 1,
      data: { subtitle: 'missing title and fields' },
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('SCHEMA_INVALID');
    if (result.code === 'SCHEMA_INVALID') {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown keys in data', () => {
    const result = service.execute({
      template: 'GENERIC',
      data: {
        title: 'Stay',
        fields: { guest: 'A', dates: 'B', unit: 'C' },
        tagNumber: 'do-not-accept',
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok && result.code === 'SCHEMA_INVALID') {
      expect(result.issues.some((issue) => issue.message.includes('additional'))).toBe(
        true,
      );
    }
  });

  it('rejects fewer than three display fields', () => {
    const result = service.execute({
      template: 'GENERIC',
      data: {
        title: 'Stay',
        fields: { guest: 'A', dates: 'B' },
      },
    });
    expect(result.ok).toBe(false);
  });

  it('keeps ownerEmail off the public projection', () => {
    const payload = skillPayload('demo-a.json');
    const result = service.execute({
      template: 'GENERIC',
      templateVersion: 1,
      data: payload.data,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const publicData = pickPublicData(
      payload.data as Record<string, unknown>,
      result.template.fields,
    );
    expect(publicData.ownerEmail).toBeUndefined();
    expect(publicData.title).toBe('Stay with Pico');
  });
});
