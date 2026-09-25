"""MSDS local camera bridge package.

Split into small modules so imports stay cheap and each concern (config,
binaries, whisper, camera pipeline, manager, api) can be edited in isolation.
"""
__all__ = ["config", "binaries", "whisper_engine", "camera", "manager", "api"]
