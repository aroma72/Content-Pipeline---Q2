# Skills Directory

Orchestrator-managed skill modules. Each skill is a Claude API call wrapper with defined input/output schemas.

## Skill List

### Perceive Stage
- **[signal_intake.py](./signal_intake.py)** — SignalIntakeSkill
  - Input: raw signals (forum posts, instructor notes, assignments)
  - Output: ContentSignal list (JSON)
  - Model: Claude Opus 4.7

### Plan Stage
- **[content_planner.py](./content_planner.py)** — ContentPlannerSkill
  - Input: signal_backlog.md
  - Output: ContentUnit list (JSON)
  - Model: Claude Opus 4.7

### Act Stage
- **[content_producer.py](./content_producer.py)** — ContentProductionSkill
  - Input: ContentUnit
  - Output: learner_pack (markdown)
  - Model: Claude Sonnet 4.6

- **[instructor_pack.py](./instructor_pack.py)** — InstructorPackSkill
  - Input: ContentUnit
  - Output: instructor_brief (markdown)
  - Model: Claude Sonnet 4.6

- **[assignment_authoring.py](./assignment_authoring.py)** — AssignmentAuthoringSkill
  - Input: ContentUnit outcome + evidence_method
  - Output: assignment + rubric (markdown)
  - Model: Claude Sonnet 4.6

### Observe Stage
- **[session_close.py](./session_close.py)** — SessionCloseSkill
  - Input: session_id, recording path
  - Output: SessionAssetBundle (partial)
  - Model: Claude Opus 4.7

- **[assignment_evaluation.py](./assignment_evaluation.py)** — AssignmentEvaluationSkill
  - Input: assignment submissions batch
  - Output: pass/fail evaluations + aggregate stats
  - Model: Claude Haiku 4.5

### Reflect Stage
- **[content_reflect.py](./content_reflect.py)** — ContentReflectSkill
  - Input: unit outcome + observed metrics (pass rates, completion, feedback)
  - Output: ContentHealthRecord (JSON) with decision (keep/rebuild/kill)
  - Model: Claude Opus 4.7

---

## Skill Template (Week 1 Implementation)

```python
from anthropic import Anthropic
import json
from pydantic import BaseModel

class SkillInput(BaseModel):
    """Input schema for skill"""
    field1: str
    field2: list

class SkillOutput(BaseModel):
    """Output schema for skill"""
    result: dict
    status: str

class MySkill:
    def __init__(self, model="claude-opus-4-7"):
        self.client = Anthropic()
        self.model = model
        self.system_prompt = open("../prompts/my_skill.txt").read()
    
    def call(self, input_data: SkillInput) -> SkillOutput:
        """
        Call skill with input; return validated output.
        """
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": json.dumps(input_data.model_dump())
                }
            ]
        )
        
        output_text = message.content[0].text
        output_data = json.loads(output_text)
        return SkillOutput(**output_data)
```

---

## Pattern: All Skills Follow This

1. **Input**: Pydantic model (validated before skill call)
2. **System Prompt**: From `../prompts/` directory
3. **Model**: Opus/Sonnet/Haiku per skill (defined above)
4. **Output**: Pydantic model (validated after skill call)
5. **Error Handling**: Return + log; don't raise (orchestrator handles)

---

## Testing Skills

Each skill has a corresponding test file in `../tests/`:

```bash
pytest tests/test_signal_intake.py
pytest tests/test_content_planner.py
# etc.
```

Pass criteria for each skill defined in `../memory/ref_anthropic_practices.md`.

---

## Skill Versioning

Prompts are versioned independently (in `../prompts/`). If you change a prompt:
1. Update `../prompts/skill_name.txt`
2. Test on eval dataset (in `../tests/eval_dataset/`)
3. Tag version: `v1.0`, `v1.1`, etc. in git
4. Update this README with version note

---

**All skills are called by ContentOrchestrator (see planning/planning.md for orchestrator flow).**
