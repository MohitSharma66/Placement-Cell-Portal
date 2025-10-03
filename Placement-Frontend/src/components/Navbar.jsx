import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  
  return (
    <nav className="bg-blue-700 shadow-lg sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo/Title */}
          <h1 className="text-xl font-bold text-white">
            Placement Portal
          </h1>
          
          {/* User Info and Logout */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white font-medium">{user.name}</p>
              <p className="text-blue-100 text-sm capitalize">({user.role})</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;