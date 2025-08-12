import os
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
import sqlite3
from database import DB_PATH
from kubernetes import client, config
import openai

class EventAnalyzer:
    def __init__(self):
        self.api_key = os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            print("[EVENT-AI][WARNING] OpenAI API key not found in environment")
            self.enabled = False
            self.client = None
        else:
            try:
                openai.api_key = self.api_key
                self.client = openai
                self.enabled = True
                print("[EVENT-AI][INFO] Event Analyzer initialized successfully")
            except Exception as e:
                print(f"[EVENT-AI][ERROR] Failed to initialize OpenAI client: {e}")
                self.enabled = False
                self.client = None

    def is_enabled(self) -> bool:
        return self.enabled

    async def analyze_cluster_events(self, cluster: str, hours: int = 24) -> Dict:
        """Analyze recent events from a cluster with AI insights"""
        try:
            # Get recent events
            events_data = self._get_recent_events(cluster, hours)
            
            if not events_data:
                return {
                    "cluster": cluster,
                    "summary": "No events found in the specified timeframe",
                    "insights": [],
                    "recommendations": [],
                    "timestamp": datetime.utcnow().isoformat()
                }

            # AI Analysis
            analysis = await self._get_ai_event_analysis(events_data, cluster)
            
            return {
                "cluster": cluster,
                "events_analyzed": len(events_data),
                "timeframe_hours": hours,
                "analysis": analysis,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            print(f"[EVENT-AI][ERROR] Event analysis failed: {e}")
            return {
                "error": f"Analysis failed: {str(e)}",
                "cluster": cluster,
                "timestamp": datetime.utcnow().isoformat()
            }
    """Analyze overall cluster health with AI insights"""
    async def _get_ai_event_analysis(self, events: List[Dict], cluster: str) -> Dict:
        """Get AI analysis of events using OpenAI GPT-4, grouped by event_type"""
        if not self.enabled or not self.client:
            return {"error": "AI service not available - API key missing"}
        try:
            # Group events by event_type (Warning, Normal, etc.)
            from collections import defaultdict
            grouped_by_type = defaultdict(list)
            for e in events:
                grouped_by_type[e.get('event_type', 'Unknown')].append(e)
            # Prepare summary for each category
            event_summary = {
                "cluster": cluster,
                "event_count": len(events),
                "categories": {}
            }
            for event_type, group in grouped_by_type.items():
                # En çok tekrar eden ilk 10 reason/message
                reason_group = {}
                for e in group:
                    key = f"{e.get('reason','Unknown')}|{e.get('message','')[:60]}"
                    if key not in reason_group:
                        reason_group[key] = {**e, "_count": 0}
                    reason_group[key]["_count"] += e.get("count", 1)
                top_events = sorted(reason_group.values(), key=lambda x: x["_count"], reverse=True)[:10]
                event_summary["categories"][event_type] = {
                    "count": len(group),
                    "top_events": top_events
                }
            # Yeni prompt: kategori bazlı analiz iste
            system_prompt = (
                f"You are a Kubernetes expert specializing in event analysis and troubleshooting.\n"
                f"Only consider events from cluster: {cluster}.\n"
                "Analyze the provided Kubernetes events grouped by event_type (e.g., Warning, Normal, etc). For each category, provide your answer in TURKISH.\n"
                "For each category, provide:\n"
                "- Category Summary: What is happening in this category?\n"
                "- Most important issues or patterns in this category\n"
                "- Root cause and recommendations for this category\n"
                "- Risk level for this category (Low/Medium/High/Critical)\n"
                "Respond in JSON. Example output:\n"
                '{"Warning": {"summary": "...", "issues": ["..."], "root_cause": "...", "recommendations": ["..."], "risk_level": "High"}, "Normal": {"summary": "...", ...}}'
            )
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # maliyet için gpt-4 yerine gpt-3.5-turbo kullan
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Analyze these Kubernetes events grouped by event_type for cluster '{cluster}':\n\n{json.dumps(event_summary, indent=2)}"}
                ],
                max_tokens=1200,  # daha düşük token limiti
                temperature=0.1
            )
            print(f"[EVENT-AI][DEBUG] OpenAI raw response object: {response}")
            ai_content = response.choices[0].message.content if response.choices and response.choices[0].message else ""
            print(f"[EVENT-AI][DEBUG] Raw AI response:\n{ai_content}")  # DEBUG: AI yanıtını logla
            try:
                analysis_result = json.loads(ai_content)
            except json.JSONDecodeError:
                analysis_result = {"summary": ai_content}
            analysis_result["ai_model"] = "gpt-3.5-turbo"
            analysis_result["tokens_used"] = response.usage.total_tokens
            return analysis_result
        except Exception as e:
            print(f"[EVENT-AI][ERROR] OpenAI API call failed: {e}")
            return {"error": f"AI analysis failed: {str(e)}"}

    def _prepare_event_context(self, events: List[Dict], cluster: str) -> Dict:
        """Prepare event data for AI analysis"""
        # Categorize events
        critical_events = [e for e in events if e['event_type'] == 'Warning' or 'Failed' in e.get('reason', '')]
        normal_events = [e for e in events if e['event_type'] == 'Normal']
        
        # Group by reason
        reason_counts = {}
        for event in events:
            reason = event.get('reason', 'Unknown')
            reason_counts[reason] = reason_counts.get(reason, 0) + event.get('count', 1)
        
        # Group by object
        object_events = {}
        for event in events:
            obj_key = f"{event.get('object_kind', 'Unknown')}/{event.get('object_name', 'Unknown')}"
            if obj_key not in object_events:
                object_events[obj_key] = []
            object_events[obj_key].append(event)
        
        return {
            "cluster_name": cluster,
            "total_events": len(events),
            "critical_events_count": len(critical_events),
            "normal_events_count": len(normal_events),
            "top_reasons": dict(sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
            "critical_events": critical_events[:15],  # Top 15 critical events
            "affected_objects": {k: len(v) for k, v in object_events.items()},
            "event_timeline": events[:20]  # Recent 20 events for timeline analysis
        }

    def _get_recent_events(self, cluster: str, hours: int = 24, limit: int = 1000) -> List[Dict]:
        """Get recent events from database (only Warning/Critical events for AI analysis)"""
        try:
            with sqlite3.connect(DB_PATH) as conn:
                c = conn.cursor()
                c.execute(f"""
                    SELECT cluster, namespace, object_name, object_kind, event_type, reason, message, count, timestamp
                    FROM events 
                    WHERE cluster = ? AND datetime(timestamp) >= datetime('now', '-{hours} hours')
                    AND (event_type = 'Warning' OR event_type = 'Error' OR event_type = 'Critical')
                    ORDER BY timestamp DESC LIMIT ?
                """, (cluster, limit))
                rows = c.fetchall()
                return [
                    {
                        "cluster": row[0], "namespace": row[1], "object_name": row[2],
                        "object_kind": row[3], "event_type": row[4], "reason": row[5],
                        "message": row[6], "count": row[7], "timestamp": row[8]
                    }
                    for row in rows
                ]
        except Exception as e:
            print(f"[EVENT-AI][ERROR] Failed to get events: {e}")
            return []

# Global Event Analyzer instance
event_analyzer = EventAnalyzer()
