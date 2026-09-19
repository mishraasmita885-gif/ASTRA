import json
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from app.core.config import settings

logger = logging.getLogger("astra.gemini")


class GeminiAnalysisResult(BaseModel):
    diagnosis: str = Field(
        ...,
        description="Engineering diagnosis grounded strictly in telemetry observations."
    )
    severity: str = Field(
        ...,
        description="Severity level: CRITICAL, HIGH, MEDIUM, or LOW."
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0."
    )
    evidence: List[str] = Field(
        ...,
        description="Empirical observations and violated thresholds from telemetry."
    )
    recommendation: str = Field(
        ...,
        description="Recommended operational procedure requiring flight controller approval."
    )
    operator_approval_required: bool = Field(
        default=True,
        description="Enforced safety constraint: spacecraft actions require human sign-off."
    )


class GeminiDiagnosisService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model_name = settings.GEMINI_MODEL
        self._client = None

        if self.api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
                logger.info("Google GenAI client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}. Fallback engine will be used.")

    def is_configured(self) -> bool:
        return bool(self.api_key and self._client)

    async def analyze_event(self, event_data: Dict[str, Any]) -> GeminiAnalysisResult:
        """
        Produce a structured mission control diagnosis from telemetry anomaly evidence.
        Always enforces operator_approval_required = True.
        """
        channel = event_data.get("channel", "P-3")
        start = event_data.get("start_timestamp", 0)
        end = event_data.get("end_timestamp", 0)
        duration = event_data.get("duration", end - start if end >= start else 0)
        threshold = event_data.get("threshold", 0.3888857)
        score = event_data.get("score", 0.0)

        # Build structured prompt for Gemini
        system_instruction = (
            "You are ASTRA's Mission Intelligence Reasoner for orbital spacecraft operations. "
            "You receive structured telemetry anomaly evidence from numerical change detectors. "
            "Safety constraints: "
            "1. You are an advisory reasoning layer, NOT an autonomous controller. "
            "2. Never execute or claim to execute spacecraft commands. All actions require operator approval. "
            "3. Do not invent physical causes not grounded in telemetry data. Use cautious aerospace phrasing "
            "such as 'telemetry pattern is consistent with an abnormal subsystem state' when data is limited. "
            "4. Return ONLY valid JSON adhering strictly to the required schema."
        )

        prompt_payload = {
            "channel": channel,
            "anomaly_detected": True,
            "event_start": start,
            "event_end": end,
            "duration": duration,
            "detector": event_data.get("detector", "change_detection"),
            "threshold": threshold,
            "peak_score": score,
            "requires_operator_approval": True,
            "subsystem_context": event_data.get("subsystem_context", {})
        }

        user_prompt = (
            f"Analyze this spacecraft anomaly event and output structured JSON:\n"
            f"{json.dumps(prompt_payload, indent=2)}\n\n"
            f"JSON schema requirements:\n"
            f"{{\n"
            f'  "diagnosis": string (factual, non-speculative),\n'
            f'  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",\n'
            f'  "confidence": float (0.0 to 1.0),\n'
            f'  "evidence": list of strings (telemetry observations),\n'
            f'  "recommendation": string (safe-state procedure for operator review),\n'
            f'  "operator_approval_required": true\n'
            f"}}"
        )

        if self.is_configured():
            try:
                response = self._client.models.generate_content(
                    model=self.model_name,
                    contents=user_prompt,
                    config={
                        "system_instruction": system_instruction,
                        "response_mime_type": "application/json",
                        "response_schema": GeminiAnalysisResult,
                    }
                )
                
                text_response = response.text.strip()
                parsed = json.loads(text_response)
                # Enforce safety flag
                parsed["operator_approval_required"] = True
                return GeminiAnalysisResult(**parsed)
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}. Using deterministic safety fallback.")

        # Deterministic aerospace fallback engine (matches NASA handoff guidance)
        return self._generate_rule_based_fallback(channel, start, end, duration, threshold, score)

    def _generate_rule_based_fallback(
        self, channel: str, start: int, end: int, duration: int, threshold: float, score: float
    ) -> GeminiAnalysisResult:
        """Deterministic safety-first fallback matching NASA guidance"""
        severity = "HIGH" if duration > 500 or score > 0.5 else "MEDIUM"
        confidence = 0.91 if channel == "P-3" else 0.82

        evidence = [
            f"Channel {channel} telemetry step-change exceeded learned validation threshold ({threshold:.4f}).",
            f"Anomaly deviation persisted across {duration} telemetry cycles (index {start} to {end}).",
            f"Peak change magnitude recorded at {score:.4f} units."
        ]

        diagnosis = (
            f"Telemetry pattern on channel {channel} is consistent with an abnormal subsystem state "
            f"requiring diagnostic isolation."
        )

        recommendation = (
            f"Place channel {channel} and associated subsystem under active operator review. "
            f"Verify bus/thermal margins and assess execution of contingency safe-state protocol CMD_SAFE_P3."
        )

        return GeminiAnalysisResult(
            diagnosis=diagnosis,
            severity=severity,
            confidence=confidence,
            evidence=evidence,
            recommendation=recommendation,
            operator_approval_required=True
        )


gemini_service = GeminiDiagnosisService()
