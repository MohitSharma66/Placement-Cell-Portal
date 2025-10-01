const SKILLS = {
  // Frontend
  'react': ['react', 'reactjs', 'react.js'],
  'javascript': ['javascript', 'js', 'es6', 'ecmascript'],
  'html': ['html', 'html5'],
  'css': ['css', 'css3', 'sass', 'scss'],
  
  // Backend
  'nodejs': ['node', 'nodejs', 'node.js', 'express'],
  'python': ['python', 'py', 'django', 'flask'],
  'java': ['java', 'spring', 'j2ee'],
  'php': ['php', 'laravel', 'symfony'],
  
  // Database
  'mongodb': ['mongodb', 'mongo'],
  'sql': ['sql', 'mysql', 'postgresql', 'oracle'],
  
  // Mobile
  'react-native': ['react-native', 'react native'],
  'flutter': ['flutter', 'dart'],
  
  // DevOps
  'docker': ['docker', 'container'],
  'aws': ['aws', 'amazon web services', 'ec2', 's3'],
  
  // Data Science
  'machine-learning': ['machine learning', 'ml', 'ai', 'artificial intelligence']
};

class ResumeAnalyzer {
  constructor() {
    this.skills = SKILLS;
  }

  // Normalize skill names (reactjs -> react)
  normalizeSkill(token) {
    token = token.toLowerCase().trim();
    for (const [skill, variants] of Object.entries(this.skills)) {
      if (variants.includes(token)) {
        return skill;
      }
    }
    return null;
  }

  // Extract experience duration from text
  extractDuration(text) {
    const patterns = [
      /(\d+)\s*months?/gi,
      /(\d+)\s*years?/gi,
      /(\d+)\s*yr/gi,
      /(\d+)\s*mos?/gi
    ];

    let totalMonths = 0;
    
    patterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const num = parseInt(match[1]);
        if (match[0].includes('year') || match[0].includes('yr')) {
          totalMonths += num * 12;
        } else {
          totalMonths += num;
        }
      });
    });

    return totalMonths;
  }

  // Tokenize and analyze resume text
  analyzeResume(text) {
    const lines = text.split('\n');
    const skillScores = {};
    const tokens = text.toLowerCase().split(/\W+/);

    // Initialize all skills with 0
    Object.keys(this.skills).forEach(skill => {
      skillScores[skill] = {
        frequency: 0,
        projectCount: 0,
        internshipMonths: 0,
        totalScore: 0
      };
    });

    // Analyze each token
    tokens.forEach(token => {
      const normalizedSkill = this.normalizeSkill(token);
      if (normalizedSkill) {
        skillScores[normalizedSkill].frequency++;
      }
    });

    // Analyze context (projects and internships)
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      
      // Check if line contains project context
      if (lowerLine.includes('project') || lowerLine.includes('built') || lowerLine.includes('developed')) {
        Object.keys(this.skills).forEach(skill => {
          this.skills[skill].forEach(variant => {
            if (lowerLine.includes(variant)) {
              skillScores[skill].projectCount++;
            }
          });
        });
      }

      // Check if line contains internship context
      if (lowerLine.includes('intern') || lowerLine.includes('work experience') || lowerLine.includes('employment')) {
        const duration = this.extractDuration(line);
        Object.keys(this.skills).forEach(skill => {
          this.skills[skill].forEach(variant => {
            if (lowerLine.includes(variant) && duration > 0) {
              skillScores[skill].internshipMonths += duration;
            }
          });
        });
      }
    });

    // Calculate total scores (2 points per month of experience)
    Object.keys(skillScores).forEach(skill => {
      const { frequency, projectCount, internshipMonths } = skillScores[skill];
      skillScores[skill].totalScore = frequency + projectCount + (internshipMonths * 2);
    });

    return skillScores;
  }

  // Categorize into roles
  categorizeRoles(skillScores) {
    const roleDefinitions = {
      'full-stack': ['react', 'javascript', 'nodejs', 'html', 'css', 'mongodb', 'sql'],
      'frontend': ['react', 'javascript', 'html', 'css'],
      'backend': ['nodejs', 'python', 'java', 'sql', 'mongodb', 'php'],
      'data-scientist': ['python', 'machine-learning', 'sql'],
      'devops': ['docker', 'aws', 'nodejs'],
      'mobile': ['react-native', 'flutter', 'javascript']
    };

    const roleScores = {};

    Object.entries(roleDefinitions).forEach(([role, requiredSkills]) => {
      roleScores[role] = requiredSkills.reduce((total, skill) => {
        return total + (skillScores[skill]?.totalScore || 0);
      }, 0);
    });

    // Get top 3 roles
    const bestRoles = Object.entries(roleScores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([role]) => role);

    return {
      roleScores,
      bestRoles
    };
  }

  // Main analysis function
  async analyze(resumeText) {
    const skillScores = this.analyzeResume(resumeText);
    const roleAnalysis = this.categorizeRoles(skillScores);

    return {
      skillScores,
      ...roleAnalysis,
      analyzedAt: new Date().toISOString()
    };
  }
}

module.exports = ResumeAnalyzer;