from agent_english.tutor.prompt import build_system_prompt


def test_prompt_forbids_answer_when_cannot_reveal():
    scene = {
        "phase": "quiz",
        "can_reveal_answer": False,
        "content": {"type": "quiz", "question": "What is X?", "options": ["A", "B"]},
    }
    text = build_system_prompt(scene, presence=None)
    assert "禁止" in text or "不要" in text
    assert "can_reveal_answer=false" in text.lower() or "不可泄露答案" in text


def test_prompt_allows_full_explain_when_can_reveal():
    scene = {
        "phase": "learn",
        "can_reveal_answer": True,
        "content": {"type": "word", "en": "cat"},
    }
    text = build_system_prompt(scene, None)
    assert "可以完整讲解" in text or "允许完整" in text
