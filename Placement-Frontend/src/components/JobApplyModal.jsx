import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const JobApplyModal = ({ job, isOpen, onClose, onApply, resumes }) => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(authUser);
  const [selectedResume, setSelectedResume] = useState('');
  const [customAnswers, setCustomAnswers] = useState({});
  const [requirementsMet, setRequirementsMet] = useState({
    cgpa: true,
    branch: true,
    skills: true
  });
  const [warnings, setWarnings] = useState([]);
  const baseURL = window.location.hostname === '172.16.61.184' ? '' : 'http://localhost:5000';
  useEffect(() => {
    if (isOpen && job) {
      fetchLatestUserData();
      checkRequirementsWithUser(user);
      if (resumes.length > 0 && !selectedResume) {
        setSelectedResume(resumes[0]._id);
      }
    }
  }, [isOpen, job]);

  const fetchLatestUserData = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${baseURL}/api/students/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const latestUser = await response.json();
      setUser(latestUser);
      // Check requirements with the fresh data
      checkRequirementsWithUser(latestUser);
    }
  } catch (error) {
    console.error('Failed to fetch latest user data:', error);
  }
};

  const checkRequirementsWithUser = (currentUser) => {
  if (!currentUser || !job) return;
  
  const newWarnings = [];
  const newRequirementsMet = {
    cgpa: true,
    branch: true,
    skills: true
  };

  console.log('🔍 Checking with user:', currentUser);
    console.log('🔍 [JobApplyModal] Checking requirements:', {
      userCGPA: currentUser.cgpa,
      userBranch: currentUser.branch,
      jobMinCgpa: job.minCgpa,
      jobBranch: job.branch,
      jobRequirements: job.jobRequirements
    });

    if (job.jobRequirements) {
      if (job.jobRequirements.minCgpa && currentUser.cgpa < job.jobRequirements.minCgpa) {
        newRequirementsMet.cgpa = false;
        newWarnings.push(`Your CGPA (${currentUser.cgpa || 'N/A'}) is below the required minimum (${job.jobRequirements.minCgpa})`);
      }

      if (job.jobRequirements.allowedBranches && job.jobRequirements.allowedBranches.length > 0) {
        if (!job.jobRequirements.allowedBranches.includes(currentUser.branch)) {
          newRequirementsMet.branch = false;
          newWarnings.push(`Your branch (${currentUser.branch || 'N/A'}) is not in the allowed branches: ${job.jobRequirements.allowedBranches.join(', ')}`);
        }
      }
    } else {
      if (job.minCgpa && currentUser.cgpa < job.minCgpa) {
        newRequirementsMet.cgpa = false;
        newWarnings.push(`Your CGPA (${currentUser.cgpa || 'N/A'}) is below the required minimum (${job.minCgpa})`);
      }

      // Replace lines 80-86 with:
if (job.branch) {
  const jobBranchLower = job.branch.toLowerCase().trim();
  
  // If branch is "any", skip check
  if (jobBranchLower !== 'any') {
    // Handle comma-separated branches
    const jobBranches = job.branch.split(',').map(b => b.trim().toLowerCase());
    const studentBranch = currentUser.branch ? currentUser.branch.toLowerCase().trim() : '';
    
    if (studentBranch && !jobBranches.includes(studentBranch)) {
      newRequirementsMet.branch = false;
      newWarnings.push(`Your branch (${currentUser.branch || 'N/A'}) doesn't match the required branch (${job.branch})`);
    }
  }
}

    console.log('🔍 [JobApplyModal] Requirements check result:', {
      requirementsMet: newRequirementsMet,
      warnings: newWarnings
    });

    setRequirementsMet(newRequirementsMet);
    setWarnings(newWarnings);
  };

  // ... rest of the component remains the same

  const updateCustomAnswer = (question, answer) => {
    setCustomAnswers(prev => ({
      ...prev,
      [question]: answer
    }));
  };

  const handleApply = () => {
    if (!selectedResume) {
      alert('Please select a resume');
      return;
    }

    const customAnswersArray = Object.entries(customAnswers).map(([question, answer]) => ({
      question,
      answer: answer.toString()
    }));

    onApply(job._id, selectedResume, customAnswersArray);
  };

  const allRequirementsMet = Object.values(requirementsMet).every(met => met);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">
                  Apply to {job.title}
                </h3>
                <p className="text-blue-100 text-sm mt-1">
                  {job.recruiterId?.company || 'Unknown Company'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
            {/* Requirements Section */}
            <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                JOB REQUIREMENTS
              </h4>
              
              {job.jobRequirements ? (
                <div className="space-y-3 text-sm">
                  {job.jobRequirements.skills && job.jobRequirements.skills.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700">Skills: </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.jobRequirements.skills.map((skill, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {job.jobRequirements.minCgpa && (
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-700">Minimum CGPA: </span>
                      <span className={`ml-2 font-bold ${requirementsMet.cgpa ? 'text-green-600' : 'text-red-600'}`}>
                        {job.jobRequirements.minCgpa}
                      </span>
                    </div>
                  )}
                  
                  {job.jobRequirements.allowedBranches && job.jobRequirements.allowedBranches.length > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700">Allowed Branches: </span>
                      <span className={`ml-2 ${requirementsMet.branch ? 'text-green-600' : 'text-red-600'}`}>
                        {job.jobRequirements.allowedBranches.join(', ')}
                      </span>
                    </div>
                  )}
                  
                  {job.jobRequirements.lastDate && (
                    <div>
                      <span className="font-semibold text-gray-700">Last Date: </span>
                      <span className="ml-2">{new Date(job.jobRequirements.lastDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {job.minCgpa && (
                    <div>
                      <span className="font-semibold text-gray-700">Minimum CGPA: </span>
                      <span className={requirementsMet.cgpa ? 'text-green-600' : 'text-red-600'}>
                        {job.minCgpa}
                      </span>
                    </div>
                  )}
                  {job.branch && (
                    <div>
                      <span className="font-semibold text-gray-700">Branch: </span>
                      <span className={requirementsMet.branch ? 'text-green-600' : 'text-red-600'}>
                        {job.branch}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
                <div className="flex">
                  <svg className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-yellow-800">
                      Requirements Check
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc list-inside space-y-1">
                        {warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Resume Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">
                Select Resume *
              </label>
              <select
                value={selectedResume}
                onChange={(e) => setSelectedResume(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                <option value="">Choose a resume</option>
                {resumes.map((resume) => (
                  <option key={resume._id} value={resume._id}>
                    {resume.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Questions */}
            {job.customQuestions && job.customQuestions.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  ADDITIONAL QUESTIONS
                </h4>
                <div className="space-y-5">
                  {job.customQuestions.map((q, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        {q.question} {q.required && <span className="text-red-500">*</span>}
                      </label>
                      
                      {q.type === 'textarea' ? (
                        <textarea
                          value={customAnswers[q.question] || ''}
                          onChange={(e) => updateCustomAnswer(q.question, e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                          rows="4"
                          required={q.required}
                        />
                      ) : q.type === 'select' ? (
                        <select
                          value={customAnswers[q.question] || ''}
                          onChange={(e) => updateCustomAnswer(q.question, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                          placeholder="Type your answer here..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          required={q.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedResume}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                !selectedResume 
                  ? 'bg-gray-400 text-white' 
                  : allRequirementsMet 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {allRequirementsMet ? 'Apply Now' : 'Apply Anyway'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobApplyModal;