import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar.jsx';

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ company: '' });
  const [newJob, setNewJob] = useState({ title: '', description: '', minCgpa: '', branch: '', requirements: '' });
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchJobs();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/recruiters/profile');
      setProfile({ company: res.data.company || '' });
    } catch (err) {
      setError('Failed to fetch profile');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/recruiters/profile', profile);
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update profile');
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs');
      setJobs(res.data.filter(j => j.recruiterId._id === user.id));
    } catch (err) {
      setError('Failed to fetch jobs');
    }
  };

  const postJob = async (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description) {
      setError('Title and description are required');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/jobs', {
        ...newJob,
        minCgpa: parseFloat(newJob.minCgpa) || undefined,
        requirements: newJob.requirements.split(',').map(r => r.trim()).filter(r => r)
      });
      setNewJob({ title: '', description: '', minCgpa: '', branch: '', requirements: '' });
      fetchJobs();
      setError('');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to post job');
    }
  };

  const fetchApplicationsForJob = async (jobId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/applications/recruiter/${jobId}`);
      setApplications(prev => ({ ...prev, [jobId]: res.data }));
    } catch (err) {
      setError('Failed to fetch applications');
    }
  };

  const updateApplicationStatus = async (appId, status) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/applications/${appId}/status`, { status });
      setApplications(prev => {
        const newApps = { ...prev };
        for (const jobId in newApps) {
          newApps[jobId] = newApps[jobId].map(app => app._id === appId ? res.data : app);
        }
        return newApps;
      });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update status');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 flex-grow">
        {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-6 text-center">{error}</p>}

        <section className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Update Profile</h2>
          <form onSubmit={updateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                placeholder="Enter company name"
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary">Update Profile</button>
          </form>
        </section>

        <section className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Post New Job</h2>
          <form onSubmit={postJob} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                value={newJob.title}
                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                placeholder="Enter job title"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={newJob.description}
                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                placeholder="Enter job description"
                className="input"
                rows="4"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum CGPA</label>
              <input
                type="number"
                step="0.01"
                value={newJob.minCgpa}
                onChange={(e) => setNewJob({ ...newJob, minCgpa: e.target.value })}
                placeholder="Enter minimum CGPA"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch (Optional)</label>
              <input
                type="text"
                value={newJob.branch}
                onChange={(e) => setNewJob({ ...newJob, branch: e.target.value })}
                placeholder="Enter branch"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requirements (Comma-separated)</label>
              <input
                type="text"
                value={newJob.requirements}
                onChange={(e) => setNewJob({ ...newJob, requirements: e.target.value })}
                placeholder="e.g., Python, JavaScript"
                className="input"
              />
            </div>
            <button type="submit" className="btn-secondary">Post Job</button>
          </form>
        </section>

        <section className="card">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">My Jobs</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-600">No jobs posted yet.</p>
          ) : (
            <div className="space-y-6">
              {jobs.map(job => (
                <div key={job._id} className="card hover:shadow-lg transition-shadow">
                  <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                  <p className="text-gray-600 mb-2">{job.description}</p>
                  <p className="text-sm text-gray-500">Min CGPA: {job.minCgpa || 'N/A'}</p>
                  <p className="text-sm text-gray-500">Branch: {job.branch || 'Any'}</p>
                  <p className="text-sm text-gray-500">Requirements: {job.requirements.join(', ') || 'None'}</p>
                  <p className="text-sm text-gray-500">Posted: {new Date(job.postedAt).toLocaleDateString()}</p>
                  <button onClick={() => fetchApplicationsForJob(job._id)} className="btn-primary mt-3">View Applications</button>
                  {applications[job._id] && (
                    <div className="mt-4">
                      <h4 className="text-md font-medium text-gray-800 mb-2">Applications</h4>
                      {applications[job._id].length === 0 ? (
                        <p className="text-gray-600">No applications yet.</p>
                      ) : (
                        <ul className="space-y-4">
                          {applications[job._id].map(app => (
                            <li key={app._id} className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-medium">{app.studentId.name} ({app.studentId.email})</span><br />
                                  CGPA: {app.studentId.cgpa || 'N/A'}, Branch: {app.studentId.branch || 'N/A'}<br />
                                  Resume: <a href={app.resumeId.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{app.resumeId.title}</a><br />
                                  Applied: {new Date(app.appliedAt).toLocaleDateString()}
                                </div>
                                <select
                                  value={app.status}
                                  onChange={(e) => updateApplicationStatus(app._id, e.target.value)}
                                  className={`select w-32 text-sm ${app.status === 'pending' ? 'text-yellow-600' : app.status === 'accepted' ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="accepted">Accepted</option>
                                  <option value="rejected">Rejected</option>
                                </select>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
