#!/usr/bin/env python3
"""
Generate simplified Session 1 Assignments for Agentic AI Mastery.
One focused task per assignment with clean, minimal formatting.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.pdf_generator_skill import PDFGeneratorSkill

# Simplified Theory Assignment
THEORY_ASSIGNMENT = {
    'overview': """After watching Session 1 Videos 1 & 2, you'll design a practical agentic solution for a real workflow challenge. This task helps you apply the consumer/producer distinction and understand agent capabilities in your own context.""",

    'learning_objectives': [
        'Apply consumer vs. producer thinking to your work',
        'Design an agent solution that respects human-agent boundaries',
        'Define success metrics for agentic systems',
    ],

    'instructions': [
        'Watch Videos 1 & 2 (Cohort Introduction, What is an AI Agent?)',
        'Complete the assignment below in 2-3 pages',
        'Submit as PDF or Word document by the deadline',
    ],

    'questions': [
        """<b>TASK: Design an Agent for Your Workflow</b>

Pick ONE task from your work that takes 4+ hours per week (recurring, repetitive, or research-heavy).

Describe:
1. <b>The Problem:</b> What makes this task time-consuming? Why is it important?

2. <b>The Agent Solution:</b> How would an agent handle this? What would it do, step by step?

3. <b>The Human Boundary:</b> Where does human judgment stay essential? (Following the principle: agents can execute, but humans decide strategy and handle relationships)

4. <b>Success Metrics:</b> How would you measure if this works? What should improve?

5. <b>Trust Timeline:</b> If you built this agent, when would you trust it to run without your review? Week 1? Month 1? Never? Why?

<i>Examples from the videos: Harim's curriculum mapping (2-3 weeks → hours), Haroon's vendor invoices, Usman's research cycles. Pick something similar from your domain.</i>
        """,
    ],

    'rubric': {
        'Problem Definition': [
            'Clear, specific problem with business impact',
            'Clear problem; impact stated',
            'Vague problem; limited clarity',
            'Unclear or missing',
        ],
        'Agent Design': [
            'Realistic, well-reasoned solution; steps are clear',
            'Good design; steps mostly clear',
            'Basic design; some steps unclear',
            'Incomplete or unrealistic',
        ],
        'Human Boundary': [
            'Thoughtful distinction between agent and human roles; grounded in session concepts',
            'Clear boundary; good reasoning',
            'Boundary identified; basic reasoning',
            'Missing or unclear',
        ],
        'Success Metrics': [
            'Specific, measurable metrics; realistic targets',
            'Good metrics; realistic',
            'Basic metrics; vague targets',
            'Missing or too vague',
        ],
        'Trust & Autonomy': [
            'Sophisticated understanding of trust-building; realistic timeline',
            'Good understanding; realistic plan',
            'Basic understanding; timeline unclear',
            'Missing or unrealistic',
        ],
    },

    'resources': [
        'Video 1: Agentic AI Mastery — Cohort Introduction',
        'Video 2: What is an AI Agent? — Fundamentals',
        'Template: 1-page design canvas (optional, in LMS)',
    ],
}

