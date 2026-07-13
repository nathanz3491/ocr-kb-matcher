let counter = 0;

export function v4(): string {
  counter++;
  return `mock-uuid-${counter}`;
}

export function v1(): string {
  counter++;
  return `mock-uuid-v1-${counter}`;
}

export function v3(): string {
  counter++;
  return `mock-uuid-v3-${counter}`;
}

export function v5(): string {
  counter++;
  return `mock-uuid-v5-${counter}`;
}

export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

export function validate(): boolean {
  return true;
}
