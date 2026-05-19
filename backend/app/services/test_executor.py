import os
import httpx
from app.models.schemas import TestScenario, ScenarioStatus


def _chat_endpoint(agent_endpoint: str) -> str:
    endpoint = agent_endpoint.rstrip("/")
    if endpoint.endswith("/chat"):
        return endpoint
    return f"{endpoint}/chat"


def _full_url(path_or_url: str) -> str:
    """Ensure the endpoint is a full URL. Relative paths get localhost prepended."""
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        return path_or_url
    port = os.environ.get("PORT", "8000")
    return f"http://localhost:{port}{path_or_url}"


async def execute_scenario(
    scenario: TestScenario,
    agent_endpoint: str,
) -> TestScenario:
    scenario.status = ScenarioStatus.RUNNING

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                _full_url(_chat_endpoint(agent_endpoint)),
                json={"message": scenario.input},
            )
            response.raise_for_status()
            data = response.json()

            scenario.target_response = data.get("response", "")
            scenario.target_tool_calls = data.get("tool_calls", [])
            scenario.status = ScenarioStatus.PASSED
    except Exception as e:
        scenario.target_response = f"Error: {str(e)}"
        scenario.target_tool_calls = []
        scenario.status = ScenarioStatus.ERROR

    return scenario
