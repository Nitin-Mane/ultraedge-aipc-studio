"""Speech services — TTS (text-to-speech) and ASR (automatic speech recognition).

Extracted from RuntimeManager so speech concerns are isolated from model
loading and text generation.
"""

from __future__ import annotations

import logging
import math
import struct
import time
import wave

from app.config import settings

logger = logging.getLogger("speech")


def _tts_generation_limits(text: str, profile: str) -> tuple[int, int, int]:
    """Return thinker tokens, talker tokens, and ODE points for a TTS profile."""
    estimated_text_tokens = max(32, len(text) // 3 + 24)
    thinker_cap = (
        settings.OMNI_FAST_MAX_NEW_TOKENS
        if profile == "fast"
        else settings.TTS_BALANCED_MAX_THINKER_TOKENS
    )
    talker_cap = (
        settings.TTS_FAST_MAX_TALKER_TOKENS
        if profile == "fast"
        else settings.TTS_BALANCED_MAX_TALKER_TOKENS
    )
    ode_steps = (
        settings.TOKEN2WAV_FAST_ODE_STEPS
        if profile == "fast"
        else settings.TOKEN2WAV_ODE_STEPS
    )
    return (
        min(thinker_cap, estimated_text_tokens),
        min(talker_cap, max(128, len(text.split()) * 12 + 64)),
        ode_steps,
    )


def transcribe_audio(audio_filename: str) -> str:
    """Transcribe audio to text. Currently returns a simulated response."""
    logger.info(f"[ASR] Transcribing: {audio_filename}")
    time.sleep(1.0)
    return "Show me the hardware diagnostic scanner results."


def synthesize_speech_file(
    text: str,
    file_path: str,
    speaker: str = "Chelsie",
    pipeline=None,
    pipeline_type: str | None = None,
    processor=None,
    pipeline_lock=None,
    profile: str = "balanced",
) -> bool:
    """Synthesize speech and write to a .wav file.

    Returns True if real speech was generated, False for a placeholder chord.
    """
    profile = "fast" if profile.lower() == "fast" else "balanced"
    max_chars = 360 if profile == "fast" else 600
    text = " ".join(text.split())[:max_chars]
    logger.info(
        f"[TTS] synthesize_speech_file called: text={text[:50]}..., "
        f"speaker={speaker}, profile={profile}, pipeline_type={pipeline_type}, "
        f"pipeline={pipeline is not None}, processor={processor is not None}"
    )

    # If the real Omni pipeline is loaded and has speech synthesis capability:
    if pipeline is not None and pipeline_type == "omni" and processor is not None:
        try:
            import scipy.io.wavfile as wavfile

            conversation = [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": "You are Qwen, a virtual human developed by the Qwen Team, Alibaba Group, capable of perceiving auditory and visual inputs, as well as generating text and speech.",
                        }
                    ],
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Read the following text aloud exactly as written, without adding or changing anything:\n\n{text}"},
                    ],
                },
            ]

            chat_text = processor.apply_chat_template(
                conversation,
                add_generation_prompt=True,
                tokenize=False,
            )

            # This is a text-only TTS request; multimodal extraction adds work
            # but always returns empty audio/image/video lists here.
            inputs = processor(
                text=chat_text,
                padding=True,
                return_tensors="pt",
            )

            thinker_tokens, talker_tokens, ode_steps = _tts_generation_limits(
                text,
                profile,
            )

            started = time.perf_counter()
            with pipeline_lock:
                _sequences, waveform = pipeline.generate(
                    **inputs,
                    return_audio=True,
                    speaker=speaker,
                    thinker_max_new_tokens=thinker_tokens,
                    talker_max_new_tokens=talker_tokens,
                    token2wav_solver=settings.TOKEN2WAV_SOLVER,
                    token2wav_steps=ode_steps,
                )
            if waveform is not None:
                import numpy as np
                wav_data = waveform.reshape(-1).detach().cpu().numpy()
                wav_data = (np.clip(wav_data, -1.0, 1.0) * 32767).astype(np.int16)
                sample_rate = getattr(pipeline.config.token2wav_config, "sampling_rate", 24000)
                wavfile.write(file_path, sample_rate, wav_data)
                logger.info(
                    "[TTS] generated in %.2fs: %s samples at %sHz; limits=%s/%s; token2wav=%s",
                    time.perf_counter() - started,
                    len(wav_data),
                    sample_rate,
                    thinker_tokens,
                    talker_tokens,
                    getattr(pipeline, "last_generation_timings", {}),
                )
                return True
            else:
                logger.warning("[TTS] Omni generate returned None waveform")
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.error(f"Real Qwen-Omni speech token generation failed: {e}\n{tb}. Falling back to synthesized waveform.")

    # Offline Speech wave synthesis fallback (Triad chord with decay envelope)
    logger.warning("[TTS] Falling through to chord fallback - Omni path was skipped or failed")
    return _chord_fallback(file_path)


def _chord_fallback(file_path: str) -> bool:
    """Generate a placeholder chord as a last-resort fallback."""
    try:
        sample_rate = 16000
        duration = 1.5
        num_samples = int(sample_rate * duration)
        freqs = [261.63, 329.63, 392.00, 523.25]

        with wave.open(file_path, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)

            for i in range(num_samples):
                t = float(i) / sample_rate
                envelope = math.exp(-2.5 * t)
                value = 0
                for freq in freqs:
                    value += math.sin(2.0 * math.pi * freq * t)
                value = (value / len(freqs)) * envelope
                packed_value = struct.pack('<h', int(value * 32767))
                wav_file.writeframesraw(packed_value)
        return False
    except Exception as e:
        logger.error(f"Offline speech synthesis fallback failed: {e}")
        return False
