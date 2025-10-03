import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import RecruiterSidebar from './RecruiterSidebar';
import ApplicationQuickView from './ApplicationQuickView';

const RecruiterDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ company: '' });
  const [newJob, setNewJob] = useState({ 
    title: '', 
    description: '', 
    minCgpa: '', 
    branch: '', 
    requirements: '',
    jobRequirements: {
      skills: [],
      minCgpa: '',
      minExperienceYears: '',
      allowedBranches: [],
      otherNotes: '',
      lastDate: ''
    }
  });
  const [customQuestions, setCustomQuestions] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState({});
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchJobs();
  }, []);

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
      const processedQuestions = customQuestions.map(q => ({
        question: q.question.trim(),
        type: q.type,
        required: q.required,
        options: q.type === 'select' ? q.options.split(',').map(opt => opt.trim()).filter(opt => opt) : []
      })).filter(q => q.question !== '');

      const processedRequirements = newJob.requirements 
        ? newJob.requirements.split(',').map(r => r.trim()).filter(r => r)
        : [];

      const processedJobRequirements = {
        skills: newJob.jobRequirements.skills,
        minCgpa: newJob.jobRequirements.minCgpa ? parseFloat(newJob.jobRequirements.minCgpa) : undefined,
        minExperienceYears: newJob.jobRequirements.minExperienceYears ? parseInt(newJob.jobRequirements.minExperienceYears) : undefined,
        allowedBranches: newJob.jobRequirements.allowedBranches,
        otherNotes: newJob.jobRequirements.otherNotes,
        lastDate: newJob.jobRequirements.lastDate ? new Date(newJob.jobRequirements.lastDate) : undefined
      };

      const jobData = {
        ...newJob,
        minCgpa: parseFloat(newJob.minCgpa) || undefined,
        requirements: processedRequirements,
        customQuestions: processedQuestions,
        jobRequirements: processedJobRequirements
      };
      
      await axios.post('http://localhost:5000/api/jobs', jobData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      setNewJob({ 
        title: '', 
        description: '', 
        minCgpa: '', 
        branch: '', 
        requirements: '',
        jobRequirements: {
          skills: [],
          minCgpa: '',
          minExperienceYears: '',
          allowedBranches: [],
          otherNotes: '',
          lastDate: ''
        }
      });
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

  const handleApplicationClick = async (application) => {
    setSelectedApplication(application);
    setIsQuickViewOpen(true);
  };

  const renderPostJobSection = () => (
    <section className="card mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Post New Job</h2>
      <form onSubmit={postJob} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={newJob.description}
              onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              placeholder="Enter job description"
              className="input"
              rows="3"
              required
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Job Requirements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum CGPA</label>
              <input
                type="number"
                step="0.01"
                value={newJob.jobRequirements.minCgpa}
                onChange={(e) => setNewJob({ 
                  ...newJob, 
                  jobRequirements: { ...newJob.jobRequirements, minCgpa: e.target.value }
                })}
                placeholder="e.g., 7.5"
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
              <input
                type="number"
                value={newJob.jobRequirements.minExperienceYears}
                onChange={(e) => setNewJob({ 
                  ...newJob, 
                  jobRequirements: { ...newJob.jobRequirements, minExperienceYears: e.target.value }
                })}
                placeholder="e.g., 2"
                className="input"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (Comma-separated)</label>
            <input
              type="text"
              value={newJob.jobRequirements.skills.join(', ')}
              onChange={(e) => setNewJob({ 
                ...newJob, 
                jobRequirements: { 
                  ...newJob.jobRequirements, 
                  skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                }
              })}
              placeholder="e.g., JavaScript, React, Node.js"
              className="input"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Branches (Comma-separated)</label>
            <input
              type="text"
              value={newJob.jobRequirements.allowedBranches.join(', ')}
              onChange={(e) => setNewJob({ 
                ...newJob, 
                jobRequirements: { 
                  ...newJob.jobRequirements, 
                  allowedBranches: e.target.value.split(',').map(b => b.trim()).filter(b => b)
                }
              })}
              placeholder="e.g., CSE, IT, ECE"
              className="input"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              value={newJob.jobRequirements.otherNotes}
              onChange={(e) => setNewJob({ 
                ...newJob, 
                jobRequirements: { ...newJob.jobRequirements, otherNotes: e.target.value }
              })}
              placeholder="Any additional requirements or notes..."
              className="input"
              rows="2"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Date to Apply</label>
            <input
              type="date"
              value={newJob.jobRequirements.lastDate}
              onChange={(e) => setNewJob({ 
                ...newJob, 
                jobRequirements: { ...newJob.jobRequirements, lastDate: e.target.value }
              })}
              className="input"
            />
          </div>
        </div>

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
  );

  const renderApplicationsSection = () => (
    <section className="card">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Job Applications</h2>
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
                  
                  {job.jobRequirements && (
                    <div className="mb-3 p-3 bg-blue-50 rounded-md">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Requirements:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {job.jobRequirements.minCgpa && (
                          <p><strong>Min CGPA:</strong> {job.jobRequirements.minCgpa}</p>
                        )}
                        {job.jobRequirements.minExperienceYears && (
                          <p><strong>Experience:</strong> {job.jobRequirements.minExperienceYears} years</p>
                        )}
                        {job.jobRequirements.allowedBranches.length > 0 && (
                          <p><strong>Branches:</strong> {job.jobRequirements.allowedBranches.join(', ')}</p>
                        )}
                        {job.jobRequirements.skills.length > 0 && (
                          <p><strong>Skills:</strong> {job.jobRequirements.skills.join(', ')}</p>
                        )}
                      </div>
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
                        <li 
                          key={app._id} 
                          className="p-4 bg-gray-50 rounded-lg border hover:bg-white cursor-pointer transition-colors"
                          onClick={() => handleApplicationClick(app)}
                        >
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
                              
                              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                                <p><strong>CGPA:</strong> {app.quickViewData?.studentCgpa || app.studentId.cgpa || 'N/A'}</p>
                                <p><strong>Branch:</strong> {app.studentId.branch || 'N/A'}</p>
                              </div>
                              
                              {app.quickViewData?.studentSkills && app.quickViewData.studentSkills.length > 0 && (
                                <div className="mb-2">
                                  <div className="flex flex-wrap gap-1">
                                    {app.quickViewData.studentSkills.slice(0, 3).map((skill, idx) => (
                                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                        {skill}
                                      </span>
                                    ))}
                                    {app.quickViewData.studentSkills.length > 3 && (
                                      <span className="text-xs text-gray-500">
                                        +{app.quickViewData.studentSkills.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <p className="text-xs text-gray-500">
                                Click to view details
                              </p>
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
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
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
        );
      case 'applications':
        return renderApplicationsSection();
      case 'postJob':
        return renderPostJobSection();
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex flex-grow">
        <RecruiterSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        
        <main className={`flex-grow transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-0' : 'lg:ml-0'
        } relative`}>
          {/* Background Logo with 25% opacity */}
          <div 
            className="fixed inset-0 z-0 opacity-25 pointer-events-none"
            style={{
              backgroundImage: 'url(/src/assets/logo.png)',
              backgroundSize: '50%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              transform: 'scale(0.8)'
            }}
          />
          
          <div className="max-w-7xl mx-auto p-6 relative z-10">
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-6 text-center">{error}</p>}
            {renderSection()}
          </div>
        </main>
      </div>

      <ApplicationQuickView
        application={selectedApplication}
        isOpen={isQuickViewOpen}
        onClose={() => {
          setIsQuickViewOpen(false);
          setSelectedApplication(null);
        }}
      />
    </div>
  );
};

export default RecruiterDashboard;