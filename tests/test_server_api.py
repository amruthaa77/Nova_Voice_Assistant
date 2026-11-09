"""Integration and unit tests for FastAPI backend server endpoints."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from elevenlabs.core.api_error import ApiError
from fastapi import HTTPException
from fastapi.testclient import TestClient

from config import Config
from server.app import app
from server.routes.transcripts import get_transcript

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /api/health returns 200 with required status fields."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ElevenLabs" in data["application"]
    assert data["version"] == "1.0.0"


def test_list_transcripts(tmp_path: Path, monkeypatch):
    """Verify GET /api/transcripts lists existing transcripts sorted newest first."""
    # Create sample valid transcripts and one corrupted file
    t1 = {
        "mode": "agent",
        "start_time": "2026-11-01T10:00:00Z",
        "end_time": "2026-11-01T10:02:00Z",
        "duration_seconds": 120.0,
        "turns": [{"speaker": "Assistant", "text": "Hi"}],
    }
    t2 = {
        "mode": "pipeline",
        "start_time": "2026-11-05T12:00:00Z",
        "end_time": "2026-11-05T12:01:00Z",
        "duration_seconds": 60.0,
        "turns": [
            {"speaker": "You", "text": "Hello"},
            {"speaker": "Assistant", "text": "World"},
        ],
    }

    (tmp_path / "agent_20261101_100000.json").write_text(json.dumps(t1), encoding="utf-8")
    (tmp_path / "pipeline_20261105_120000.json").write_text(json.dumps(t2), encoding="utf-8")
    (tmp_path / "corrupted.json").write_text("{broken json invalid...", encoding="utf-8")

    monkeypatch.setattr(
        "server.routes.transcripts.load_config",
        lambda: Config(transcripts_dir=tmp_path),
    )

    response = client.get("/api/transcripts")
    assert response.status_code == 200
    data = response.json()

    # Corrupted file should be safely skipped
    assert len(data) == 2

    # Newest first (pipeline_20261105 before agent_20261101)
    assert data[0]["filename"] == "pipeline_20261105_120000.json"
    assert data[0]["mode"] == "pipeline"
    assert data[0]["total_turns"] == 2

    assert data[1]["filename"] == "agent_20261101_100000.json"
    assert data[1]["mode"] == "agent"
    assert data[1]["total_turns"] == 1


def test_get_transcript_success(tmp_path: Path, monkeypatch):
    """Verify GET /api/transcripts/{filename} returns full transcript JSON."""
    sample_data = {
        "session_id": "conv_abc123",
        "mode": "agent",
        "turns": [{"speaker": "You", "text": "Test speech"}],
    }
    file_path = tmp_path / "agent_20261107_120000.json"
    file_path.write_text(json.dumps(sample_data), encoding="utf-8")

    monkeypatch.setattr(
        "server.routes.transcripts.load_config",
        lambda: Config(transcripts_dir=tmp_path),
    )

    # Test with .json suffix
    res = client.get("/api/transcripts/agent_20261107_120000.json")
    assert res.status_code == 200
    assert res.json()["session_id"] == "conv_abc123"

    # Test without .json suffix (auto-appended)
    res_no_ext = client.get("/api/transcripts/agent_20261107_120000")
    assert res_no_ext.status_code == 200
    assert res_no_ext.json()["session_id"] == "conv_abc123"


def test_get_transcript_not_found(tmp_path: Path, monkeypatch):
    """Verify GET /api/transcripts/{filename} returns 404 for missing transcript."""
    monkeypatch.setattr(
        "server.routes.transcripts.load_config",
        lambda: Config(transcripts_dir=tmp_path),
    )
    response = client.get("/api/transcripts/non_existent_transcript.json")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_get_transcript_path_traversal_blocked(tmp_path: Path, monkeypatch):
    """Verify directory traversal attempts are rejected with 400 Bad Request."""
    monkeypatch.setattr(
        "server.routes.transcripts.load_config",
        lambda: Config(transcripts_dir=tmp_path),
    )

    # 1. Traversal payloads via HTTP client
    traversal_payloads = [
        "..\\config.py",
        "..secret",
        "nested..payload",
    ]
    for payload in traversal_payloads:
        response = client.get(f"/api/transcripts/{payload}")
        assert response.status_code == 400
        assert "not permitted" in response.json()["detail"] or "traversal" in response.json()["detail"]

    # 2. Direct function verification for path traversal sequences with forward slashes
    with pytest.raises(HTTPException) as exc_info1:
        get_transcript("../secret.json")
    assert exc_info1.value.status_code == 400
    assert "traversal" in exc_info1.value.detail

    with pytest.raises(HTTPException) as exc_info2:
        get_transcript("subdir/../../config.py")
    assert exc_info2.value.status_code == 400
    assert "traversal" in exc_info2.value.detail


def test_save_transcript_endpoint(tmp_path: Path, monkeypatch):
    """Verify POST /api/transcripts saves browser conversation transcript without overwriting."""
    monkeypatch.setattr(
        "server.routes.transcripts.load_config",
        lambda: Config(transcripts_dir=tmp_path),
    )

    payload = {
        "session_id": "conv_web_test123",
        "mode": "agent",
        "start_time": "2026-11-07T12:00:00Z",
        "end_time": "2026-11-07T12:01:30Z",
        "duration_seconds": 90.0,
        "agent_id": "agent_test_456",
        "ended_by": "user",
        "turns": [
            {
                "speaker": "Assistant",
                "text": "Hello! How can I help you?",
                "timestamp": "2026-11-07T12:00:05Z",
            },
            {
                "speaker": "You",
                "text": "Tell me about quantum computing.",
                "timestamp": "2026-11-07T12:00:15Z",
            },
        ],
    }

    # 1. First save creates agent_20261107_120000.json
    res1 = client.post("/api/transcripts", json=payload)
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["status"] == "saved"
    assert data1["filename"] == "agent_20261107_120000.json"
    assert data1["total_turns"] == 2
    assert (tmp_path / data1["filename"]).exists()

    # 2. Second save with same timestamp creates unique file agent_20261107_120000_1.json
    res2 = client.post("/api/transcripts", json=payload)
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["filename"] == "agent_20261107_120000_1.json"
    assert (tmp_path / data2["filename"]).exists()

    # 3. Read back saved transcript via GET
    get_res = client.get(f"/api/transcripts/{data1['filename']}")
    assert get_res.status_code == 200
    saved_doc = get_res.json()
    assert saved_doc["session_id"] == "conv_web_test123"
    assert len(saved_doc["turns"]) == 2
    assert saved_doc["turns"][1]["text"] == "Tell me about quantum computing."


def test_get_voices_missing_key(monkeypatch):
    """Verify GET /api/voices returns 503 when ELEVENLABS_API_KEY is not set."""
    monkeypatch.setattr(
        "server.routes.voices.load_config",
        lambda: Config(elevenlabs_api_key=None),
    )
    response = client.get("/api/voices")
    assert response.status_code == 503
    assert "ELEVENLABS_API_KEY is not configured" in response.json()["detail"]


def test_get_voices_success(monkeypatch):
    """Verify GET /api/voices returns mapped voice objects."""
    monkeypatch.setattr(
        "server.routes.voices.load_config",
        lambda: Config(elevenlabs_api_key="valid_key"),
    )

    mock_voice = MagicMock()
    mock_voice.voice_id = "v_123"
    mock_voice.name = "Rachel"
    mock_voice.category = "premade"
    mock_voice.description = "Calm female narrator"
    mock_voice.labels = {"accent": "american"}
    mock_voice.preview_url = "https://example.com/rachel.mp3"

    mock_response = MagicMock()
    mock_response.voices = [mock_voice]

    with patch("server.routes.voices.ElevenLabs") as mock_elevenlabs:
        mock_client = mock_elevenlabs.return_value
        mock_client.voices.get_all.return_value = mock_response

        response = client.get("/api/voices")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["voices"][0]["voice_id"] == "v_123"
        assert data["voices"][0]["name"] == "Rachel"
        assert data["voices"][0]["labels"]["accent"] == "american"


def test_get_voices_api_error_401(monkeypatch):
    """Verify GET /api/voices maps ElevenLabs 401 error properly."""
    monkeypatch.setattr(
        "server.routes.voices.load_config",
        lambda: Config(elevenlabs_api_key="bad_key"),
    )

    with patch("server.routes.voices.ElevenLabs") as mock_elevenlabs:
        mock_client = mock_elevenlabs.return_value
        error = ApiError(status_code=401, body="Invalid API key")
        mock_client.voices.get_all.side_effect = error

        response = client.get("/api/voices")
        assert response.status_code == 401
        assert "Invalid ELEVENLABS_API_KEY" in response.json()["detail"]


def test_agent_signed_url_missing_credentials(monkeypatch):
    """Verify POST /api/agent/signed-url returns 503 if API key or Agent ID is missing."""
    # 1. Missing API Key
    monkeypatch.setattr(
        "server.routes.agent.load_config",
        lambda: Config(elevenlabs_api_key=None, elevenlabs_agent_id="agent_123"),
    )
    res1 = client.post("/api/agent/signed-url")
    assert res1.status_code == 503
    assert "ELEVENLABS_API_KEY is not configured" in res1.json()["detail"]

    # 2. Missing Agent ID
    monkeypatch.setattr(
        "server.routes.agent.load_config",
        lambda: Config(elevenlabs_api_key="valid_key", elevenlabs_agent_id=None),
    )
    res2 = client.post("/api/agent/signed-url")
    assert res2.status_code == 503
    assert "ELEVENLABS_AGENT_ID is not configured" in res2.json()["detail"]


def test_agent_signed_url_success(monkeypatch):
    """Verify POST /api/agent/signed-url returns temporary signed URL without exposing secrets."""
    monkeypatch.setattr(
        "server.routes.agent.load_config",
        lambda: Config(elevenlabs_api_key="sk_live_123", elevenlabs_agent_id="agent_xyz789"),
    )

    mock_response = MagicMock()
    mock_response.signed_url = "wss://api.elevenlabs.io/v1/convai/conversation?signed_token=temp_token_456"

    with patch("server.routes.agent.ElevenLabs") as mock_elevenlabs:
        mock_client = mock_elevenlabs.return_value
        mock_client.conversational_ai.conversations.get_signed_url.return_value = mock_response

        response = client.post("/api/agent/signed-url")
        assert response.status_code == 200
        data = response.json()

        assert data["agent_id"] == "agent_xyz789"
        assert "temp_token_456" in data["signed_url"]
        # Crucial security check: Permanent API key MUST NOT appear anywhere in the response!
        assert "sk_live_123" not in response.text


def test_agent_signed_url_api_error_404(monkeypatch):
    """Verify POST /api/agent/signed-url handles missing agent ID on ElevenLabs with 404."""
    monkeypatch.setattr(
        "server.routes.agent.load_config",
        lambda: Config(elevenlabs_api_key="valid_key", elevenlabs_agent_id="agent_missing"),
    )

    with patch("server.routes.agent.ElevenLabs") as mock_elevenlabs:
        mock_client = mock_elevenlabs.return_value
        error = ApiError(status_code=404, body="Agent not found")
        mock_client.conversational_ai.conversations.get_signed_url.side_effect = error

        response = client.post("/api/agent/signed-url")
        assert response.status_code == 404
        assert "not found on ElevenLabs" in response.json()["detail"]


def test_cors_headers():
    """Verify that CORS preflight request allows the React frontend origin."""
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
