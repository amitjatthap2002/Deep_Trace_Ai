from typing import TypedDict, Optional, List, Dict, Any

class AgentState(TypedDict):
    media_id: str
    file_path: str
    media_type: str
    
    # Results from parallel agents
    metadata_result: Optional[Dict[str, Any]]
    deepfake_result: Optional[Dict[str, Any]]
    forensic_result: Optional[Dict[str, Any]]
    fact_check_result: Optional[Dict[str, Any]]
    
    # Aggregated Evidence
    aggregated_evidence: Optional[Dict[str, Any]]
    
    # Final outputs
    trust_score: Optional[float]
    risk_level: Optional[str]
    report_text: Optional[str]
    
    # Error tracking
    errors: List[str]
