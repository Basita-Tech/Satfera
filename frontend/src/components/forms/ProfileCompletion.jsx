import React from 'react';
import { Link } from 'react-router-dom';
import { HeartFill, ArrowLeft } from 'react-bootstrap-icons';
import LoginForm from '../auth/LoginForm';
const LoginPage = () => {
  return <div className="min-vh-100 bg-matrimony-gradient d-flex align-items-center justify-content-center p-4">
      <div className="w-100" style={{
      maxWidth: '400px'
    }}>
        {}
        <div className="text-center mb-5">
          <Link to="/" className="d-inline-flex align-items-center text-secondary text-decoration-none mb-4">
            <ArrowLeft size={20} className="me-2" />
            Back to Home
          </Link>
          <div className="d-flex justify-content-center align-items-center mb-3">
            <HeartFill size={48} color="#E63946" className="me-3" />
            <span className="fs-3 fw-bold font-serif text-dark">Satfera</span>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>;
};
export default LoginPage;