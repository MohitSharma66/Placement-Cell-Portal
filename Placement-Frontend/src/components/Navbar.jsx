import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  return (
    <nav className="navbar">
      <h1 className="text-2xl font-bold">Placement Portal</h1>
      <div className="flex items-center space-x-4">
        <span className="text-lg">{user.name} ({user.role})</span>
        <button
          onClick={logout}
          className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
