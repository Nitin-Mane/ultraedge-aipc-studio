"""Focused tests for safe model download and conversion plumbing."""

from unittest.mock import Mock, patch

from app.models.downloader import (
    build_optimum_cli_command,
    download_model_files,
    get_conversion_config,
)


def test_optimum_command_is_argument_list_and_preserves_spaces():
    command = build_optimum_cli_command(
        hf_model_id="C:/models/source snapshot",
        output_dir="C:/models/output snapshot",
        task="text-generation-with-past",
        weight_format="int4",
        quantization={"group_size": 128, "ratio": 0.8, "sym": True},
    )

    assert isinstance(command, list)
    assert command[command.index("--model") + 1] == "C:/models/source snapshot"
    assert command[-1] == "C:/models/output snapshot"
    assert "--sym" in command


def test_remote_code_is_off_unless_explicitly_requested():
    safe = build_optimum_cli_command("model", "output")
    opted_in = build_optimum_cli_command(
        "model", "output", trust_remote_code=True
    )

    assert "--trust-remote-code" not in safe
    assert "--trust-remote-code" in opted_in


def test_omni_7b_uses_custom_converter():
    assert get_conversion_config("qwen25_omni_7b")["conversion_method"] == "omni-python"


def test_download_pins_snapshot_and_verification_to_same_commit(tmp_path):
    model_info = Mock(sha="abc123")
    target = tmp_path / "model"

    def fake_snapshot_download(**kwargs):
        target.mkdir(parents=True, exist_ok=True)
        (target / "config.json").write_text("{}", encoding="utf-8")
        return str(target)

    with (
        patch("app.memory.db.get_setting", return_value="hf_test_token"),
        patch("app.models.downloader.HfApi") as api,
        patch(
            "app.models.downloader.snapshot_download",
            side_effect=fake_snapshot_download,
        ) as snapshot,
        patch(
            "app.models.downloader.verify_model_hashes",
            return_value={"status": "success", "verified_files": 1},
        ) as verify,
    ):
        api.return_value.model_info.return_value = model_info
        result = download_model_files("model", "owner/model", str(target))

    assert result["status"] == "success"
    assert result["revision"] == "abc123"
    assert snapshot.call_args.kwargs["revision"] == "abc123"
    assert verify.call_args.kwargs["revision"] == "abc123"
