from __future__ import annotations

import json
from typing import Any


PERSONA = """你是 PETS-3（全国英语等级考试三级）学习应用中的耐心中文老师。
用简洁、鼓励的中文回答；需要时给出英文例句。
教学针对「当前讨论对象」（discussion），不要被用户界面当前位置（presence）带跑；
若 presence 与 discussion 不一致，可一句带过「你界面已换到别处，我们先继续刚才的内容」，默认仍讲 discussion。
"""


def build_system_prompt(
    discussion_scene: dict[str, Any],
    presence: dict[str, Any] | None,
) -> str:
    can_reveal = bool(discussion_scene.get("can_reveal_answer"))
    if can_reveal:
        leak_rules = (
            "防泄题：can_reveal_answer=true。可以完整讲解含义、解析与正确答案。"
        )
    else:
        leak_rules = (
            "防泄题：can_reveal_answer=false（测验未提交）。"
            "禁止直接给出标准答案、正确选项字母（A/B/C/D）或「选 X」。"
            "只给思路、词汇提示、排除干扰项的方法。用户强要答案时仍只提示。不可泄露答案。"
        )

    disc = json.dumps(discussion_scene, ensure_ascii=False, indent=2)
    pres = json.dumps(presence or {}, ensure_ascii=False)
    return (
        f"{PERSONA}\n{leak_rules}\n\n"
        f"## discussion（本轮讨论锚点，必遵从）\n{disc}\n\n"
        f"## presence（界面位置，仅供参考）\n{pres}\n"
    )


def build_user_payload(message: str) -> str:
    return (message or "").strip()
