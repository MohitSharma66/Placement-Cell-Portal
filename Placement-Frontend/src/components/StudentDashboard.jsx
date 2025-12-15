import axios from 'axios';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import JobApplyModal from './JobApplyModal';
import Navbar from './Navbar';
import StudentSidebar from './StudentSidebar';

const baseURL = window.location.hostname === '172.16.61.184' ? '' : 'http://localhost:5000';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ 
    cgpa: '', 
    branch: '', 
    tenthScore: '', 
    twelfthScore: '' 
  });
  const [selectedResumeForJobs, setSelectedResumeForJobs] = useState('');
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [jobsMessage, setJobsMessage] = useState('');
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
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchResumes();
    fetchJobs();
    fetchApplications();
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/students/auth/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setIsAuthenticated(res.data.authenticated);
    } catch (err) {
      setIsAuthenticated(false);
      console.error('Authentication check failed:', err);
    }
  };

  const loadFilteredJobs = async (resumeId) => {
    try {
      const res = await axios.get(`${baseURL}/api/applications/jobs/${resumeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setFilteredJobs(res.data.jobs);
      setJobsMessage(res.data.message);
      setError('');
    } catch (err) {
      setError('Failed to load jobs');
      fetchJobs();
    }
  };

  // const handleAuth = async () => {
  //   try {
  //     const res = await axios.get('http://localhost:5000/api/students/auth/google', {
  //       headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  //     });
  //     window.location.href = res.data.authUrl;
  //   } catch (err) {
  //     setError('Failed to initiate authentication');
  //   }
  // };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/students/profile`, {
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
      
      const res = await axios.put(`${baseURL}/api/students/profile`, { 
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
      const res = await axios.get(`${baseURL}/api/students/resumes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setResumes(res.data);
    } catch (err) {
      setError('Failed to fetch resumes');
    }
  };

  const addResume = async (e) => {
  e.preventDefault();
  
  if (!resumeFile) {
    setError('Please select a resume file');
    return;
  }
  
  if (!resumeTitle.trim()) {
    setError('Please enter a resume title');
    return;
  }
  
  // File type validation
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(resumeFile.type)) {
    setError('Only PDF, DOC, and DOCX files are allowed');
    return;
  }
  
  // File size validation (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (resumeFile.size > maxSize) {
    setError('File size must be less than 5MB');
    return;
  }
  
  setIsUploading(true);
  setError('');
  
  try {
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('title', resumeTitle.trim());
    
    const response = await axios.post(
      `${baseURL}/api/students/upload-resume`, 
      formData, 
      {
        headers: { 
          'Content-Type': 'multipart/form-data', 
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
      }
    );
    
    // Clear form
    setResumeFile(null);
    setResumeTitle('');
    
    // Refresh resumes
    fetchResumes();
    
    // Show success
    if (response.data.resume) {
      alert(`✅ Resume uploaded successfully!\n\nSaved to: ${response.data.resume.folderPath}`);
    } else {
      alert('✅ Resume uploaded successfully!');
    }
    
    setError('');
    
  } catch (err) {
    console.error('Upload error:', err);
    setError(err.response?.data?.msg || 'Failed to upload resume');
  } finally {
    setIsUploading(false);
  }
};

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/jobs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setJobs(res.data);
    } catch (err) {
      setError('Failed to fetch jobs');
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      const res = await axios.get(`${baseURL}/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSelectedJobDetails(res.data);
      setCustomAnswers({});
    } catch (err) {
      setError('Failed to fetch job details');
    }
  };

  const handleApplyClick = (jobId) => {
    const job = jobs.find(j => j._id === jobId) || filteredJobs.find(j => j._id === jobId);
    if (job) {
      setSelectedJobForApply(job);
      setIsApplyModalOpen(true);
    }
  };

  const handleApplyToJob = async (jobId, resumeId, customAnswers) => {
    try {
      await axios.post(`${baseURL}/api/applications`, { 
        jobId, 
        resumeId,
        customAnswers
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      
      fetchApplications();
      setIsApplyModalOpen(false);
      setSelectedJobForApply(null);
      setError('');
      alert('Application submitted successfully!');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to apply');
    }
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
      const customAnswersArray = Object.entries(customAnswers).map(([question, answer]) => ({
        question,
        answer: answer.toString()
      }));

      await axios.post(`${baseURL}/api/applications`, { 
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
      const res = await axios.get(`${baseURL}/api/applications/my`, {
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
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Upload Resume</h2>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-start">
          <div className="p-2 bg-blue-100 rounded-full mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-blue-800">Resume Storage</h3>
            <p className="text-sm text-blue-700 mt-1">
              Resumes are automatically saved to the college's Shared Drive, organized by:
              <br />
              <strong>Academic Year → Your Branch → Your Name & ID</strong>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={addResume} className="space-y-4">
        <div>
          <label className="label">Resume Title</label>
          <input
            type="text"
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
            placeholder="e.g., Software Engineering Resume 2025"
            className="input"
            required
          />
          <p className="text-xs text-gray-500 mt-1">Give your resume a descriptive name</p>
        </div>
        
        <div>
          <label className="label">Resume File (PDF, DOC, DOCX - max 5MB)</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files[0];
              setResumeFile(file);
              // Auto-fill title from filename if empty
              if (file && !resumeTitle) {
                const fileName = file.name.replace(/\.[^/.]+$/, "");
                setResumeTitle(fileName);
              }
            }}
            className="input"
            required
          />
          {resumeFile && (
            <div className="mt-2 p-2 bg-gray-50 rounded flex items-center justify-between">
              <span className="text-sm text-gray-700 truncate">
                📄 {resumeFile.name} ({Math.round(resumeFile.size / 1024)} KB)
              </span>
              <button
                type="button"
                onClick={() => setResumeFile(null)}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <span className="text-red-500 mr-2">⚠</span>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <button 
          type="submit" 
          className={`btn-primary w-full ${isUploading ? 'opacity-75 cursor-not-allowed' : ''}`}
          disabled={isUploading}
        >
          {isUploading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Uploading to College Drive...
            </span>
          ) : (
            'Upload Resume to College Shared Drive'
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-800">My Resumes</h3>
          <span className="text-sm text-gray-500">{resumes.length} uploaded</span>
        </div>
        
        {resumes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No resumes uploaded yet</p>
            <p className="text-sm mt-1">Upload your first resume above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => {
              // Extract skills from skillScores object in the analysis
              const skillScores = r.skillAnalysis?.skillScores || {};
              const skillsList = Object.keys(skillScores).filter(skill => 
                skillScores[skill]?.totalScore > 0
              );
              
              // Sort skills by totalScore (highest first)
              const sortedSkills = skillsList.sort((a, b) => 
                (skillScores[b]?.totalScore || 0) - (skillScores[a]?.totalScore || 0)
              );
              
              // Get best roles from analysis
              const bestRoles = r.skillAnalysis?.bestRoles || [];
              
              // Role name mapping for display
              const roleNames = {
                'full-stack': 'Full Stack Developer',
                'frontend': 'Frontend Developer', 
                'backend': 'Backend Developer',
                'data-scientist': 'Data Scientist',
                'devops': 'DevOps Engineer',
                'mobile': 'Mobile Developer'
              };
              
              // Role colors for badges
              const roleColors = {
                'full-stack': 'bg-purple-100 text-purple-800',
                'frontend': 'bg-indigo-100 text-indigo-800',
                'backend': 'bg-teal-100 text-teal-800',
                'data-scientist': 'bg-amber-100 text-amber-800',
                'devops': 'bg-cyan-100 text-cyan-800',
                'mobile': 'bg-pink-100 text-pink-800'
              };
              
              return (
                <div key={r._id} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{r.title || 'Untitled Resume'}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <a 
                          href={r.googleDriveLink} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View in Google Drive
                        </a>
                        {r.folderPath && (
                          <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {r.folderPath}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-gray-500">
                        {new Date(r.uploadedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                          ✓ Uploaded
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Skills Detected Section */}
                  {sortedSkills.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="text-sm font-medium text-gray-700">Skills Detected:</h5>
                        <span className="text-xs text-gray-500">
                          {sortedSkills.length} skill{sortedSkills.length !== 1 ? 's' : ''} found
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sortedSkills.slice(0, 10).map((skill) => {
                          const score = skillScores[skill]?.totalScore || 0;
                          return (
                            <div key={skill} className="group relative">
                              <span 
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${
                                  score > 3 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                                  score > 1 ? 'bg-blue-50 text-blue-700 border border-blue-100' : 
                                  'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}
                              >
                                {skill}
                                <span className="ml-1.5 text-xs opacity-75">
                                  ({score})
                                </span>
                              </span>
                            </div>
                          );
                        })}
                        {sortedSkills.length > 10 && (
                          <span className="text-xs text-gray-500 self-center">
                            +{sortedSkills.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Suggested Roles Section */}
                  {bestRoles.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Suggested Roles:</h5>
                      <div className="flex flex-wrap gap-2">
                        {bestRoles.map((role, idx) => (
                          <span 
                            key={role} 
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}
                          >
                            {roleNames[role] || role.replace('-', ' ')}
                            {idx === 0 && (
                              <span className="ml-1.5 text-xs bg-white/50 px-2 py-0.5 rounded-full">
                                Best Match
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Analysis Metadata */}
                  {r.skillAnalysis && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                          </svg>
                          Analyzed: {new Date(r.skillAnalysis.analyzedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
      case 'jobs':
        return (
          <section className="card mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Job Opportunities</h2>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Resume to See Matching Jobs
              </label>
              <div className="flex gap-4">
                <select
                  value={selectedResumeForJobs}
                  onChange={(e) => {
                    setSelectedResumeForJobs(e.target.value);
                    if (e.target.value) {
                      loadFilteredJobs(e.target.value);
                    } else {
                      setFilteredJobs([]);
                      setJobsMessage('');
                    }
                  }}
                  className="select flex-1"
                >
                  <option value="">Select a resume to filter jobs...</option>
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>{r.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSelectedResumeForJobs('');
                    setFilteredJobs([]);
                    setJobsMessage('');
                    fetchJobs();
                  }}
                  className="btn-secondary"
                >
                  Show All Jobs
                </button>
              </div>
              {jobsMessage && (
                <p className="text-sm text-blue-600 mt-2">{jobsMessage}</p>
              )}
            </div>

            {filteredJobs.length === 0 && selectedResumeForJobs ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No matching jobs found for your selected resume.</p>
                <p className="text-sm text-gray-400 mt-2">Try selecting a different resume or view all jobs.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {(selectedResumeForJobs ? filteredJobs : jobs).map((job) => (
    <div key={job._id} className="card hover:shadow-md transition-shadow">
      <h3 className="font-bold text-lg text-gray-800 mb-1">{job.title}</h3>
      <p className="text-sm text-gray-500 mb-1">Posted By: {job.recruiterId?.company || 'N/A'}</p>
      
      {/* Show CGPA requirement with validation indicator */}
      <div className="flex items-center mb-1">
        <span className="text-sm text-gray-500">Min CGPA: {job.minCgpa || 'N/A'}</span>
        {job.minCgpa && profile.cgpa && (
          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${parseFloat(profile.cgpa) >= job.minCgpa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {parseFloat(profile.cgpa) >= job.minCgpa ? '✅ Eligible' : '❌ Not eligible'}
          </span>
        )}
      </div>
      
      {/* Show branch requirement with validation indicator */}
      <div className="flex items-center mb-1">
  <span className="text-sm text-gray-500">Branch: {job.branch || 'Any'}</span>
  
  {/* Always show indicator if we have data */}
  {profile.branch && (
    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
      // Green for: "Any" OR student branch matches
      !job.branch || 
      job.branch.toLowerCase() === 'any' ||
      job.branch.toLowerCase().includes(profile.branch.toLowerCase())
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {!job.branch || 
       job.branch.toLowerCase() === 'any' ||
       job.branch.toLowerCase().includes(profile.branch.toLowerCase())
        ? '✅ Eligible' 
        : '❌ Not eligible'}
    </span>
  )}
</div>
      
      {job.suitableRoles && job.suitableRoles.length > 0 && (
        <p className="text-sm text-primary mb-1">
          Suitable for: {job.suitableRoles.join(', ')}
        </p>
      )}
      
      {job.jobRequirements && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          <p className="font-medium">Requirements:</p>
          {job.jobRequirements.skills && job.jobRequirements.skills.length > 0 && (
            <p>Skills: {job.jobRequirements.skills.join(', ')}</p>
          )}
          {job.jobRequirements.minCgpa && (
            <p>Min CGPA: {job.jobRequirements.minCgpa}</p>
          )}
          {job.jobRequirements.minExperienceYears && (
            <p>Experience: {job.jobRequirements.minExperienceYears} years</p>
          )}
        </div>
      )}
      
      <p className="text-sm text-gray-500">Posted: {new Date(job.postedAt).toLocaleDateString()}</p>
      
      {/* Apply button with eligibility check */}
      <div className="mt-4">
        <button
          onClick={() => handleApplyClick(job._id)}
          className={`btn-primary ${(
            (job.minCgpa && profile.cgpa && parseFloat(profile.cgpa) < job.minCgpa) ||
            (job.branch && job.branch.toLowerCase() !== 'any' && profile.branch && !job.branch.toLowerCase().includes(profile.branch.toLowerCase()))
          ) ? 'opacity-75 cursor-not-allowed' : ''}`}
          disabled={
            (job.minCgpa && profile.cgpa && parseFloat(profile.cgpa) < job.minCgpa) ||
            (job.branch && job.branch.toLowerCase() !== 'any' && profile.branch && !job.branch.toLowerCase().includes(profile.branch.toLowerCase()))
          }
        >
          {(job.minCgpa && profile.cgpa && parseFloat(profile.cgpa) < job.minCgpa) ||
           (job.branch && job.branch.toLowerCase() !== 'any' && profile.branch && !job.branch.toLowerCase().includes(profile.branch.toLowerCase()))
            ? 'Not Eligible'
            : 'Apply Now'}
        </button>
        
        {/* Show reason if not eligible */}
        {(job.minCgpa && profile.cgpa && parseFloat(profile.cgpa) < job.minCgpa) && (
          <p className="text-xs text-red-600 mt-1">
            Your CGPA ({profile.cgpa}) is below required ({job.minCgpa})
          </p>
        )}
        
        {(job.branch && job.branch.toLowerCase() !== 'any' && profile.branch && !job.branch.toLowerCase().includes(profile.branch.toLowerCase())) && (
          <p className="text-xs text-red-600 mt-1">
            Your branch ({profile.branch}) is not eligible for this position
          </p>
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
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="font-medium">
                            {app.jobId.title} ({app.jobId.recruiterId?.company || 'N/A'})
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
        <StudentSidebar
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
            {error && <p className="text-red-500 bg-red-50 p-3 rounded-md mb-6 text-center font-medium">{error}</p>}
            {renderSection()}
          </div>
        </main>
      </div>

      {isApplyModalOpen && selectedJobForApply && (
        <JobApplyModal
          job={selectedJobForApply}
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false);
            setSelectedJobForApply(null);
          }}
          onApply={handleApplyToJob}
          resumes={resumes}
        />
      )}
    </div>
  );
};

export default StudentDashboard;