package parser

import (
	"fmt"
	"math/rand"
)

// FillHttpParams fills parameter values with type-appropriate fuzz data.
func FillHttpParams(params *[]Param) {
	for i := range *params {
		p := &(*params)[i]
		if p.Value != nil {
			continue // already has a value
		}

		typeStr := "string"
		if len(p.Type) > 0 {
			typeStr = p.Type[0]
		}

		switch typeStr {
		case "integer", "int", "number":
			p.Value = rand.Intn(1000) + 1 //nolint:gosec // fuzz data, security not required
		case "boolean", "bool":
			p.Value = true
		case "array":
			p.Value = []interface{}{"fuzz_item"}
		case "object":
			p.Value = map[string]interface{}{"key": "value"}
		default: // string, etc.
			p.Value = fmt.Sprintf("offatx_%s_fuzz", p.Name)
		}
	}
}
