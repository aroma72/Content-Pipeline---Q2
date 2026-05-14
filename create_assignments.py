#!/usr/bin/env python3
"""
Generate minimal Session 1 assignments - One question per assignment.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from skills.simple_pdf_skill import SimplePDFSkill

def main():
    base_path = Path(__file__).parent
    output_dir = base_path / "assignments" / "session1"
    output_dir.mkdir(parents=True, exist_ok=True)

    pdf_gen = SimplePDFSkill()

    print("\n" + "="*70)
    print("GENERATING SESSION 1 ASSIGNMENTS")
    print("="*70)

    # Theory Assignment
    theory_path = output_dir / "Session1_TheoryAssignment.pdf"
    theory_instructions = [
        "Watch Videos 1 & 2 (Cohort Introduction and What is an AI Agent)",
        "Answer the question below in 2-3 pages",
        "Submit as PDF or Word by the deadline"
    ]
    theory_question = """
    <b>Design an agent solution for a real workflow in your organization.</b>
    <br/><br/>
    Pick a task that takes 4+ hours per week (recurring, research-heavy, or repetitive).
    Describe: (1) What's the problem? (2) How would an agent solve it step-by-step?
    (3) Where does human judgment stay essential? (4) How would you measure success?
    (5) When would you trust it to run without your review?
    <br/><br/>
    <i>Reference examples from the videos: Harim's curriculum mapping, Haroon's invoice tracking, Usman's research cycles.</i>
    """

    print(f"\nGenerating: Session1_TheoryAssignment.pdf")
    try:
        pdf_gen.create_assignment(
            title="Design an Agent for Your Workflow",
            assignment_type="Theory",
            session_num=1,
            instructions=theory_instructions,
            question=theory_question,
            output_path=theory_path
        )
        print(f"[OK] Created")
    except Exception as e:
        print(f"[FAIL] {e}")
        return 1

    # Practical Assignment
    practical_path = output_dir / "Session1_PracticalAssignment.pdf"
    practical_instructions = [
        "Watch Video 3 (Claude Code Setup) completely",
        "Install Cursor, create API key, connect Claude",
        "Build a tool using Agent mode and submit"
    ]
    practical_question = """
    <b>Build one practical tool using Cursor's Agent mode and describe your experience.</b>
    <br/><br/>
    Pick ONE: (A) A script that processes data (read CSV, filter, calculate stats, save),
    (B) A script that automates a weekly task, or (C) Any tool solving a real problem in your workflow.
    <br/><br/>
    Use Agent mode by giving it your goal and letting it execute.
    Submit: (1) Your working code, (2) 1-2 screenshots showing Agent mode,
    (3) 300-word reflection: What did Agent mode do well? Where did you intervene?
    Would you trust it to run alone? What would you build next?
    """

    print(f"\nGenerating: Session1_PracticalAssignment.pdf")
    try:
        pdf_gen.create_assignment(
            title="Build Your First Tool in Agent Mode",
            assignment_type="Practical",
            session_num=1,
            instructions=practical_instructions,
            question=practical_question,
            output_path=practical_path
        )
        print(f"[OK] Created")
    except Exception as e:
        print(f"[FAIL] {e}")
        return 1

    print("\n" + "="*70)
    print("COMPLETE")
    print("="*70)
    print(f"\nOutput: {output_dir}")
    print(f"\nAssignments:")
    print(f"  • Session1_TheoryAssignment.pdf (60-90 min)")
    print(f"  • Session1_PracticalAssignment.pdf (90-120 min)")
    print()

    return 0

if __name__ == "__main__":
    sys.exit(main())
