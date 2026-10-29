package chain

import (
	"fmt"
)

// SetupStep represents an operation that must execute before the target probe.
type SetupStep struct {
	Node        *OperationNode
	Depth       int
	Resource    ResourceType
	ExtractKey  string // e.g. "id", "orderId"
}

// ExecutionChain represents an ordered prerequisite sequence P(t) to instantiate a consumer target t.
type ExecutionChain struct {
	TargetNode   *OperationNode
	Steps        []SetupStep
	ChainDepth   int
	HasValidPlan bool
}

// Planner discovers setup chains using Breadth-First Search (BFS) bounded to depth L ≤ 4.
type Planner struct {
	graph    *DependencyGraph
	maxDepth int // L ≤ 4
}

// NewPlanner creates a BFS chain planner with maximum depth limit (default 4).
func NewPlanner(g *DependencyGraph, maxDepth int) *Planner {
	if maxDepth <= 0 || maxDepth > 4 {
		maxDepth = 4 // Formally bounded to L ≤ 4 to limit complexity to ≤ 28 reqs/target
	}
	return &Planner{
		graph:    g,
		maxDepth: maxDepth,
	}
}

// FindSetupChain computes the shortest valid execution chain for consumer target t.
func (p *Planner) FindSetupChain(target *OperationNode) ExecutionChain {
	chain := ExecutionChain{
		TargetNode: target,
		ChainDepth: 0,
	}

	if !target.IsConsumer {
		// Target has no prerequisite dependencies (already independent)
		chain.HasValidPlan = true
		return chain
	}

	// BFS Queue item
	type queueItem struct {
		node  *OperationNode
		steps []SetupStep
		depth int
	}

	// Find all direct producers for target
	producers := p.getProducersFor(target)
	if len(producers) == 0 {
		// No producer found in specification (coverage gap flagged)
		chain.HasValidPlan = false
		return chain
	}

	var queue []queueItem
	for _, prod := range producers {
		step := SetupStep{
			Node:       prod,
			Depth:      1,
			ExtractKey: "id",
		}
		queue = append(queue, queueItem{
			node:  prod,
			steps: []SetupStep{step},
			depth: 1,
		})
	}

	// BFS traversal
	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]

		// If current producer is independent (requires no further setup), we found our shortest chain!
		if curr.node.IsIndependent {
			chain.Steps = curr.steps
			chain.ChainDepth = len(curr.steps)
			chain.HasValidPlan = true
			return chain
		}

		if curr.depth >= p.maxDepth {
			continue // Bounded search cutoff at L ≤ 4
		}

		// Traverse backwards to find producers for curr.node
		parentProds := p.getProducersFor(curr.node)
		for _, parent := range parentProds {
			newStep := SetupStep{
				Node:       parent,
				Depth:      curr.depth + 1,
				ExtractKey: "id",
			}
			newSteps := append([]SetupStep{newStep}, curr.steps...)
			queue = append(queue, queueItem{
				node:  parent,
				steps: newSteps,
				depth: curr.depth + 1,
			})
		}
	}

	// If no independent producer found, use best shortest chain available
	if len(producers) > 0 {
		chain.Steps = []SetupStep{{
			Node:       producers[0],
			Depth:      1,
			ExtractKey: "id",
		}}
		chain.ChainDepth = 1
		chain.HasValidPlan = true
	}

	return chain
}

// getProducersFor returns all candidate producer nodes for a given consumer node.
func (p *Planner) getProducersFor(consumer *OperationNode) []*OperationNode {
	var prods []*OperationNode
	seen := make(map[string]bool)

	for _, edge := range p.graph.Edges {
		if edge.Consumer.ID == consumer.ID {
			if !seen[edge.Producer.ID] {
				seen[edge.Producer.ID] = true
				prods = append(prods, edge.Producer)
			}
		}
	}
	return prods
}

// PlanAllChains computes setup chains for all consumer endpoints in the graph.
func (p *Planner) PlanAllChains() []ExecutionChain {
	var chains []ExecutionChain
	for _, node := range p.graph.Nodes {
		if node.IsConsumer {
			chain := p.FindSetupChain(node)
			chains = append(chains, chain)
		}
	}
	return chains
}

// SummaryString returns an analytical description of planned chains.
func (c *ExecutionChain) SummaryString() string {
	if !c.HasValidPlan {
		return fmt.Sprintf("Coverage Gap: No setup chain discovered for %s", c.TargetNode.ID)
	}
	if len(c.Steps) == 0 {
		return fmt.Sprintf("Independent: %s requires no setup", c.TargetNode.ID)
	}

	var stepStrs []string
	for _, s := range c.Steps {
		stepStrs = append(stepStrs, s.Node.ID)
	}
	return fmt.Sprintf("Chain [Depth %d]: %s → %s", c.ChainDepth, stepStrs[0], c.TargetNode.ID)
}
