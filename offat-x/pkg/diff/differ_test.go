package diff

import (
	"testing"
)

func TestSemanticDiffConfirmedBOLA(t *testing.T) {
	differ := NewDiffer(DefaultWeights())

	// Alice's legitimate order response
	aliceBody := `{"id": 42, "orderId": "ORD-9912", "customer": "Alice", "items": [{"sku": "A1", "price": 100}]}`
	// Attacker Bob exfiltrates Alice's exact order
	bobBody := `{"id": 42, "orderId": "ORD-9912", "customer": "Alice", "items": [{"sku": "A1", "price": 100}]}`

	res := differ.Evaluate(aliceBody, bobBody, 200)

	if !res.IsVulnerable {
		t.Fatalf("expected vulnerable, got %+v", res)
	}
	if res.ScoreD < 0.90 {
		t.Fatalf("expected score D >= 0.90 for identical exfiltration, got %f", res.ScoreD)
	}
	if res.Verdict != "CONFIRMED VULNERABLE" {
		t.Fatalf("expected CONFIRMED VULNERABLE, got %s", res.Verdict)
	}
}

func TestSemanticDiffErrorEnvelopeSuppression(t *testing.T) {
	differ := NewDiffer(DefaultWeights())

	// Alice's legitimate order response
	aliceBody := `{"id": 42, "orderId": "ORD-9912", "customer": "Alice", "items": [{"sku": "A1", "price": 100}]}`
	// Attacker Bob gets a 200 OK with {"success": false, "error": "Unauthorized"}
	bobBody := `{"success": false, "error": "Unauthorized: you do not own this order"}`

	res := differ.Evaluate(aliceBody, bobBody, 200)

	if res.IsVulnerable {
		t.Fatalf("expected immune (safe), but got vulnerable: %+v", res)
	}
	if res.ScoreD >= 0.50 {
		t.Fatalf("expected score D < 0.50 due to error penalty w_e, got %f", res.ScoreD)
	}
	if !res.HasErrorSig {
		t.Fatalf("expected error signature detected")
	}
}
