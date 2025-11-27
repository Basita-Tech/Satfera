import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn utility function', () => {
  it('combines multiple class names', () => {
    const result = cn('class1', 'class2', 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('handles conditional classes', () => {
    const condition = true;
    const result = cn('base-class', condition && 'conditional-class');
    expect(result).toBe('base-class conditional-class');
  });

  it('filters out falsy values', () => {
    const result = cn('class1', false, null, undefined, '', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('handles Tailwind class conflicts by using the last one', () => {
    const result = cn('text-sm text-lg');
    expect(result).toBe('text-lg');
  });

  it('merges complex Tailwind classes correctly', () => {
    const result = cn('px-4 py-2', 'px-6');
    expect(result).toBe('py-2 px-6');
  });

  it('handles arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('handles objects with boolean values', () => {
    const result = cn({
      'class1': true,
      'class2': false,
      'class3': true
    });
    expect(result).toBe('class1 class3');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles complex combination of inputs', () => {
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      'base-class',
      'text-sm',
      {
        'active': isActive,
        'disabled': isDisabled
      },
      isActive && 'text-blue-500',
      ['border', 'rounded']
    );
    
    expect(result).toContain('base-class');
    expect(result).toContain('text-sm');
    expect(result).toContain('active');
    expect(result).toContain('text-blue-500');
    expect(result).toContain('border');
    expect(result).toContain('rounded');
    expect(result).not.toContain('disabled');
  });
});