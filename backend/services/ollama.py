"""Ollama client — chat (streaming), generate, embeddings with model fallback."""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

import httpx

from backend.config import (
    OLLAMA_BASE_URL,
    OLLAMA_CHAT_MODEL,
    OLLAMA_EMBED_MODEL,
    OLLAMA_EMBED_TIMEOUT_SECONDS,
    OLLAMA_FALLBACK_MODELS,
    OLLAMA_TIMEOUT_SECONDS,
    SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)


class OllamaError(Exception):
    """Raised when Ollama requests fail."""


class OllamaService:
    """Offline Ollama integration via localhost:11434."""

    def __init__(self) -> None:
        self.base_url = OLLAMA_BASE_URL.rstrip("/")
        self.default_chat_model = OLLAMA_CHAT_MODEL
        self.default_embed_model = OLLAMA_EMBED_MODEL
        self.fallback_models = OLLAMA_FALLBACK_MODELS

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                return [m["name"] for m in resp.json().get("models", [])]
        except Exception as exc:
            logger.warning("Failed to list Ollama models: %s", exc)
            return []

    def _resolve_model(self, preferred: str, installed: list[str]) -> str | None:
        if preferred in installed:
            return preferred
        for model in self.fallback_models:
            if model in installed:
                return model
        for model in installed:
            if preferred.split(":")[0] in model:
                return model
        return installed[0] if installed else None

    async def resolve_chat_model(self, model: str | None = None) -> str:
        installed = await self.list_models()
        resolved = self._resolve_model(model or self.default_chat_model, installed)
        if not resolved:
            raise OllamaError(
                "No Ollama chat models available. Run: ollama pull llama3.2"
            )
        return resolved

    async def resolve_embed_model(self, model: str | None = None) -> str:
        installed = await self.list_models()
        preferred = model or self.default_embed_model
        
        # 1. Check if preferred is installed
        if preferred in installed:
            return preferred
        for inst in installed:
            if preferred.split(":")[0] in inst:
                return inst
                
        # 2. Check if any embedding-related model is installed
        embed_indicators = ["embed", "bge", "minilm"]
        for inst in installed:
            if any(ind in inst.lower() for ind in embed_indicators):
                return inst
                
        # If we reach here, we don't have a known embedding model installed.
        raise OllamaError(
            f"No dedicated Ollama embedding model (like '{preferred}') is currently installed. "
            f"Installed models: {installed}. Please run: ollama pull nomic-embed-text"
        )

    async def generate(
        self,
        prompt: str,
        *,
        model: str | None = None,
        system: str | None = None,
        temperature: float = 0.7,
    ) -> str:
        chat_model = await self.resolve_chat_model(model)
        payload = {
            "model": chat_model,
            "prompt": prompt,
            "system": system or SYSTEM_PROMPT,
            "stream": False,
            "options": {"temperature": temperature},
        }
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
                resp = await client.post(f"{self.base_url}/api/generate", json=payload)
                resp.raise_for_status()
                data = resp.json()
                return (data.get("response") or "").strip()
        except Exception as exc:
            raise OllamaError(f"Ollama generation failed: {exc}") from exc

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        system: str | None = None,
        temperature: float = 0.7,
        stream: bool = False,
    ) -> str | AsyncIterator[str]:
        chat_model = await self.resolve_chat_model(model)
        payload: dict[str, Any] = {
            "model": chat_model,
            "messages": messages,
            "system": system or SYSTEM_PROMPT,
            "stream": stream,
            "options": {"temperature": temperature},
        }

        try:
            if not stream:
                async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
                    resp = await client.post(f"{self.base_url}/api/chat", json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    message = data.get("message") or {}
                    return (message.get("content") or "").strip()

            return self._stream_chat(payload)
        except Exception as exc:
            raise OllamaError(f"Ollama chat failed: {exc}") from exc

    async def _stream_chat(self, payload: dict[str, Any]) -> AsyncIterator[str]:
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT_SECONDS) as client:
                async with client.stream(
                    "POST", f"{self.base_url}/api/chat", json=payload
                ) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        message = chunk.get("message") or {}
                        content = message.get("content")
                        if content:
                            yield content
                        if chunk.get("done"):
                            break
        except Exception as exc:
            raise OllamaError(f"Ollama chat stream failed: {exc}") from exc

    async def embeddings(
        self,
        text: str,
        *,
        model: str | None = None,
    ) -> list[float]:
        embed_model = await self.resolve_embed_model(model)
        payload = {"model": embed_model, "prompt": text}
        try:
            async with httpx.AsyncClient(timeout=OLLAMA_EMBED_TIMEOUT_SECONDS) as client:
                resp = await client.post(f"{self.base_url}/api/embeddings", json=payload)
                resp.raise_for_status()
                data = resp.json()
                vector = data.get("embedding")
                if not vector:
                    raise OllamaError("Ollama returned empty embedding vector")
                return vector
        except Exception as exc:
            if isinstance(exc, OllamaError):
                raise
            raise OllamaError(f"Ollama embeddings failed: {exc}") from exc

    async def embeddings_batch(
        self,
        texts: list[str],
        *,
        model: str | None = None,
    ) -> list[list[float]]:
        results: list[list[float]] = []
        for text in texts:
            results.append(await self.embeddings(text, model=model))
        return results


ollama_service = OllamaService()
