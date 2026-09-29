import { describe, it, expect } from 'vitest';
import { firstName, greeting } from './sms';

// Personnalisation des SMS : prénom extrait du nom complet, salutation
// générique conservée quand le client n'a pas de nom.
describe('firstName', () => {
  it('prend le premier mot du nom complet', () => {
    expect(firstName('Kofi Mensah')).toBe('Kofi');
    expect(firstName('  Aya  Konan ')).toBe('Aya');
  });

  it('chaîne vide / absente → vide', () => {
    expect(firstName('')).toBe('');
    expect(firstName(null)).toBe('');
    expect(firstName(undefined)).toBe('');
  });
});

describe('greeting', () => {
  it('personnalise avec le prénom', () => {
    expect(greeting('Kofi Mensah')).toBe('Bonjour Kofi,');
  });

  it('sans nom → salutation générique (comportement d\'origine)', () => {
    expect(greeting(undefined)).toBe('Bonjour,');
    expect(greeting('   ')).toBe('Bonjour,');
  });
});
