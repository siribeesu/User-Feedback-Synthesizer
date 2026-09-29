import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Fallback definitions
POSITIVE_KEYWORDS = ["great", "excellent", "love", "amazing", "perfect", "helpful", "fast"]
NEGATIVE_KEYWORDS = ["crash", "bug", "broken", "error", "fail", "terrible", "worst", "expensive", "slow", "cancel"]

_TRANSFORMERS_AVAILABLE = False
try:
    from transformers import pipeline
    from sentence_transformers import SentenceTransformer
    _TRANSFORMERS_AVAILABLE = True
except ImportError:
    pass

# Lazy loaded models
_sentiment_model = None
_emotion_model = None
_embedding_model = None

# Cache
_cache_classify = {}
_cache_embeddings = {}

def get_model_health() -> Dict[str, Any]:
    global _sentiment_model, _emotion_model, _embedding_model
    status = {
        "sentiment": {
            "status": "loaded" if _sentiment_model else "unloaded",
            "model_name": "cardiffnlp/twitter-roberta-base-sentiment-latest"
        },
        "emotion": {
            "status": "loaded" if _emotion_model else "unloaded",
            "model_name": "j-hartmann/emotion-english-distilroberta-base"
        },
        "embeddings": {
            "status": "loaded" if _embedding_model else "unloaded",
            "model_name": "sentence-transformers/all-MiniLM-L6-v2"
        }
    }
    return {
        "models": status,
        "fallback_active": not _TRANSFORMERS_AVAILABLE
    }

def _load_sentiment():
    global _sentiment_model
    if _TRANSFORMERS_AVAILABLE and not _sentiment_model:
        try:
            _sentiment_model = pipeline("sentiment-analysis", model="cardiffnlp/twitter-roberta-base-sentiment-latest")
        except Exception as e:
            logger.warning(f"Failed to load sentiment model: {e}")

def _load_emotion():
    global _emotion_model
    if _TRANSFORMERS_AVAILABLE and not _emotion_model:
        try:
            _emotion_model = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", return_all_scores=True)
        except Exception as e:
            logger.warning(f"Failed to load emotion model: {e}")

def _load_embeddings():
    global _embedding_model
    if _TRANSFORMERS_AVAILABLE and not _embedding_model:
        try:
            _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            logger.warning(f"Failed to load embedding model: {e}")

def classify_feedback(text: str) -> Dict[str, Any]:
    if not text:
        return {"sentiment": "neutral", "emotion": "neutral", "sentiment_confidence": 1.0, "emotion_confidence": 1.0}
    
    if text in _cache_classify:
        return _cache_classify[text]
    
    result = {
        "sentiment": "neutral",
        "emotion": "neutral",
        "sentiment_confidence": 0.0,
        "emotion_confidence": 0.0
    }
    
    try:
        if _TRANSFORMERS_AVAILABLE:
            _load_sentiment()
            if _sentiment_model:
                s_res = _sentiment_model(text)[0]
                result["sentiment"] = s_res["label"].lower()
                result["sentiment_confidence"] = s_res["score"]
                
            _load_emotion()
            if _emotion_model:
                e_res = _emotion_model(text)[0]
                best_e = max(e_res, key=lambda x: x["score"])
                result["emotion"] = best_e["label"].lower()
                result["emotion_confidence"] = best_e["score"]
    except Exception as e:
        logger.warning(f"Error during transformer classification: {e}")
        
    # Fallback if transformers unavailable or failed
    if not _TRANSFORMERS_AVAILABLE or not _sentiment_model:
        pos_count = sum(1 for w in POSITIVE_KEYWORDS if w in text.lower())
        neg_count = sum(1 for w in NEGATIVE_KEYWORDS if w in text.lower())
        if pos_count > neg_count:
            result["sentiment"] = "positive"
            result["sentiment_confidence"] = min(0.5 + (pos_count * 0.1), 1.0)
        elif neg_count > pos_count:
            result["sentiment"] = "negative"
            result["sentiment_confidence"] = min(0.5 + (neg_count * 0.1), 1.0)
        else:
            result["sentiment"] = "neutral"
            result["sentiment_confidence"] = 0.5
            
        result["emotion"] = "neutral"
        result["emotion_confidence"] = 0.5
        
    _cache_classify[text] = result
    return result

def batch_classify(texts: List[str]) -> List[Dict[str, Any]]:
    return [classify_feedback(t) for t in texts]

def get_embedding(text: str) -> List[float]:
    if not text:
        return []
    
    if text in _cache_embeddings:
        return _cache_embeddings[text]
        
    try:
        if _TRANSFORMERS_AVAILABLE:
            _load_embeddings()
            if _embedding_model:
                emb = _embedding_model.encode(text).tolist()
                _cache_embeddings[text] = emb
                return emb
    except Exception as e:
        logger.warning(f"Error getting embedding: {e}")
        
    return []
