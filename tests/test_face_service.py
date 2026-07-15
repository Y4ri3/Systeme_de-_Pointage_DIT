from app.services.face_service import extract_liveness_result, extract_match_result

# Payloads tels que documentes sur https://faceapi.arsa.technology/docs
# (face-liveness et face-validation) -- a ne pas modifier sans revalider contre
# la vraie API, c'est exactement le bug qui bloquait tous les pointages faciaux :
# le code lisait "liveness_probability" alors que /face_liveness renvoie
# "liveness_confidence", donc le score retombait toujours a 0.


def test_extract_liveness_result_lit_liveness_confidence_reel():
    payload = {
        "status": "success",
        "faces": [
            {
                "bbox": {"x1": 0.1, "y1": 0.1, "x2": 0.5, "y2": 0.6},
                "is_real_face": True,
                "liveness_confidence": 0.97,
                "liveness_status": "real",
            }
        ],
        "latency_ms": 189.23,
    }

    resultat = extract_liveness_result(payload)

    assert resultat["is_real_face"] is True
    assert resultat["liveness_probability"] == 0.97


def test_extract_liveness_result_visage_spoofe():
    payload = {
        "status": "success",
        "faces": [{"is_real_face": False, "liveness_confidence": 0.12, "liveness_status": "spoof"}],
        "latency_ms": 200.0,
    }

    resultat = extract_liveness_result(payload)

    assert resultat["is_real_face"] is False
    assert resultat["liveness_probability"] == 0.12


def test_extract_liveness_result_accepte_encore_liveness_probability():
    # Robustesse : si un payload utilise l'ancien nom de champ (ex. imbrique dans
    # validate_faces.faceN_analysis.passive_liveness), on doit toujours le lire.
    payload = {"faces": [{"is_real_face": True, "liveness_probability": 0.88}]}

    resultat = extract_liveness_result(payload)

    assert resultat["is_real_face"] is True
    assert resultat["liveness_probability"] == 0.88


def test_extract_liveness_result_aucun_visage_detecte():
    payload = {"status": "success", "faces": [], "latency_ms": 50.0}

    resultat = extract_liveness_result(payload)

    assert resultat["is_real_face"] is False
    assert resultat["liveness_probability"] == 0


def test_extract_match_result_payload_reel_validate_faces():
    payload = {
        "status": "success",
        "match_result": True,
        "similarity_score": 0.92,
        "face1_analysis": {
            "bbox": {},
            "passive_liveness": {"is_real_face": True, "liveness_probability": 0.97},
        },
        "face2_analysis": {
            "bbox": {},
            "passive_liveness": {"is_real_face": True, "liveness_probability": 0.95},
        },
        "latency_ms": 456.78,
    }

    resultat = extract_match_result(payload)

    assert resultat["match"] is True
    assert resultat["similarity_score"] == 0.92
