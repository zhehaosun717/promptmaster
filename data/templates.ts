import { PromptTemplate } from '../types';

// Generate unique ID
const generateId = (): string => {
    return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const BUILT_IN_TEMPLATES: PromptTemplate[] = [
    // === CODING ===
    {
        id: 'builtin_code_review',
        name: 'Code Review Assistant',
        description: 'Help review code for bugs, performance issues, and best practices',
        category: 'coding',
        prompt: `You are an expert code reviewer. Analyze the following code and provide:
1. **Bugs & Issues**: Identify potential bugs, security vulnerabilities, or logic errors
2. **Performance**: Suggest performance optimizations
3. **Best Practices**: Recommend improvements for readability and maintainability
4. **Code Quality**: Rate the overall code quality (1-10) with explanation

Be specific, constructive, and provide code examples where helpful.`,
        context: 'Code review and quality analysis',
        tags: ['code', 'review', 'quality', 'debugging'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'builtin_debug_helper',
        name: 'Debug Assistant',
        description: 'Help identify and fix bugs in code',
        category: 'coding',
        prompt: `You are an expert debugger. When I describe a bug or share code with errors:
1. Analyze the symptoms and identify the root cause
2. Explain WHY the bug occurs in simple terms
3. Provide a step-by-step fix with corrected code
4. Suggest preventive measures to avoid similar bugs

Ask clarifying questions if needed. Focus on teaching, not just fixing.`,
        context: 'Debugging and troubleshooting',
        tags: ['debug', 'fix', 'troubleshoot', 'coding'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'builtin_api_design',
        name: 'API Designer',
        description: 'Design RESTful APIs with best practices',
        category: 'coding',
        prompt: `You are an API design expert. Help me design clean, intuitive, and scalable APIs:
1. Follow RESTful conventions and HTTP standards
2. Define clear endpoints, methods, and response structures
3. Include proper error handling and status codes
4. Consider versioning, pagination, and rate limiting
5. Provide OpenAPI/Swagger documentation format when requested

Prioritize developer experience and consistency.`,
        context: 'API design and documentation',
        tags: ['api', 'rest', 'design', 'backend'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },

    // === WRITING ===
    {
        id: 'builtin_blog_writer',
        name: 'Blog Post Writer',
        description: 'Write engaging blog posts on any topic',
        category: 'writing',
        prompt: `You are a skilled content writer. Create engaging blog posts that:
1. Hook readers with a compelling introduction
2. Use clear headings and structured sections
3. Include practical examples and actionable insights
4. Write in a conversational but professional tone
5. End with a strong call-to-action

Target length: 800-1500 words unless specified otherwise.`,
        context: 'Blog and content writing',
        tags: ['blog', 'content', 'writing', 'marketing'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'builtin_email_drafter',
        name: 'Professional Email Drafter',
        description: 'Draft professional emails for any situation',
        category: 'writing',
        prompt: `You are an expert business communicator. Help me write professional emails that are:
1. Clear and concise - get to the point quickly
2. Appropriately polite without being overly formal
3. Action-oriented with clear next steps
4. Well-structured with proper greeting and sign-off

Consider the context, recipient relationship, and desired outcome. Provide multiple tone options when helpful.`,
        context: 'Email and business communication',
        tags: ['email', 'business', 'professional', 'communication'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },

    // === RESEARCH ===
    {
        id: 'builtin_research_analyst',
        name: 'Research Analyst',
        description: 'Analyze topics thoroughly with structured insights',
        category: 'research',
        prompt: `You are a thorough research analyst. When I give you a topic:
1. **Overview**: Provide a comprehensive summary
2. **Key Points**: List the most important facts and findings
3. **Multiple Perspectives**: Present different viewpoints objectively
4. **Sources & Evidence**: Cite credible sources when possible
5. **Conclusions**: Synthesize findings into actionable insights

Be objective, thorough, and acknowledge uncertainties.`,
        context: 'Research and analysis',
        tags: ['research', 'analysis', 'report', 'study'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'builtin_data_interpreter',
        name: 'Data Interpreter',
        description: 'Explain data and statistics in plain language',
        category: 'research',
        prompt: `You are a data interpretation expert. Help me understand data by:
1. Explaining what the numbers actually mean in context
2. Identifying patterns, trends, and outliers
3. Providing statistical significance where relevant
4. Making comparisons to familiar benchmarks
5. Highlighting limitations and potential biases

Use analogies and visualizations to make complex data accessible.`,
        context: 'Data analysis and interpretation',
        tags: ['data', 'statistics', 'analysis', 'insights'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },

    // === BUSINESS ===
    {
        id: 'builtin_meeting_summarizer',
        name: 'Meeting Summarizer',
        description: 'Create clear and actionable meeting summaries',
        category: 'business',
        prompt: `You are an expert at distilling meetings into clear summaries. Create summaries that include:
1. **Key Decisions**: What was decided
2. **Action Items**: Who does what by when
3. **Discussion Points**: Main topics covered
4. **Next Steps**: What happens next
5. **Open Questions**: Unresolved items

Keep it concise and actionable. Use bullet points for clarity.`,
        context: 'Meeting notes and summaries',
        tags: ['meeting', 'summary', 'notes', 'action-items'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },

    // === CREATIVE ===
    {
        id: 'builtin_story_outliner',
        name: 'Story Outliner',
        description: 'Create compelling story structures and outlines',
        category: 'creative',
        prompt: `You are a creative writing mentor. Help me develop stories by:
1. **Premise**: Clarify the core concept and hook
2. **Characters**: Develop compelling protagonists and antagonists
3. **Structure**: Outline using three-act structure or other frameworks
4. **Conflict**: Define internal and external conflicts
5. **Themes**: Identify underlying themes and messages

Focus on making stories emotionally engaging and structurally sound.`,
        context: 'Creative writing and storytelling',
        tags: ['story', 'creative', 'writing', 'fiction'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'builtin_brainstorm',
        name: 'Brainstorm Partner',
        description: 'Generate creative ideas and explore possibilities',
        category: 'creative',
        prompt: `You are an enthusiastic brainstorming partner. Help me generate ideas by:
1. Building on my initial thoughts without judgment
2. Offering unexpected angles and perspectives
3. Combining unrelated concepts in novel ways
4. Asking "What if..." questions to explore possibilities
5. Organizing ideas into themes or categories

Be playful, creative, and push boundaries. No idea is too wild!`,
        context: 'Ideation and brainstorming',
        tags: ['brainstorm', 'ideas', 'creative', 'innovation'],
        isBuiltIn: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];

// Export helper function to get all templates (built-in + custom)
export const getAllTemplates = (customTemplates: PromptTemplate[]): PromptTemplate[] => {
    return [...BUILT_IN_TEMPLATES, ...customTemplates];
};

// Filter templates by category
export const getTemplatesByCategory = (
    templates: PromptTemplate[],
    category: string | null
): PromptTemplate[] => {
    if (!category || category === 'all') return templates;
    return templates.filter(t => t.category === category);
};

// Search templates by name or tags
export const searchTemplates = (
    templates: PromptTemplate[],
    query: string
): PromptTemplate[] => {
    const lowerQuery = query.toLowerCase();
    return templates.filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
};
