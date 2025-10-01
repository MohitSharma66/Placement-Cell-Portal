const ROLE_SKILLS = {
  'full-stack': ['react', 'javascript', 'nodejs', 'html', 'css', 'mongodb', 'sql'],
  'frontend': ['react', 'javascript', 'html', 'css'],
  'backend': ['nodejs', 'python', 'java', 'sql', 'mongodb', 'php'],
  'data-scientist': ['python', 'machine-learning', 'sql'],
  'devops': ['docker', 'aws', 'nodejs'],
  'mobile': ['react-native', 'flutter', 'javascript']
};

function detectJobRoles(requirements) {
  const roleScores = {};
  
  requirements.forEach(requirement => {
    const requirementLower = requirement.toLowerCase();
    
    Object.entries(ROLE_SKILLS).forEach(([role, skills]) => {
      skills.forEach(skill => {
        if (requirementLower.includes(skill)) {
          roleScores[role] = (roleScores[role] || 0) + 1;
        }
      });
    });
  });
  
  // Get roles with at least 2 matching skills
  const suitableRoles = Object.entries(roleScores)
    .filter(([role, score]) => score >= 2)
    .map(([role]) => role);
  
  // If no roles detected, default to full-stack
  return suitableRoles.length > 0 ? suitableRoles : ['full-stack'];
}

module.exports = { detectJobRoles };