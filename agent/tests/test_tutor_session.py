from agent_english.tutor.session_store import InMemorySessionStore, apply_discussion


def test_bind_set_creates_session():
    store = InMemorySessionStore()
    scene = {
        "level_id": "vocabulary-1",
        "can_reveal_answer": True,
        "content": {"type": "word", "en": "hi"},
    }
    sess, err = apply_discussion(
        store,
        user_id="u1",
        session_id="s1",
        discussion={"bind": "set", "scene": scene},
    )
    assert err is None
    assert sess["id"] == "s1"
    assert sess["user_id"] == "u1"
    assert sess["discussion_scene"]["content"]["en"] == "hi"


def test_bind_keep_without_session_fails():
    store = InMemorySessionStore()
    sess, err = apply_discussion(
        store, user_id="u1", session_id="s-missing", discussion={"bind": "keep"}
    )
    assert sess is None
    assert err == "session_not_found"


def test_bind_keep_reuses_anchor():
    store = InMemorySessionStore()
    scene = {"level_id": "vocabulary-1", "can_reveal_answer": False}
    apply_discussion(store, "u1", "s1", {"bind": "set", "scene": scene})
    sess, err = apply_discussion(store, "u1", "s1", {"bind": "keep"})
    assert err is None
    assert sess["discussion_scene"]["can_reveal_answer"] is False


def test_bind_keep_wrong_user_forbidden():
    store = InMemorySessionStore()
    apply_discussion(store, "u1", "s1", {"bind": "set", "scene": {"x": 1}})
    sess, err = apply_discussion(store, "u2", "s1", {"bind": "keep"})
    assert err == "forbidden"


def test_bind_set_requires_scene():
    store = InMemorySessionStore()
    sess, err = apply_discussion(store, "u1", "s1", {"bind": "set"})
    assert err == "missing_scene"
