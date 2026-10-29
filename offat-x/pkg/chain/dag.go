// Package chain implements the Dependency-Aware Stateful Chaining Engine for OFFAT-X.
// Formulated in Section 4.3.1 and 4.3.2, Algorithm 1, and Figure 6.5 of the OFFAT-X IEEE Paper and Phase 1 Report.
package chain

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/offat-x/offat-x/pkg/parser"
)

// ResourceType represents a semantic entity category (e.g., "order", "user", "cart", "vehicle").
type ResourceType string

// OperationNode represents an API operation vertex v ∈ V in the dependency graph G=(V, E).
type OperationNode struct {
	ID             string                  // e.g. "POST /api/v1/orders"
	Method         string                  // e.g. "POST"
	Path           string                  // e.g. "/api/v1/orders"
	DocParam       *parser.DocHttpParams   // Reference to parsed OAS parameter specs
	Produces       []ResourceType          // Resources created/returned by this endpoint
	Consumes       []ResourceType          // Path/query parameter resources required
	ParamNames     []string                // Extracted parameter names (e.g. ["orderId", "id"])
	IsProducer     bool                    // True if operation creates resources (typically POST)
	IsConsumer     bool                    // True if operation requires path parameters
	IsIndependent  bool                    // True if operation can be invoked without prior setup
}

// DependencyEdge represents a directed producer-consumer edge e = (p, c) ∈ E.
type DependencyEdge struct {
	Producer *OperationNode
	Consumer *OperationNode
	Resource ResourceType
	Weight   int // Traversal cost (1 for POST, 2 for PUT/PATCH)
}

// DependencyGraph represents the Directed Acyclic Graph G = (V, E).
type DependencyGraph struct {
	Nodes []*OperationNode
	Edges []*DependencyEdge
	byID  map[string]*OperationNode
}

// Regex to extract parameter names from paths (e.g. "/orders/{orderId}" -> "orderId").
var pathParamRegex = regexp.MustCompile(`\{([^}]+)\}`)

// BuildDependencyGraph synthesizes G = (V, E) from parsed OpenAPI specification parameters.
func BuildDependencyGraph(docParams []*parser.DocHttpParams) *DependencyGraph {
	g := &DependencyGraph{
		byID: make(map[string]*OperationNode),
	}

	// 1. Create Operation Nodes (Vertices V)
	for _, dp := range docParams {
		opID := fmt.Sprintf("%s %s", strings.ToUpper(dp.HttpMethod), dp.Path)
		node := &OperationNode{
			ID:       opID,
			Method:   strings.ToUpper(dp.HttpMethod),
			Path:     dp.Path,
			DocParam: dp,
		}

		// Extract consumed parameter types from path parameters
		matches := pathParamRegex.FindAllStringSubmatch(dp.Path, -1)
		for _, m := range matches {
			if len(m) > 1 {
				pName := m[1]
				node.ParamNames = append(node.ParamNames, pName)
				rType := inferResourceType(pName, dp.Path)
				node.Consumes = append(node.Consumes, rType)
			}
		}

		if len(node.Consumes) > 0 {
			node.IsConsumer = true
		} else {
			node.IsIndependent = true
		}

		// Infer produced resource type
		// POST operations on collection routes (e.g. POST /api/orders) produce order resources
		if node.Method == "POST" {
			rType := inferProducedResourceType(dp.Path)
			if rType != "" {
				node.Produces = append(node.Produces, rType)
				node.IsProducer = true
			}
		}

		g.Nodes = append(g.Nodes, node)
		g.byID[opID] = node
	}

	// 2. Synthesize Producer-Consumer Edges E
	for _, consumer := range g.Nodes {
		if !consumer.IsConsumer {
			continue
		}

		for _, neededResource := range consumer.Consumes {
			for _, producer := range g.Nodes {
				if !producer.IsProducer {
					continue
				}

				for _, prodResource := range producer.Produces {
					if prodResource == neededResource || isCompatibleResource(prodResource, neededResource) {
						weight := 1
						if producer.Method != "POST" {
							weight = 2 // Prioritize POST over PUT/PATCH
						}

						edge := &DependencyEdge{
							Producer: producer,
							Consumer: consumer,
							Resource: neededResource,
							Weight:   weight,
						}
						g.Edges = append(g.Edges, edge)
					}
				}
			}
		}
	}

	return g
}

// inferResourceType maps a parameter name (e.g. "orderId", "user_id", "id") to a ResourceType.
func inferResourceType(paramName, path string) ResourceType {
	lowerP := strings.ToLower(paramName)
	cleanPath := strings.ToLower(path)

	if strings.Contains(lowerP, "order") || strings.Contains(cleanPath, "order") {
		return "order"
	}
	if strings.Contains(lowerP, "vehicle") || strings.Contains(cleanPath, "vehicle") {
		return "vehicle"
	}
	if strings.Contains(lowerP, "cart") || strings.Contains(cleanPath, "cart") {
		return "cart"
	}
	if strings.Contains(lowerP, "item") || strings.Contains(cleanPath, "item") {
		return "item"
	}
	if strings.Contains(lowerP, "user") || strings.Contains(lowerP, "account") {
		return "user"
	}
	if strings.Contains(lowerP, "post") || strings.Contains(cleanPath, "post") {
		return "post"
	}
	if strings.Contains(lowerP, "comment") || strings.Contains(cleanPath, "comment") {
		return "comment"
	}

	// Default fallback: extract from path segment preceding parameter
	parts := strings.Split(strings.Trim(cleanPath, "/"), "/")
	for i, part := range parts {
		if strings.HasPrefix(part, "{") && i > 0 {
			seg := parts[i-1]
			seg = strings.TrimSuffix(seg, "s") // Singularize (orders -> order)
			return ResourceType(seg)
		}
	}

	return ResourceType(lowerP)
}

// inferProducedResourceType determines what resource a creation endpoint generates.
func inferProducedResourceType(path string) ResourceType {
	clean := strings.Trim(strings.ToLower(path), "/")
	parts := strings.Split(clean, "/")
	if len(parts) == 0 {
		return ""
	}

	last := parts[len(parts)-1]
	// If last segment is a parameter, take the preceding segment
	if strings.HasPrefix(last, "{") && len(parts) > 1 {
		last = parts[len(parts)-2]
	}

	last = strings.TrimSuffix(last, "s")
	return ResourceType(last)
}

func isCompatibleResource(p, c ResourceType) bool {
	pStr := string(p)
	cStr := string(c)
	return strings.Contains(cStr, pStr) || strings.Contains(pStr, cStr) || cStr == "id"
}
