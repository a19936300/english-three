from agent_english.tutor.tools import format_profile_for_prompt, format_memories_for_prompt


def test_cold_start_profile():
    s = format_profile_for_prompt({"total_answers": 0})
    assert "冷启动" in s or "暂无" in s


def test_memory_format():
    s = format_memories_for_prompt([{"kind": "weak_point", "content": "被动语态"}])
    assert "被动语态" in s
