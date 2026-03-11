import { describe, it, expect } from 'vitest';
import { program } from './cli';

describe('CLI', () => {
  it('should have program defined', () => {
    expect(program).toBeDefined();
  });

  it('should have correct name', () => {
    expect(program.name()).toBe('myclaw');
  });

  it('should have version', () => {
    expect(program.version()).toBeDefined();
  });
});
