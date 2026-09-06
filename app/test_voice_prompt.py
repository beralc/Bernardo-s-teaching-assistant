"""Offline instruction-builder checks; no credentials or API calls."""
import sys
import types
import unittest
from unittest.mock import patch

with patch.dict(sys.modules, {
    "config": types.SimpleNamespace(SUPABASE_URL="", SUPABASE_SERVICE_KEY=""),
    "requests": types.ModuleType("requests"),
}):
    from utils import load_prompt, build_realtime_instructions


class VoicePromptTests(unittest.TestCase):
    def test_json_feedback_is_rendered_for_each_supported_level(self):
        prompt = load_prompt()
        for level in ("A2", "B1", "B2"):
            rendered = build_realtime_instructions(prompt, level)
            for rule in prompt["behavior"]["voice_feedback"]:
                self.assertIn(rule, rendered)
            self.assertNotIn("Model corrections implicitly instead", rendered)
            self.assertNotIn("This is mandatory", rendered)

    def test_json_changes_reach_the_effective_voice_prompt(self):
        prompt = load_prompt()
        prompt["behavior"]["voice_feedback"] = ["Unique test feedback policy."]
        rendered = build_realtime_instructions(prompt)
        self.assertIn("Unique test feedback policy.", rendered)
        self.assertNotIn("Prefer: \"A natural way", rendered)


if __name__ == "__main__":
    unittest.main()
