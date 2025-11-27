import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../utils/testUtils';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../../components/auth/LoginForm';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

// Mock the auth API
vi.mock('../../../api/auth', () => ({
  loginUser: vi.fn(),
}));

// Mock Google Sign-In
Object.defineProperty(window, 'google', {
  value: {
    accounts: {
      id: {
        initialize: vi.fn(),
        renderButton: vi.fn(),
      },
    },
  },
  writable: true,
});

describe('LoginForm - Simple Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variable
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
  });

  it('renders the login form', () => {
    render(<LoginForm />);
    
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    render(<LoginForm />);
    
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('allows user to type in username field', async () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    await user.type(usernameInput, 'testuser');
    
    expect(usernameInput).toHaveValue('testuser');
  });

  it('allows user to type in password field', async () => {
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, 'password123');
    
    expect(passwordInput).toHaveValue('password123');
  });

  it('password field is initially hidden', () => {
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('renders forgot password and username links', () => {
    render(<LoginForm />);
    
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/forgot username/i)).toBeInTheDocument();
  });

  it('renders Google sign in container', () => {
    render(<LoginForm />);
    
    expect(document.getElementById('googleSignInDiv')).toBeInTheDocument();
  });
});