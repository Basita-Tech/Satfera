import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../utils/testUtils';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../components/ui/button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies default variant and size classes', () => {
    render(<Button>Default Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-primary');
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('px-4');
  });

  it('applies custom variant classes', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-secondary');
    expect(button).toHaveClass('text-secondary-foreground');
  });

  it('applies custom size classes', () => {
    render(<Button size="sm">Small Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-8');
    expect(button).toHaveClass('px-3');
    expect(button).toHaveClass('text-xs');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('bg-background');
  });

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-destructive');
    expect(button).toHaveClass('text-destructive-foreground');
  });

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('hover:bg-accent');
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('custom-class');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    render(<Button ref={ref}>Button with ref</Button>);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('supports icon size', () => {
    render(<Button size="icon">🚀</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('w-9');
  });
});