const createBadRequestError = (message) => {
	const error = new Error(message);
	error.status = 400;
	return error;
};

const parseText = (value) => (typeof value === "string" ? value.trim() : "");

const buildNodeOutput = ({ id, type, data }, options = {}) => {
	const { includeNodeId = false, detailedMessages = false } = options;
	const nodeId = parseText(id);

	if (type !== "log" && type !== "color") {
		throw createBadRequestError("Unsupported node type");
	}

	const message = parseText(data?.message);
	if (!message) {
		if (detailedMessages && nodeId) {
			throw createBadRequestError(`Message is required for node ${nodeId}`);
		}

		throw createBadRequestError("Message is required");
	}

	let color = "default";

	if (type === "color") {
		color = parseText(data?.color);
		if (!color) {
			if (detailedMessages && nodeId) {
				throw createBadRequestError(`Color is required for node ${nodeId}`);
			}

			throw createBadRequestError("Color is required");
		}
	}

	if (includeNodeId) {
		return {
			nodeId,
			type,
			message,
			color
		};
	}

	return {
		type,
		message,
		color
	};
};

const orderNodesByEdges = (nodes, edges) => {
	if (!Array.isArray(edges) || edges.length === 0) {
		return nodes;
	}

	const nodeMap = new Map();
	const adjacencyMap = new Map();
	const indegreeMap = new Map();

	for (const node of nodes) {
		const nodeId = parseText(node?.id);
		if (!nodeId) {
			throw createBadRequestError("Each node must have an id");
		}

		nodeMap.set(nodeId, node);
		adjacencyMap.set(nodeId, []);
		indegreeMap.set(nodeId, 0);
	}

	for (const edge of edges) {
		const source = parseText(edge?.source);
		const target = parseText(edge?.target);

		if (!source || !target) {
			continue;
		}

		if (!nodeMap.has(source) || !nodeMap.has(target)) {
			throw createBadRequestError("Edge references unknown node");
		}

		adjacencyMap.get(source).push(target);
		indegreeMap.set(target, indegreeMap.get(target) + 1);
	}

	const queue = nodes
		.map((node) => parseText(node.id))
		.filter((nodeId) => indegreeMap.get(nodeId) === 0);

	const orderedNodes = [];

	while (queue.length > 0) {
		const currentNodeId = queue.shift();
		orderedNodes.push(nodeMap.get(currentNodeId));

		for (const nextNodeId of adjacencyMap.get(currentNodeId)) {
			indegreeMap.set(nextNodeId, indegreeMap.get(nextNodeId) - 1);

			if (indegreeMap.get(nextNodeId) === 0) {
				queue.push(nextNodeId);
			}
		}
	}

	if (orderedNodes.length !== nodes.length) {
		throw createBadRequestError("Invalid workflow edges");
	}

	return orderedNodes;
};

export const runExecution = (req, res) => {
	try {
		const { type, data } = req.body || {};
		const output = buildNodeOutput({ type, data });

		return res.status(200).json({
			success: true,
			output
		});
	} catch (error) {
		return res.status(error.status || 500).json({
			success: false,
			message: error.status ? error.message : "Failed to run execution"
		});
	}
};

export const runWorkflowExecution = (req, res) => {
	try {
		const { nodes, edges } = req.body || {};

		if (!Array.isArray(nodes) || nodes.length === 0) {
			return res.status(400).json({
				success: false,
				message: "Nodes must be a non-empty array"
			});
		}

		const workflowEdges = Array.isArray(edges) ? edges : [];
		const orderedNodes = orderNodesByEdges(nodes, workflowEdges);

		const outputs = orderedNodes.map((node) =>
			buildNodeOutput(node, {
				includeNodeId: true,
				detailedMessages: true
			})
		);

		return res.status(200).json({
			success: true,
			outputs
		});
	} catch (error) {
		return res.status(error.status || 500).json({
			success: false,
			message: error.status ? error.message : "Failed to run workflow"
		});
	}
};
