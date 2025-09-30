import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ 
    cgpa: '', 
    branch: '', 
    tenthScore: '', 
    twelfthScore: '' 
  });
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResume, setSelectedResume] = useState('');
  const [customAnswers, setCustomAnswers] = useState({});
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('jobs');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

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
      const res = await axios.get('http://localhost:5000/api/students/auth/google', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      window.location.href = res.data.authUrl;
    } catch (err) {
      setError('Failed to initiate authentication');
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfile({ 
        cgpa: res.data.cgpa || '', 
        branch: res.data.branch || '',
        tenthScore: res.data.tenthScore || '',
        twelfthScore: res.data.twelfthScore || ''
      });
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
      if (profile.tenthScore && (profile.tenthScore < 0 || profile.tenthScore > 100)) {
        setError('10th Score must be between 0 and 100');
        return;
      }
      if (profile.twelfthScore && (profile.twelfthScore < 0 || profile.twelfthScore > 100)) {
        setError('12th Score must be between 0 and 100');
        return;
      }
      
      const res = await axios.put('http://localhost:5000/api/students/profile', { 
        ...profile, 
        cgpa: parseFloat(profile.cgpa) || undefined,
        tenthScore: parseFloat(profile.tenthScore) || undefined,
        twelfthScore: parseFloat(profile.twelfthScore) || undefined
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfile({ 
        cgpa: res.data.cgpa || '', 
        branch: res.data.branch || '',
        tenthScore: res.data.tenthScore || '',
        twelfthScore: res.data.twelfthScore || ''
      });
      setError('');
      alert('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update profile');
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students/resumes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
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
      const res = await axios.get('http://localhost:5000/api/jobs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setJobs(res.data);
    } catch (err) {
      setError('Failed to fetch jobs');
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSelectedJobDetails(res.data);
      setCustomAnswers({}); // Reset custom answers when job changes
    } catch (err) {
      setError('Failed to fetch job details');
    }
  };

  const handleApplyClick = (jobId) => {
    setSelectedJob(jobId);
    fetchJobDetails(jobId);
    setShowPopup(true);
  };

  const updateCustomAnswer = (question, answer) => {
    setCustomAnswers(prev => ({
      ...prev,
      [question]: answer
    }));
  };

  const applyToJob = async () => {
    if (!selectedJob || !selectedResume) {
      setError('Please select a job and resume');
      return;
    }

    try {
      // Convert customAnswers object to array format
      const customAnswersArray = Object.entries(customAnswers).map(([question, answer]) => ({
        question,
        answer: answer.toString()
      }));

      await axios.post('http://localhost:5000/api/applications', { 
        jobId: selectedJob, 
        resumeId: selectedResume,
        customAnswers: customAnswersArray
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      fetchApplications();
      setSelectedJob(null);
      setSelectedResume('');
      setCustomAnswers({});
      setSelectedJobDetails(null);
      setShowPopup(false);
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
                <input 
                  type="number" 
                  step="0.01" 
                  value={profile.cgpa} 
                  onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })} 
                  placeholder="Enter CGPA" 
                  className="input" 
                />
              </div>
              <div>
                <label className="label">Branch</label>
                <input 
                  type="text" 
                  value={profile.branch} 
                  onChange={(e) => setProfile({ ...profile, branch: e.target.value })} 
                  placeholder="Enter Branch" 
                  className="input" 
                />
              </div>
              <div>
                <label className="label">10th Score (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={profile.tenthScore} 
                  onChange={(e) => setProfile({ ...profile, tenthScore: e.target.value })} 
                  placeholder="Enter 10th Score" 
                  className="input" 
                />
              </div>
              <div>
                <label className="label">12th Score (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={profile.twelfthScore} 
                  onChange={(e) => setProfile({ ...profile, twelfthScore: e.target.value })} 
                  placeholder="Enter 12th Score" 
                  className="input" 
                />
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
                    {job.customQuestions && job.customQuestions.length > 0 && (
                      <p className="text-sm text-primary mb-1">
                        {job.customQuestions.length} custom question{job.customQuestions.length > 1 ? 's' : ''}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">Posted: {new Date(job.postedAt).toLocaleDateString()}</p>
                    <div className="mt-4">
                      <button
                        onClick={() => handleApplyClick(job._id)}
                        className="btn-primary"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showPopup && selectedJob && selectedJobDetails && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">
                    Apply to {selectedJobDetails.title}
                  </h2>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Job Requirements</h3>
                    <p className="text-sm text-gray-500">Min CGPA: {selectedJobDetails.minCgpa || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Branch: {selectedJobDetails.branch || 'Any'}</p>
                    <p className="text-sm text-gray-500">
                      Requirements: {selectedJobDetails.requirements?.join(', ') || 'None'}
                    </p>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Resume</label>
                    <select
                      value={selectedResume}
                      onChange={(e) => setSelectedResume(e.target.value)}
                      className="select w-full"
                    >
                      <option value="">Select Resume</option>
                      {resumes.map((r) => (
                        <option key={r._id} value={r._id}>{r.title}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Custom Questions Section */}
                  {selectedJobDetails.customQuestions && selectedJobDetails.customQuestions.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Additional Questions</h3>
                      <div className="space-y-4">
                        {selectedJobDetails.customQuestions.map((q, index) => (
                          <div key={index} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              {q.question} {q.required && <span className="text-red-500">*</span>}
                            </label>
                            
                            {q.type === 'textarea' ? (
                              <textarea
                                value={customAnswers[q.question] || ''}
                                onChange={(e) => updateCustomAnswer(q.question, e.target.value)}
                                placeholder={`Enter your answer for "${q.question}"`}
                                className="input w-full"
                                rows="3"
                                required={q.required}
                              />
                            ) : q.type === 'select' ? (
                              <select
                                value={customAnswers[q.question] || ''}
                                onChange={(e) => updateCustomAnswer(q.question, e.target.value)}
                                className="select w-full"
                                required={q.required}
                              >
                                <option value="">Select an option</option>
                                {q.options.map((option, optIndex) => (
                                  <option key={optIndex} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={customAnswers[q.question] || ''}
                                onChange={(e) => updateCustomAnswer(q.question, e.target.value)}
                                placeholder={`Enter your answer for "${q.question}"`}
                                className="input w-full"
                                required={q.required}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {error && <p className="text-red-500 bg-red-50 p-2 rounded-md mb-4 text-center">{error}</p>}
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowPopup(false);
                        setSelectedJob(null);
                        setSelectedResume('');
                        setCustomAnswers({});
                        setSelectedJobDetails(null);
                        setError('');
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button onClick={applyToJob} className="btn-primary">
                      Submit Application
                    </button>
                  </div>
                </div>
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
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
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
                          
                          {/* Display custom answers if any */}
                          {app.customAnswers && app.customAnswers.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700">Your Answers:</p>
                              {app.customAnswers.map((answer, idx) => (
                                <p key={idx} className="text-sm text-gray-600">
                                  <strong>{answer.question}:</strong> {answer.answer}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-gray-400 ml-4">{new Date(app.appliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
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
        <main className="flex-grow max-w-7xl mx-auto p-6 relative">
          <div className="absolute top-0 left-0 w-48 h-48 bg-gray-200 rounded-full z-0 opacity-50 overflow-hidden" style={{ zIndex: 0 }}>
            <div className="text-center text-gray-600 font-bold mt-16">LOGO</div>
          </div>
          {error && <p className="text-red-500 bg-red-50 p-3 rounded-md mb-6 text-center font-medium z-10">{error}</p>}
          {renderSection()}
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