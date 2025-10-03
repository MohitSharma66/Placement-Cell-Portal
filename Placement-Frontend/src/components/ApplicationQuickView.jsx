import { useEffect, useRef } from 'react';

const ApplicationQuickView = ({ application, isOpen, onClose }) => {
  const slideOverRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e) => {
      if (slideOverRef.current && !slideOverRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        aria-hidden="true"
      />
      
      {/* Slide-over Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div
          ref={slideOverRef}
          className="relative w-screen max-w-md transform transition-transform duration-300 ease-in-out"
          role="dialog"
          aria-modal="true"
          aria-labelledby="slide-over-title"
        >
          <div className="h-full flex flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="px-4 py-6 sm:px-6 bg-primary text-white">
              <div className="flex items-center justify-between">
                <h2 id="slide-over-title" className="text-lg font-semibold">
                  Application Details
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-md p-2 hover:bg-primary-dark transition-colors"
                  aria-label="Close panel"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {application && (
                <div className="space-y-6">
                  {/* Student Info */}
                  <section>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">STUDENT INFORMATION</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">Name</label>
                        <p className="text-sm font-medium text-gray-900">{application.studentId.name}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Email</label>
                        <p className="text-sm text-gray-900 break-words">{application.studentId.email}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">CGPA</label>
                        <p className="text-sm font-medium text-gray-900">
                          {application.quickViewData?.studentCgpa || application.studentId.cgpa || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Branch</label>
                        <p className="text-sm text-gray-900">{application.studentId.branch || 'N/A'}</p>
                      </div>
                    </div>
                  </section>

                  {/* Skills */}
                  <section>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">SKILLS</h3>
                    <div className="flex flex-wrap gap-2">
                      {application.quickViewData?.studentSkills && application.quickViewData.studentSkills.length > 0 ? (
                        application.quickViewData.studentSkills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No skills listed</p>
                      )}
                    </div>
                  </section>

                  {/* Resume */}
                  <section>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">RESUME</h3>
                    <a
                      href={application.resumeId.googleDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                    >
                      📄 View Resume
                    </a>
                  </section>

                  {/* Application Details */}
                  <section>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">APPLICATION DETAILS</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400">Applied On</label>
                        <p className="text-sm text-gray-900">
                          {new Date(application.appliedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Status</label>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            application.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : application.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </section>

                  {/* Custom Answers */}
                  {application.customAnswers && application.customAnswers.length > 0 && (
                    <section>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">CUSTOM ANSWERS</h3>
                      <div className="space-y-3">
                        {application.customAnswers.map((answer, index) => (
                          <div key={index} className="border-l-4 border-primary pl-3">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {answer.question}
                            </p>
                            <p className="text-sm text-gray-600">{answer.answer}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-4 py-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationQuickView;