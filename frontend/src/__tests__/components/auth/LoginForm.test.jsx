import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../utils/testUtils';
import userEvent from '@testing-library/user-event';
import LoginForm from '../../../components/auth/LoginForm';
import * as authApi from '../../../api/auth';

// Mock the auth API
vi.mock('../../../api/auth', () => ({
  loginUser: vi.fn(),
}));

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

describe('LoginForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Mock environment variable
    import.meta.env.VITE_GOOGLE_CLIENT_ID = 'test-client-id';
  });

  it('renders login form elements', () => {
    render(<LoginForm />);
    
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('updates form data when user types', async () => {
    render(<LoginForm />);
    
    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    
    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('password123');
  });

  it('toggles password visibility', async () => {
    render(<LoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i });
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('shows error message when login fails', async () => {
    const errorMessage = 'Invalid credentials';
    authApi.loginUser.mockRejectedValue(new Error(errorMessage));
    
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/username/i), 'testuser');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('calls loginUser API with correct data on form submission', async () => {
    authApi.loginUser.mockResolvedValue({
      data: { success: true, user: { id: 1, email: 'test@example.com' } }
    });
    
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /log in/i }));
    
    await waitFor(() => {
      expect(authApi.loginUser).toHaveBeenCalledWith({
        username: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('shows loading state during login', async () => {
    authApi.loginUser.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<LoginForm />);
    
    await user.type(screen.getByLabelText(/email or phone/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    
    const loginButton = screen.getByRole('button', { name: /log in/i });
    await user.click(loginButton);
    
    expect(loginButton).toBeDisabled();
  });

  it('prevents form submission with empty fields', async () => {
    render(<LoginForm />);
    
    const loginButton = screen.getByRole('button', { name: /log in/i });
    await user.click(loginButton);
    
    expect(authApi.loginUser).not.toHaveBeenCalled();
  });

  it('initializes Google Sign-In on mount', () => {
    render(<LoginForm />);
    
    // Wait for script to load and Google to be initialized
    expect(document.querySelector('script[src*="accounts.google.com"]')).toBeInTheDocument();
  });

  it('renders forgot password and sign up links', () => {
    render(<LoginForm />);
    
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    expect(screen.getByText(/sign up here/i)).toBeInTheDocument();
  });
});