import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ cgpa: '', branch: '' });
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResume, setSelectedResume] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('jobs');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track OAuth status
  const [isUploading, setIsUploading] = useState(false); // Loading state

  useEffect(() => {
    fetchProfile();
    fetchResumes();
    fetchJobs();
    fetchApplications();
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students/auth/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setIsAuthenticated(res.data.authenticated);
    } catch (err) {
      setIsAuthenticated(false);
      console.error('Authentication check failed:', err);
    }
  };

  const handleAuth = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students/auth/google');
      window.location.href = res.data.authUrl;
    } catch (err) {
      setError('Failed to initiate authentication');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students/profile');
      setProfile({ cgpa: res.data.cgpa || '', branch: res.data.branch || '' });
    } catch (err) {
      setError('Failed to fetch profile');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      if (profile.cgpa && (profile.cgpa < 0 || profile.cgpa > 10)) {
        setError('CGPA must be between 0 and 10');
        return;
      }
      const res = await axios.put('http://localhost:5000/api/students/profile', { ...profile, cgpa: parseFloat(profile.cgpa) || undefined });
      setProfile({ cgpa: res.data.cgpa || '', branch: res.data.branch || '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update profile');
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students/resumes');
      setResumes(res.data);
    } catch (err) {
      setError('Failed to fetch resumes');
    }
  };

  const addResume = async (e) => {
    e.preventDefault();
    if (!resumeFile || !resumeTitle) {
      setError('Resume title and file are required');
      return;
    }
    if (!isAuthenticated) {
      setError('Please authenticate with Google Drive first');
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('title', resumeTitle);
      await axios.post('http://localhost:5000/api/students/resumes', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setResumeFile(null);
      setResumeTitle('');
      fetchResumes();
      setError('');
      alert('Resume uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to upload resume');
    } finally {
      setIsUploading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs');
      setJobs(res.data);
    } catch (err) {
      setError('Failed to fetch jobs');
    }
  };

  const applyToJob = async () => {
    if (!selectedJob || !selectedResume) {
      setError('Please select a job and resume');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/applications', { jobId: selectedJob, resumeId: selectedResume }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      fetchApplications();
      setSelectedJob(null);
      setSelectedResume('');
      setError('');
      alert('Application submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to apply');
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/applications/my', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setApplications(res.data);
    } catch (err) {
      setError('Failed to fetch applications');
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Update Profile</h2>
            <form onSubmit={updateProfile} className="space-y-4">
              <div>
                <label className="label">CGPA (0-10)</label>
                <input type="number" step="0.01" value={profile.cgpa} onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })} placeholder="Enter CGPA" className="input" />
              </div>
              <div>
                <label className="label">Branch</label>
                <input type="text" value={profile.branch} onChange={(e) => setProfile({ ...profile, branch: e.target.value })} placeholder="Enter Branch" className="input" />
              </div>
              <button type="submit" className="btn-primary">Update Profile</button>
            </form>
          </section>
        );
      case 'resume':
        return (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Resume</h2>
            {!isAuthenticated && (
              <button onClick={handleAuth} className="btn-secondary mb-4">
                Authenticate with Google Drive
              </button>
            )}
            <form onSubmit={addResume} className="space-y-4">
              <div>
                <label className="label">Resume Title</label>
                <input
                  type="text"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  placeholder="Enter resume title"
                  className="input"
                  disabled={!isAuthenticated}
                />
              </div>
              <div>
                <label className="label">Resume File (PDF only, max 5MB)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="input"
                  disabled={!isAuthenticated}
                />
              </div>
              <button type="submit" className="btn-secondary" disabled={isUploading || !isAuthenticated}>
                {isUploading ? 'Uploading...' : 'Upload Resume'}
              </button>
            </form>
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">My Resumes</h3>
              {resumes.length === 0 ? (
                <p className="text-gray-500">No resumes uploaded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {resumes.map((r) => (
                    <li key={r._id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md text-gray-700">
                      <span>
                        {r.title}: <a href={r.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
                      </span>
                      <span className="text-sm text-gray-400">{new Date(r.uploadedAt).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      case 'jobs':
        return (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Job Opportunities</h2>
            {jobs.length === 0 ? (
              <p className="text-gray-500">No job opportunities available.</p>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => (
                  <div key={job._id} className="card hover:shadow-md transition-shadow">
                    <h3 className="font-bold text-lg text-gray-800 mb-1">{job.title}</h3>
                    <p className="text-sm text-gray-500 mb-1">Company: {job.recruiterId?.company || 'N/A'}</p>
                    <p className="text-sm text-gray-500 mb-1">Min CGPA: {job.minCgpa || 'N/A'}</p>
                    <p className="text-sm text-gray-500 mb-1">Branch: {job.branch || 'Any'}</p>
                    <p className="text-sm text-gray-500">Posted: {new Date(job.postedAt).toLocaleDateString()}</p>
                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => setSelectedJob(job._id)}
                        className={`btn-primary ${selectedJob === job._id ? 'bg-gray-300' : ''}`}
                        disabled={selectedJob === job._id}
                      >
                        Select
                      </button>
                      {selectedJob === job._id && (
                        <div className="flex items-center space-x-2 flex-1">
                          <select value={selectedResume} onChange={(e) => setSelectedResume(e.target.value)} className="select flex-1">
                            <option value="">Select Resume</option>
                            {resumes.map((r) => (
                              <option key={r._id} value={r._id}>{r.title}</option>
                            ))}
                          </select>
                          <button onClick={applyToJob} className="btn-secondary">Apply</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      case 'applications':
        return (
          <section className="card">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">My Applications</h2>
            <button onClick={fetchApplications} className="btn-primary mb-4">Refresh Applications</button>
            {applications.length === 0 ? (
              <p className="text-gray-500">No applications yet.</p>
            ) : (
              <ul className="space-y-3">
                {applications.map((app) => (
                  <li key={app._id} className="p-3 bg-gray-50 rounded-md flex justify-between items-center text-gray-700">
                    <div>
                      <span className="font-medium">
                        {app.jobId.title} ({app.jobId.recruiterId.company || 'N/A'})
                      </span>{' '}
                      - Status:{' '}
                      <span
                        className={`font-medium ${
                          app.status === 'pending' ? 'text-yellow-600' : app.status === 'accepted' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {app.status}
                      </span>
                      <br />
                      Resume:{' '}
                      <a href={app.resumeId.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {app.resumeId.title}
                      </a>
                    </div>
                    <span className="text-sm text-gray-400">{new Date(app.appliedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-grow">
        {/* Sidebar (Taskbar) with Close Button */}
        <aside
          className={`bg-white shadow-sm p-6 flex flex-col space-y-3 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0 opacity-0 overflow-hidden'}`}
        >
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-gray-700 font-medium px-4 py-1 rounded-md hover:bg-gray-100 self-end mb-2"
          >
            ✕
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`text-left px-4 py-2 rounded-md text-gray-700 font-medium ${
              activeSection === 'profile' ? 'bg-blue-50 text-primary' : 'hover:bg-gray-100'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveSection('resume')}
            className={`text-left px-4 py-2 rounded-md text-gray-700 font-medium ${
              activeSection === 'resume' ? 'bg-blue-50 text-primary' : 'hover:bg-gray-100'
            }`}
          >
            Resume
          </button>
          <button
            onClick={() => setActiveSection('jobs')}
            className={`text-left px-4 py-2 rounded-md text-gray-700 font-medium ${
              activeSection === 'jobs' ? 'bg-blue-50 text-primary' : 'hover:bg-gray-100'
            }`}
          >
            Job Opportunities
          </button>
          <button
            onClick={() => setActiveSection('applications')}
            className={`text-left px-4 py-2 rounded-md text-gray-700 font-medium ${
              activeSection === 'applications' ? 'bg-blue-50 text-primary' : 'hover:bg-gray-100'
            }`}
          >
            My Applications
          </button>
        </aside>
        {/* Main Content with Logo Overlay */}
        <main className="flex-grow max-w-7xl mx-auto p-6 relative">
          <div className="absolute top-0 left-0 w-48 h-48 bg-gray-200 rounded-full z-0 opacity-50 overflow-hidden" style={{ zIndex: 0 }}>
            {/* Placeholder for logo - replace with your logo image */}
            <div className="text-center text-gray-600 font-bold mt-16">LOGO</div>
          </div>
          {error && <p className="text-red-500 bg-red-50 p-3 rounded-md mb-6 text-center font-medium z-10">{error}</p>}
          {renderSection()}
          {/* Button to toggle sidebar open */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="fixed top-20 left-4 bg-primary text-white px-3 py-2 rounded-md hover:bg-blue-700 z-10"
            >
              ☰
            </button>
          )}
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;