import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clgImg from '../assets/ClgImg.jpeg';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [emailWarning, setEmailWarning] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Define allowed domains
  const COLLEGE_DOMAIN = 'iiitnr.edu.in';
  const ALLOWED_DOMAINS = [COLLEGE_DOMAIN];

  // Validate email domain on change
  useEffect(() => {
    if (email && email.includes('@')) {
      const domain = email.split('@')[1];
      
      if (!ALLOWED_DOMAINS.includes(domain)) {
        if (role === 'student') {
          setEmailWarning(`⚠️ Students must use @${COLLEGE_DOMAIN} email`);
        } else if (role === 'recruiter') {
          setEmailWarning(`⚠️ Recruiters must use @${COLLEGE_DOMAIN} email`);
        }
      } else {
        setEmailWarning('');
      }
    } else {
      setEmailWarning('');
    }
  }, [email, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setEmailWarning('');

    // Client-side validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Email domain validation
    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      setError(`Only @${COLLEGE_DOMAIN} emails are allowed for registration`);
      return;
    }

    setIsLoading(true);
    const { success, user, msg } = await register(email, password, role, name);
    
    if (success) {
      setTimeout(() => {
        navigate(role === 'student' ? '/student/dashboard' : '/recruiter/dashboard');
      }, 300);
    } else {
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="relative flex items-center justify-center min-h-screen"
      style={{ 
        backgroundImage: `url(${clgImg})`,
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Main card */}
      <div className="relative w-full max-w-md mx-4 animate-fadeIn">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-white px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <div className="flex justify-center mb-4">
              <img 
                src={logo} 
                alt="IIITNR Logo" 
                className="h-16 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              IIITNR Placement Portal
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Register As
              </label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="student">Student</option>
                <option value="recruiter">Recruiter</option>
              </select>
              <p className="mt-2 text-xs text-gray-500">
                {role === 'student' 
                  ? `Students: Use your official @${COLLEGE_DOMAIN} email`
                  : `Recruiters: Must be approved by placement cell to register`
                }
              </p>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.trim())}
                placeholder={role === 'student' ? "Your name as per college records" : "Company representative name"}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                College Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                placeholder={`name@${COLLEGE_DOMAIN}`}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  emailWarning ? 'border-amber-300 bg-amber-50' : 'border-gray-300 bg-white'
                }`}
                required
              />
              {emailWarning && (
                <p className="mt-2 text-sm text-amber-600">{emailWarning}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Only @{COLLEGE_DOMAIN} emails are accepted
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
              <p className="mt-2 text-xs text-gray-500">
                Use a strong password with letters, numbers, and symbols
              </p>
            </div>

            {/* Domain Restriction Notice */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <h4 className="font-medium text-blue-800 text-sm mb-1">
                📋 Registration Guidelines
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Only <strong>@{COLLEGE_DOMAIN}</strong> emails can register</li>
                <li>• Students: Use your official college email address</li>
                <li>• Recruiters: Must contact placement cell for approval</li>
                <li>• Your name should match college records</li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <span className="text-red-500 mr-2">⚠</span>
                  <div>
                    <p className="text-sm font-medium text-red-800">Registration Failed</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                    {error.includes(COLLEGE_DOMAIN) && (
                      <div className="mt-2 text-xs text-red-600">
                        <p>Make sure:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                          <li>You're using your @{COLLEGE_DOMAIN} email</li>
                          <li>The email format is correct (name@{COLLEGE_DOMAIN})</li>
                          <li>Contact placement cell if your email doesn't work</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || emailWarning}
              className={`w-full font-semibold py-3 rounded-lg focus:outline-none focus:ring-4 transition-all ${
                emailWarning || isLoading
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-200'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Terms Notice */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                By registering, you agree to our{' '}
                <Link to="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>{' '}
                and acknowledge that your data will be used for placement purposes.
              </p>
            </div>
          </form>

          {/* Login Link */}
          <div className="px-8 pb-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Register;