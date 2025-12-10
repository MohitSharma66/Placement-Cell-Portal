const ROLE_SKILLS = {
  'full-stack': ['react', 'javascript', 'nodejs', 'html', 'css', 'mongodb', 'sql', 'express', 'nextjs', 'typescript'],
  'frontend': ['react', 'javascript', 'html', 'css', 'vue', 'angular', 'sass', 'bootstrap', 'tailwind'],
  'backend': ['nodejs', 'python', 'java', 'sql', 'mongodb', 'php', 'express', 'django', 'spring', 'flask', 'backend'],
  'data-scientist': ['python', 'machine learning', 'ml', 'ai', 'artificial intelligence', 'tensorflow', 'pytorch', 'data science', 'r', 'statistics'],
  'devops': ['docker', 'aws', 'kubernetes', 'jenkins', 'ci/cd', 'azure', 'linux', 'nginx'],
  'mobile': ['react-native', 'flutter', 'android', 'ios', 'swift', 'kotlin']
};

function detectJobRoles(requirements) {
  const roleScores = {};
  
  // Convert all requirements to lowercase for case-insensitive matching
  const normalizedRequirements = requirements.map(req => req.toLowerCase().trim());
  
  console.log('🔍 Analyzing requirements:', normalizedRequirements); // Debug log
  
  normalizedRequirements.forEach(requirement => {
    Object.entries(ROLE_SKILLS).forEach(([role, skills]) => {
      skills.forEach(skill => {
        const normalizedSkill = skill.toLowerCase();
        
        // Check if requirement contains the skill OR skill contains the requirement
        if (requirement.includes(normalizedSkill) || normalizedSkill.includes(requirement)) {
          roleScores[role] = (roleScores[role] || 0) + 1;
          console.log(`✅ Matched: "${requirement}" with "${normalizedSkill}" for role: ${role}`); // Debug log
        }
      });
    });
  });
  
  console.log('📊 Role scores:', roleScores); // Debug log
  
  // Get roles with at least 1 matching skill (lowered threshold)
  const suitableRoles = Object.entries(roleScores)
    .filter(([role, score]) => score >= 1)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA) // Sort by score descending
    .map(([role]) => role);
  
  console.log('🎯 Suitable roles:', suitableRoles); // Debug log
  
  // If no roles detected, check for partial matches or default
  if (suitableRoles.length === 0) {
    // Check for any partial matches with lower threshold
    const weakMatches = Object.entries(roleScores).filter(([_, score]) => score > 0);
    if (weakMatches.length > 0) {
      return weakMatches.map(([role]) => role);
    }
    return ['full-stack'];
  }
  
  return suitableRoles;
}

module.exports = { detectJobRoles };