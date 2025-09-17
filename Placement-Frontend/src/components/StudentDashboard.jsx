import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar.jsx';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ cgpa: '', branch: '' });
  const [resumes, setResumes] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [newResume, setNewResume] = useState({ googleDriveLink: '', title: '' });
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResume, setSelectedResume] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchResumes();
    fetchJobs();
    fetchApplications();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/students/profile');
      setProfile({ cgpa: res.data.cgpa || '', branch: res.data.branch || '' });
    } catch {
      setError('Failed to fetch profile');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    if (profile.cgpa && (profile.cgpa < 0 || profile.cgpa > 10)) {
      setError('CGPA must be between 0 and 10');
      return;
    }
    try {
      const res = await axios.put('http://localhost:5000/api/students/profile', {
        ...profile,
        cgpa: parseFloat(profile.cgpa) || undefined
      });
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
    } catch {
      setError('Failed to fetch resumes');
    }
  };

  const addResume = async (e) => {
    e.preventDefault();
    if (!newResume.googleDriveLink || !newResume.title) {
      setError('Resume title and link are required');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/students/resumes', newResume);
      setNewResume({ googleDriveLink: '', title: '' });
      fetchResumes();
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to add resume');
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs');
      setJobs(res.data);
    } catch {
      setError('Failed to fetch jobs');
    }
  };

  const applyToJob = async () => {
    if (!selectedJob || !selectedResume) {
      setError('Please select a job and resume');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/applications', {
        jobId: selectedJob,
        resumeId: selectedResume
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
      const res = await axios.get('http://localhost:5000/api/applications/my');
      setApplications(res.data);
    } catch {
      setError('Failed to fetch applications');
    }
  };

  const InputField = ({ label, value, onChange, type = 'text', placeholder, step }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        className="input"
      />
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 flex-grow">
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-6 text-center">{error}</p>}

        {/* Profile Section */}
        <section className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Update Profile</h2>
          <form onSubmit={updateProfile} className="space-y-4">
            <InputField
              label="CGPA (0-10)"
              type="number"
              step="0.01"
              value={profile.cgpa}
              onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })}
              placeholder="Enter CGPA"
            />
            <InputField
              label="Branch"
              value={profile.branch}
              onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
              placeholder="Enter Branch"
            />
            <button type="submit" className="btn-primary">Update Profile</button>
          </form>
        </section>

        {/* Resume Section */}
        <section className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Add Resume</h2>
          <form onSubmit={addResume} className="space-y-4">
            <InputField
              label="Resume Title"
              value={newResume.title}
              onChange={(e) => setNewResume({ ...newResume, title: e.target.value })}
              placeholder="Enter resume title"
            />
            <InputField
              label="Google Drive Link"
              value={newResume.googleDriveLink}
              onChange={(e) => setNewResume({ ...newResume, googleDriveLink: e.target.value })}
              placeholder="Enter Google Drive link"
            />
            <button type="submit" className="btn-secondary">Add Resume</button>
          </form>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">My Resumes</h3>
            {resumes.length === 0 ? (
              <p className="text-gray-600">No resumes uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {resumes.map(r => (
                  <li key={r._id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span>
                      {r.title}: <a href={r.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a>
                    </span>
                    <span className="text-sm text-gray-500">{new Date(r.uploadedAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Job Section */}
        <section className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Job Opportunities</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map(job => (
              <div key={job._id} className="card hover:shadow-lg transition-shadow">
                <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                <p className="text-gray-600 mb-2">{job.description}</p>
                <p className="text-sm text-gray-500">Company: {job.recruiterId?.company || 'N/A'}</p>
                <p className="text-sm text-gray-500">Min CGPA: {job.minCgpa || 'N/A'}</p>
                <p className="text-sm text-gray-500">Branch: {job.branch || 'Any'}</p>
                <p className="text-sm text-gray-500">Posted: {new Date(job.postedAt).toLocaleDateString()}</p>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => setSelectedJob(job._id)}
                    className={`btn-primary ${selectedJob === job._id ? 'bg-gray-400' : ''}`}
                    disabled={selectedJob === job._id}
                  >
                    Select
                  </button>

                  {selectedJob === job._id && (
                    <div className="flex items-center space-x-2 flex-1">
                      <select
                        value={selectedResume}
                        onChange={(e) => setSelectedResume(e.target.value)}
                        className="select flex-1"
                      >
                        <option value="">Select Resume</option>
                        {resumes.map(r => <option key={r._id} value={r._id}>{r.title}</option>)}
                      </select>
                      <button onClick={applyToJob} className="btn-secondary">Apply</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Applications Section */}
        <section className="card">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">My Applications</h2>
          <button onClick={fetchApplications} className="btn-primary mb-4">Refresh Applications</button>
          {applications.length === 0 ? (
            <p className="text-gray-600">No applications yet.</p>
          ) : (
            <ul className="space-y-3">
              {applications.map(app => (
                <li key={app._id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <span className="font-medium">{app.jobId.title} ({app.jobId.recruiterId.company || 'N/A'})</span> - Status: 
                    <span className={`font-medium ${app.status === 'pending' ? 'text-yellow-600' : app.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}>
                      {app.status}
                    </span><br />
                    Resume: <a href={app.resumeId.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{app.resumeId.title}</a>
                  </div>
                  <span className="text-sm text-gray-500">{new Date(app.appliedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
