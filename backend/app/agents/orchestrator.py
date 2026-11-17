from langgraph.graph import StateGraph, END
from app.agents.state import AgentState
from app.agents.metadata_agent import run_metadata_agent
from app.agents.forensic_agent import run_forensic_agent
from app.agents.deepfake_agent import run_deepfake_agent
from app.agents.fact_check_agent import run_fact_check_agent
from app.agents.trust_score import aggregate_evidence, calculate_trust_score
from app.agents.llm_report import generate_llm_report


def validate_media_node(state: AgentState) -> AgentState:
    print(f"[Orchestrator] Validating media {state['media_id']}")
    return state


def metadata_agent_node(state: AgentState) -> dict:
    print(f"[Orchestrator] Running Metadata Agent for {state['media_id']}")
    try:
        with open(state["file_path"], "rb") as f:
            file_bytes = f.read()
        result = run_metadata_agent(state["file_path"], file_bytes, state["media_type"])
    except Exception as e:
        return {"metadata_result": None, "errors": [f"Metadata Agent failed: {str(e)}"]}
    return {"metadata_result": result}


def deepfake_agent_node(state: AgentState) -> dict:
    print(f"[Orchestrator] Running Deepfake Agent for {state['media_id']}")
    try:
        with open(state["file_path"], "rb") as f:
            file_bytes = f.read()
        result = run_deepfake_agent(file_bytes, state["media_type"])
    except Exception as e:
        return {"deepfake_result": None, "errors": [f"Deepfake Agent failed: {str(e)}"]}
    return {"deepfake_result": result}


def forensic_agent_node(state: AgentState) -> dict:
    print(f"[Orchestrator] Running Forensic Agent for {state['media_id']}")
    try:
        with open(state["file_path"], "rb") as f:
            file_bytes = f.read()
        result = run_forensic_agent(file_bytes, state["media_type"])
    except Exception as e:
        return {"forensic_result": None, "errors": [f"Forensic Agent failed: {str(e)}"]}
    return {"forensic_result": result}


def fact_check_agent_node(state: AgentState) -> dict:
    print(f"[Orchestrator] Running Fact-Check Agent for {state['media_id']}")
    try:
        with open(state["file_path"], "rb") as f:
            file_bytes = f.read()
        result = run_fact_check_agent(file_bytes, state["media_type"])
    except Exception as e:
        return {"fact_check_result": None, "errors": [f"Fact-Check Agent failed: {str(e)}"]}
    return {"fact_check_result": result}


def evidence_aggregation_node(state: AgentState) -> dict:
    print(f"[Orchestrator] Aggregating evidence for {state['media_id']}")
    evidence = aggregate_evidence(
        state.get("metadata_result"),
        state.get("deepfake_result"),
        state.get("forensic_result"),
        state.get("fact_check_result")
    )
    return {"aggregated_evidence": evidence}


def trust_score_calculator_node(state: AgentState) -> dict:
    print(f"[Orchestrator] Calculating trust score for {state['media_id']}")
    score_data = calculate_trust_score(state.get("aggregated_evidence", {}))
    return {
        "trust_score": score_data["trust_score"],
        "risk_level": score_data["risk_level"],
        "explanations": score_data.get("explanations", [])
    }


def llm_report_generator_node(state: AgentState) -> dict:
    print(f"[Orchestrator] Generating LLM report for {state['media_id']}")
    evidence = state.get("aggregated_evidence", {})
    score_data = {
        "trust_score": state.get("trust_score"),
        "risk_level": state.get("risk_level"),
        "sub_scores": evidence.get("sub_scores", {}),
        "explanations": state.get("explanations") or []
    }
    report_text = generate_llm_report(evidence, score_data)
    return {"report_text": report_text}


def build_orchestrator():
    workflow = StateGraph(AgentState)

    workflow.add_node("validate", validate_media_node)
    workflow.add_node("metadata", metadata_agent_node)
    workflow.add_node("deepfake", deepfake_agent_node)
    workflow.add_node("forensic", forensic_agent_node)
    workflow.add_node("fact_check", fact_check_agent_node)
    workflow.add_node("aggregate", evidence_aggregation_node)
    workflow.add_node("score", trust_score_calculator_node)
    workflow.add_node("report", llm_report_generator_node)

    workflow.set_entry_point("validate")
    workflow.add_edge("validate", "metadata")
    workflow.add_edge("validate", "deepfake")
    workflow.add_edge("validate", "forensic")
    workflow.add_edge("validate", "fact_check")
    workflow.add_edge("metadata", "aggregate")
    workflow.add_edge("deepfake", "aggregate")
    workflow.add_edge("forensic", "aggregate")
    workflow.add_edge("fact_check", "aggregate")
    workflow.add_edge("aggregate", "score")
    workflow.add_edge("score", "report")
    workflow.add_edge("report", END)

    return workflow.compile()


orchestrator_app = build_orchestrator()