# Simplified Practical Assignment
PRACTICAL_ASSIGNMENT = {
    'overview': """After watching Video 3 (Claude Code Setup), you'll get hands-on with Cursor and Agent mode. Your task: build a real tool for your work using Agent mode, then reflect on the experience.""",

    'learning_objectives': [
        'Install and configure Cursor with Claude API',
        'Execute a multi-step coding task using Agent mode',
        'Understand when to delegate vs. intervene in agent autonomy',
    ],

    'instructions': [
        'Watch Video 3 completely (Claude Code Setup)',
        'Install Cursor, create API key, connect Claude',
        'Complete the task below and submit',
        'Include: your code/tool, 1-2 screenshots, short reflection',
    ],

    'questions': [
        """<b>TASK: Build One Tool in Agent Mode</b>

Use Cursor's Agent mode to build a practical tool you'll actually use. Pick ONE:

<b>Option A (Data):</b> A Python script that reads a data file (CSV/JSON/API), processes it, and outputs results. Example: filter a CSV, calculate summary stats, save output.

<b>Option B (Automation):</b> A script that automates a repetitive task you do weekly. Example: rename files, send templated emails, organize data into folders.

<b>Option C (Custom):</b> Any tool that solves a real problem in your workflow.

<b>Your Process:</b>
1. Give Agent mode a clear goal: "Build a script that [your task]"
2. Let it execute (approve each step, or let it run)
3. Test the output
4. If it doesn't work, iterate with Agent mode

<b>Submit:</b>
• The working code (as .py file or pasted in document)
• 1-2 screenshots showing Agent mode in action
• 300-word reflection:

  - What did Agent mode do well?
  - Where did you have to step in?
  - Would you trust this agent to run alone? Why or why not?
  - What would you build next?

<i>Don't worry about perfection. The goal is to experience the goal→execute→review loop with Agent mode.</i>
        """,
    ],

    'rubric': {
        'Tool Functionality': [
            'Tool works end-to-end; solves stated problem',
            'Tool mostly works; minor issues',
            'Tool partially works; some functionality missing',
            'Tool incomplete or non-functional',
        ],
        'Code Quality': [
            'Clean, documented code; good practices',
            'Reasonable code quality',
            'Works but messy or poorly documented',
            'Code unclear or incomplete',
        ],
        'Process Documentation': [
            'Clear screenshots of Agent workflow; good iteration shown',
            'Good screenshots; workflow clear',
            'Basic screenshots; process somewhat clear',
            'Missing or minimal documentation',
        ],
        'Reflection Depth': [
            'Insightful reflection; clear understanding of Agent strengths/limitations',
            'Good reflection; thoughtful insights',
            'Basic reflection; surface-level',
            'Minimal or superficial',
        ],
    },

    'resources': [
        'Video 3: Claude Code Setup — Cursor & Agent Mode',
        'Cursor Docs: https://docs.cursor.com',
        'Anthropic Console: https://console.anthropic.com/api-keys',
        'Session 1 FAQ in LMS for troubleshooting',
    ],
}

def main():
    """Generate simplified assignment PDFs."""
    base_path = Path(__file__).parent
    output_dir = base_path / "assignments" / "session1"
    output_dir.mkdir(parents=True, exist_ok=True)

    pdf_gen = PDFGeneratorSkill()

    print("\n" + "="*70)
    print("GENERATING SIMPLIFIED SESSION 1 ASSIGNMENTS")
    print("="*70)

    # Generate Theory Assignment
    theory_path = output_dir / "Session1_TheoryAssignment.pdf"
    print(f"\nGenerating Theory Assignment...")
    try:
        pdf_gen.create_assignment_pdf(
            title="Design an Agent for Your Workflow",
            assignment_type="Theory",
            session_num=1,
            content_dict=THEORY_ASSIGNMENT,
            output_path=theory_path
        )
        print(f"[OK] Created: Session1_TheoryAssignment.pdf")
    except Exception as e:
        print(f"[FAIL] {e}")
        return 1

    # Generate Practical Assignment
    practical_path = output_dir / "Session1_PracticalAssignment.pdf"
    print(f"\nGenerating Practical Assignment...")
    try:
        pdf_gen.create_assignment_pdf(
            title="Build Your First Tool in Agent Mode",
            assignment_type="Practical",
            session_num=1,
            content_dict=PRACTICAL_ASSIGNMENT,
            output_path=practical_path
        )
        print(f"[OK] Created: Session1_PracticalAssignment.pdf")
    except Exception as e:
        print(f"[FAIL] {e}")
        return 1

    print("\n" + "="*70)
    print("SUCCESS: Simplified Session 1 Assignments Ready")
    print("="*70)
    print(f"\nOutput: {output_dir}")
    print(f"\nAssignments:")
    print(f"  1. Session1_TheoryAssignment.pdf")
    print(f"     • One focused task: Design an agent solution")
    print(f"     • Est. time: 60-90 minutes")
    print(f"     • Covers: consumer/producer, agent design, human boundaries")
    print(f"\n  2. Session1_PracticalAssignment.pdf")
    print(f"     • One focused task: Build a tool with Agent mode")
    print(f"     • Est. time: 90-120 minutes")
    print(f"     • Covers: Cursor setup, Agent mode execution, reflection")
    print(f"\nTotal cohort commitment: ~2.5-3 hours per student\n")

    return 0

if __name__ == "__main__":
    sys.exit(main())
