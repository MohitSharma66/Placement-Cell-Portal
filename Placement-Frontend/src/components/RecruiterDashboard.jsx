import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar.jsx';

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ company: '' });
  const [newJob, setNewJob] = useState({ 
    title: '', 
    description: '', 
    minCgpa: '', 
    branch: '', 
    requirements: '' 
  });
  const [customQuestions, setCustomQuestions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
    fetchJobs();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/recruiters/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfile({ company: res.data.company || '' });
    } catch (err) {
      setError('Failed to fetch profile');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put('http://localhost:5000/api/recruiters/profile', profile, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setError('');
      alert('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to update profile');
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/jobs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setJobs(res.data.filter(j => j.recruiterId._id === user.id));
    } catch (err) {
      setError('Failed to fetch jobs');
    }
  };

  const addCustomQuestion = () => {
    if (customQuestions.length >= 5) {
      setError('Maximum 5 custom questions allowed');
      return;
    }
    setCustomQuestions([...customQuestions, { question: '', type: 'text', required: false, options: '' }]);
  };

  const updateCustomQuestion = (index, field, value) => {
    const updated = [...customQuestions];
    updated[index][field] = value;
    
    // If type changed to select, ensure options field is available
    if (field === 'type' && value === 'select' && !updated[index].options) {
      updated[index].options = '';
    }
    
    setCustomQuestions(updated);
  };

  const removeCustomQuestion = (index) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const postJob = async (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.description) {
      setError('Title and description are required');
      return;
    }

    try {
      // Process custom questions
      const processedQuestions = customQuestions.map(q => ({
        question: q.question.trim(),
        type: q.type,
        required: q.required,
        options: q.type === 'select' ? q.options.split(',').map(opt => opt.trim()).filter(opt => opt) : []
      })).filter(q => q.question !== ''); // Remove empty questions

      const processedRequirements = newJob.requirements 
      ? newJob.requirements.split(',').map(r => r.trim()).filter(r => r)
      : [];
      
      const jobData = {
        ...newJob,
        minCgpa: parseFloat(newJob.minCgpa) || undefined,
        requirements: processedRequirements,
        customQuestions: processedQuestions
      };
      
      await axios.post('http://localhost:5000/api/jobs', jobData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      setNewJob({ title: '', description: '', minCgpa: '', branch: '', requirements: '' });
      setCustomQuestions([]);
      fetchJobs();
      setError('');
      alert('Job posted successfully');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to post job');
    }
  };

  const fetchApplicationsForJob = async (jobId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/applications/recruiters/${jobId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setApplications(prev => ({ ...prev, [jobId]: res.data }));
    } catch (err) {
      setError('Failed to fetch applications');
    }
  };

  const updateApplicationStatus = async (appId, status) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/applications/${appId}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setApplications(prev => {
        const newApps = { ...prev };
        for (const jobId in newApps) {
          newApps[jobId] = newApps[jobId].map(app => app._id === appId ? res.data : app);
        }
        return newApps;
      });
      alert('Application status updated successfully!');
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
                required
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
                required
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

            {/* Custom Questions Section */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Custom Application Questions</h3>
                <button
                  type="button"
                  onClick={addCustomQuestion}
                  className="btn-secondary text-sm"
                >
                  + Add Question
                </button>
              </div>
              
              {customQuestions.length === 0 ? (
                <p className="text-gray-500 text-sm">No custom questions added yet. Students will only submit their resume and academic info.</p>
              ) : (
                <div className="space-y-4">
                  {customQuestions.map((q, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-800">Question {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeCustomQuestion(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => updateCustomQuestion(index, 'question', e.target.value)}
                            placeholder="Enter your question"
                            className="input"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                          <select
                            value={q.type}
                            onChange={(e) => updateCustomQuestion(index, 'type', e.target.value)}
                            className="select"
                          >
                            <option value="text">Text Input</option>
                            <option value="textarea">Text Area</option>
                            <option value="select">Multiple Choice</option>
                          </select>
                        </div>
                      </div>
                      
                      {q.type === 'select' && (
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Options (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={q.options}
                            onChange={(e) => updateCustomQuestion(index, 'options', e.target.value)}
                            placeholder="e.g., Option 1, Option 2, Option 3"
                            className="input"
                          />
                          <p className="text-xs text-gray-500 mt-1">Separate options with commas</p>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={q.required}
                          onChange={(e) => updateCustomQuestion(index, 'required', e.target.checked)}
                          className="mr-2"
                        />
                        <label htmlFor={`required-${index}`} className="text-sm text-gray-700">
                          Required question (students must answer this)
                        </label>
                      </div>
                    </div>
                  ))}
                  <p className="text-sm text-gray-500">
                    Note: Answers to these questions will be stored in Google Sheets as separate columns.
                  </p>
                </div>
              )}
            </div>

            <button type="submit" className="btn-secondary w-full">Post Job</button>
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
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800">{job.title}</h3>
                      <p className="text-gray-600 mb-2">{job.description}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="text-gray-500"><strong>Min CGPA:</strong> {job.minCgpa || 'N/A'}</p>
                        <p className="text-gray-500"><strong>Branch:</strong> {job.branch || 'Any'}</p>
                        <p className="text-gray-500"><strong>Requirements:</strong> {job.requirements?.join(', ') || 'None'}</p>
                        <p className="text-gray-500"><strong>Posted:</strong> {new Date(job.postedAt).toLocaleDateString()}</p>
                      </div>
                      
                      {job.customQuestions && job.customQuestions.length > 0 && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-gray-700 mb-2">Custom Questions:</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {job.customQuestions.map((q, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                <span>
                                  {q.question} 
                                  {q.required && <span className="text-red-500 ml-1">*</span>}
                                  {q.type === 'select' && q.options.length > 0 && (
                                    <span className="text-gray-500 text-xs ml-2">(Options: {q.options.join(', ')})</span>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => fetchApplicationsForJob(job._id)} 
                    className="btn-primary mt-3"
                  >
                    {applications[job._id] ? 'Refresh Applications' : 'View Applications'}
                  </button>
                  
                  {applications[job._id] && (
                    <div className="mt-4 border-t pt-4">
                      <h4 className="text-md font-medium text-gray-800 mb-2">
                        Applications ({applications[job._id].length})
                      </h4>
                      {applications[job._id].length === 0 ? (
                        <p className="text-gray-600">No applications yet.</p>
                      ) : (
                        <ul className="space-y-4">
                          {applications[job._id].map(app => (
                            <li key={app._id} className="p-4 bg-gray-50 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-gray-800">
                                      {app.studentId.name} ({app.studentId.email})
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                      app.status === 'accepted' ? 'bg-green-100 text-green-800' : 
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                    <p><strong>CGPA:</strong> {app.studentId.cgpa || 'N/A'}</p>
                                    <p><strong>Branch:</strong> {app.studentId.branch || 'N/A'}</p>
                                    <p><strong>10th Score:</strong> {app.studentId.tenthScore || 'N/A'}</p>
                                    <p><strong>12th Score:</strong> {app.studentId.twelfthScore || 'N/A'}</p>
                                  </div>
                                  
                                  <p className="text-sm mb-2">
                                    <strong>Resume:</strong>{' '}
                                    <a 
                                      href={app.resumeId.googleDriveLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="text-primary hover:underline"
                                    >
                                      {app.resumeId.title}
                                    </a>
                                  </p>
                                  
                                  {/* // In the applications display section of RecruiterDashboard.jsx */}
                                  {app.customAnswers && app.customAnswers.length > 0 && (
                                    <div className="mt-3 p-3 bg-white rounded border">
                                      <p className="font-medium text-sm text-gray-700 mb-2">Custom Q&A:</p>
                                      <div className="space-y-2">
                                        {app.customAnswers.map((answer, idx) => (
                                          <div key={idx} className="text-sm">
                                            <p className="font-medium text-gray-600">Q: {answer.question}</p>
                                            <p className="text-gray-800 bg-gray-50 p-2 rounded">A: {answer.answer}</p>
                                          </div>
                                        ))}
                                      </div>
                                  </div>
                                  )}
                                  
                                  <p className="text-xs text-gray-500 mt-2">
                                    Applied: {new Date(app.appliedAt).toLocaleDateString()} at {new Date(app.appliedAt).toLocaleTimeString()}
                                  </p>
                                </div>
                                
                                <div className="ml-4">
                                  <select
                                    value={app.status}
                                    onChange={(e) => updateApplicationStatus(app._id, e.target.value)}
                                    className={`select w-32 text-sm ${
                                      app.status === 'pending' ? 'border-yellow-300' : 
                                      app.status === 'accepted' ? 'border-green-300' : 
                                      'border-red-300'
                                    }`}
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                </div>
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