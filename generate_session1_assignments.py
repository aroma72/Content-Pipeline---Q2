#!/usr/bin/env python3
"""
Generate Session 1 Assignments for Agentic AI Mastery cohort.
Creates theory and practical assignments as PDFs.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.pdf_generator_skill import PDFGeneratorSkill

# Session 1 Theory Assignment Content
THEORY_ASSIGNMENT = {
    'overview': """
    After watching the introductory videos on Agentic AI fundamentals, this assignment asks you to synthesize
    the core concepts and apply them to real-world scenarios. You'll explore the distinction between AI consumers
    and producers, understand agent capabilities and limitations, and design an agent system for a practical use case.
    """,

    'learning_objectives': [
        'Articulate the difference between consumer and producer mindsets in AI usage',
        'Identify the key capabilities and limitations of AI agents',
        'Understand autonomy levels and how to build trust in agent systems',
        'Design multi-agent architectures for complex workflows',
        'Recognize the boundaries between automated and human-driven processes',
    ],

    'instructions': [
        'Watch Session 1 Videos 1 and 2 (Cohort Introduction and What is an AI Agent)',
        'Complete all reflection questions below in 1-2 sentences each',
        'Write a 500-word case study analyzing one of the examples from the videos',
        'Design a simple multi-agent system for a problem in your organization',
        'Submit your response as a Word document or PDF by the deadline',
    ],

    'questions': [
        'Define the consumer vs. producer distinction for AI as explained in the cohort introduction. How does this apply to your current role?',

        'The videos show three autonomy levels (level 1: full review, level 3: independent execution, level 5: fully autonomous). For a task in your workflow, which level would you target first and why?',

        'Rumi (Fahad\'s agent) autonomously replied to a technical email without explicit instruction. What does this demonstrate about agent capability, and what are the risks of such autonomy?',

        'The curriculum emphasizes that "agents can research and execute, but they cannot build trust." Give an example from your domain where this boundary matters.',

        'Name three tasks from your work that an agent could handle autonomously (level 4+). What guardrails would you need?',
    ],

    'case_study_prompt': """
    CASE STUDY ASSIGNMENT (500 words):

    Choose one scenario from the videos:
    • Harim's curriculum mapping task (2-3 weeks → hours)
    • Haroon's vendor invoice tracking
    • Usman's research automation
    • OR a similar task in your organization

    Write a case study analyzing:
    1. The original problem: What made this task time-consuming or error-prone?
    2. The agentic solution: How would an agent approach this?
    3. Implementation steps: What would the first 4 weeks look like?
    4. Risks & boundaries: What could go wrong? Where do humans stay involved?
    5. Expected outcomes: What metrics would show success?
    """,

    'design_assignment': """
    DESIGN A MULTI-AGENT SYSTEM (1-2 pages):

    Using the framework from Video 2 (orchestrator + specialist agents), design a system for:
    • A workflow in your organization that takes 10+ hours per week
    • OR a process you'd like to improve with automation

    Your design should include:
    1. Problem statement (what needs to be solved)
    2. Agent breakdown: What specialist agents do you need? What's each one's job?
    3. Orchestrator role: How do agents communicate? How are tasks assigned?
    4. Autonomy level: Where does human review/decision-making fit?
    5. Success metrics: How will you measure if this works?

    Draw a simple diagram or flowchart showing how your agents interact.
    """,

    'rubric': {
        'Conceptual Understanding': [
            'Explains consumer/producer distinction with nuance; connects to personal context',
            'Clearly explains distinction; makes one solid connection to role',
            'Explains both concepts; limited depth of application',
            'Partial understanding; vague connections to real work',
        ],
        'Case Study Analysis': [
            'Thorough problem analysis; realistic agent design; insightful risk assessment',
            'Clear problem and solution; identifies most risks; practical implementation plan',
            'Identifies problem and solution; some risk analysis; implementation unclear',
            'Superficial analysis; missing key elements; implementation vague',
        ],
        'Multi-Agent System Design': [
            'Sophisticated architecture; clear roles; realistic autonomy levels; strong metrics',
            'Clear agent roles; appropriate autonomy; reasonable metrics',
            'Identifies agents; autonomy levels unclear; metrics incomplete',
            'Vague design; poor agent definition; metrics missing',
        ],
        'Reflection Questions': [
            'All answered thoughtfully with personal application',
            'All answered; most with good depth',
            'Most answered; some lack depth',
            'Incomplete or superficial responses',
        ],
    },

    'resources': [
        'Video 1: Agentic AI Mastery — Cohort Introduction (Session 1)',
        'Video 2: What is an AI Agent? — Agent Fundamentals & Theory (Session 1)',
        'Reference: LLM Agents (Ryan & Toner, 2024) — Autonomy Levels framework',
        'Template: Multi-Agent System Design Canvas (provided in LMS)',
        'Asynchronous Q&A: Post questions in the Session 1 forum by Day 4',
    ],
}

# Session 1 Practical Assignment Content
PRACTICAL_ASSIGNMENT = {
    'overview': """
    This assignment gets you hands-on with Claude Code and Cursor, the tools you'll use to build agents throughout the cohort.
    You'll set up your development environment, connect Claude as your AI pair programmer, and complete your first agentic task
    using Agent mode. This is about building comfort with the tools and the goal→execution→review loop.
    """,

    'learning_objectives': [
        'Successfully install and configure Cursor with Claude API',
        'Understand the three Cursor modes (Chat, Autocomplete, Agent) and when to use each',
        'Execute a multi-step task using Agent mode',
        'Document your workflow and reflect on the agent behavior',
        'Identify opportunities and boundaries for agent autonomy in code tasks',
    ],

    'instructions': [
        'Watch Session 1 Video 3 (Claude Code Setup) completely before starting',
        'Install Cursor from cursor.com for your operating system',
        'Create an Anthropic API key at console.anthropic.com (free tier works)',
        'Connect Claude in Cursor Settings → Models → Add Claude',
        'Complete all three practice tasks below',
        'Document your experience in a 300-word reflection',
        'Submit screenshots, code samples, and reflection to the LMS by the deadline',
    ],

    'practice_tasks': [
        {
            'name': 'Task 1: Chat Mode Fundamentals',
            'description': 'Open Cursor and switch to Chat mode. Ask Claude to explain how web scraping works, then ask it to identify security concerns. Document your three best questions and Claude\'s answers.',
            'estimated_time': '15-20 min',
        },
        {
            'name': 'Task 2: Agent Mode — Your First Autonomous Task',
            'description': '''Give Agent mode this prompt:

"Create a Python script that:
- Reads data from a CSV file
- Filters rows where a specific column meets a condition
- Calculates summary statistics (mean, count, max)
- Saves results to a new CSV file"

Watch Claude reason through the steps, write the code, and offer to run it.
Document: How did Agent mode break down the problem? What did it do well? What would you have done differently?
            ''',
            'estimated_time': '25-30 min',
        },
        {
            'name': 'Task 3: Building a Real Tool',
            'description': '''Use Agent mode to build a practical tool for YOUR work:

Choose one:
A) A script that processes data you actually use (CSV, JSON, API)
B) A tool that automates a repetitive task you do weekly
C) A formatter or analyzer for content you create

Give Claude a clear goal and let Agent mode execute.
Document: What autonomy level did you use (approve each step vs. let it run)?
Where did you intervene? How would you deploy this?
            ''',
            'estimated_time': '40-50 min',
        },
    ],

    'reflection_prompt': """
    REFLECTION: YOUR FIRST AGENTIC WORKFLOW (300 words)

    Reflect on your experience with Agent mode across the three tasks:

    1. THE GOAL→EXECUTION→REVIEW LOOP
       - Describe your workflow: Did you approve each step, or did you let the agent run and review the output?
       - What made you feel confident delegating vs. skeptical?

    2. AUTONOMY & TRUST
       - Where did Agent mode shine? (What was it better than manual coding?)
       - Where did you need to step in? Why?
       - What would it take for you to trust this agent with Task 3 running unsupervised?

    3. COMPARISON TO YOUR CURRENT TOOLS
       - How does this compare to your usual development workflow?
       - What would change in your daily work if you used Agent mode for 30% of coding tasks?

    4. NEXT STEPS
       - What's one real problem you'd solve with Agent mode in the next 2 weeks?
       - What guardrails or checks would you want in place?
    """,

    'exploration_prompts': [
        'Try Chat mode: Ask Claude "What are the most common Python mistakes beginners make?"',
        'Try Autocomplete: Start typing a function and see Claude suggest the rest',
        'Try Agent mode with a vague goal: "Make this code 10x faster" and give it a slow script',
        'Optional: Install Claude Code CLI and run: npm install -g @anthropic-ai/claude-code',
    ],

    'rubric': {
        'Environment Setup': [
            'Cursor installed, Claude connected, Agent mode activated; verification clear',
            'All tools working; setup documented',
            'Tools working but setup documentation minimal',
            'Setup incomplete or unclear',
        ],
        'Task 1: Chat Mode': [
            'Thoughtful questions; excellent Claude responses documented; clear insights',
            'Good questions and answers; shows engagement',
            'Basic questions answered; minimal depth',
            'Incomplete or superficial',
        ],
        'Task 2: Agent Mode': [
            'Clear documentation of Agent reasoning; insightful analysis of strengths/gaps',
            'Good understanding of Agent process; solid reflection',
            'Basic completion; some reflection',
            'Incomplete or vague',
        ],
        'Task 3: Real Tool': [
            'Practical, working tool for real workflow; excellent autonomy/intervention analysis',
            'Working tool; good analysis of trade-offs',
            'Working tool; basic reflection',
            'Tool incomplete or analysis missing',
        ],
        'Reflection Essay': [
            'Insightful; clear vision for integration; thoughtful autonomy analysis',
            'Good reflection; practical insights; clear next steps',
            'Basic reflection; some thoughtfulness',
            'Minimal or superficial',
        ],
    },

    'resources': [
        'Video 3: Claude Code Setup — Cursor & Agent Mode Configuration (Session 1)',
        'Cursor Documentation: https://docs.cursor.com',
        'Anthropic API Keys: https://console.anthropic.com/api-keys',
        'Claude Code CLI: https://github.com/anthropics/claude-code',
        'Troubleshooting: Session 1 FAQ in the LMS',
        'Office Hours: Live Q&A on [Date/Time] for setup help',
    ],
}

def main():
    """Generate both assignment PDFs."""
    base_path = Path(__file__).parent
    output_dir = base_path / "assignments" / "session1"
    output_dir.mkdir(parents=True, exist_ok=True)

    pdf_gen = PDFGeneratorSkill()

    print("\n" + "="*70)
    print("GENERATING SESSION 1 ASSIGNMENTS")
    print("="*70)

    # Generate Theory Assignment
    theory_path = output_dir / "Session1_Theory_Assignment.pdf"
    print(f"\nGenerating: {theory_path.name}")
    try:
        pdf_gen.create_assignment_pdf(
            title="Consumer vs. Producer: Agent Fundamentals & Design",
            assignment_type="Theory",
            session_num=1,
            content_dict=THEORY_ASSIGNMENT,
            output_path=theory_path
        )
        print(f"[OK] Created: {theory_path}")
    except Exception as e:
        print(f"[FAIL] Failed to create theory assignment: {e}")
        return 1

    # Generate Practical Assignment
    practical_path = output_dir / "Session1_Practical_Assignment.pdf"
    print(f"\nGenerating: {practical_path.name}")

    # Restructure practical assignment for PDF format
    practical_content = {
        'overview': PRACTICAL_ASSIGNMENT['overview'],
        'learning_objectives': PRACTICAL_ASSIGNMENT['learning_objectives'],
        'instructions': PRACTICAL_ASSIGNMENT['instructions'],
        'questions': [
            f"<b>Task 1 (15-20 min):</b> {PRACTICAL_ASSIGNMENT['practice_tasks'][0]['description']}",
            f"<b>Task 2 (25-30 min):</b> {PRACTICAL_ASSIGNMENT['practice_tasks'][1]['description']}",
            f"<b>Task 3 (40-50 min):</b> {PRACTICAL_ASSIGNMENT['practice_tasks'][2]['description']}",
        ] + [
            f"<b>Reflection:</b> {PRACTICAL_ASSIGNMENT['reflection_prompt'][:200]}... (see document)"
        ],
        'rubric': PRACTICAL_ASSIGNMENT['rubric'],
        'resources': PRACTICAL_ASSIGNMENT['resources'],
    }

    try:
        pdf_gen.create_assignment_pdf(
            title="Your First Agentic Workflow: Setting Up & Using Claude Code",
            assignment_type="Practical",
            session_num=1,
            content_dict=practical_content,
            output_path=practical_path
        )
        print(f"[OK] Created: {practical_path}")
    except Exception as e:
        print(f"[FAIL] Failed to create practical assignment: {e}")
        return 1

    print("\n" + "="*70)
    print("SUCCESS: Session 1 Assignments Generated")
    print("="*70)
    print(f"\nOutput directory: {output_dir}")
    print(f"\nFiles created:")
    print(f"  1. {theory_path.name}")
    print(f"  2. {practical_path.name}")
    print(f"\nAssignment characteristics:")
    print(f"  • Professional formatting with cohort branding")
    print(f"  • Clear learning objectives and rubrics")
    print(f"  • Aligned with session video content")
    print(f"  • Mix of reflection, analysis, and hands-on work")
    print(f"  • Estimated total time: 2-3 hours per student")

    return 0

if __name__ == "__main__":
    sys.exit(main())
