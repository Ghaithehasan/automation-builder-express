const nodeTypesListElement = document.getElementById("node-types-list");
const logMessageElement = document.getElementById("log-message");
const runLogNodeButton = document.getElementById("run-log-node");
const executionOutputElement = document.getElementById("execution-output");
const colorMessageElement = document.getElementById("color-message");
const colorSelectElement = document.getElementById("color-select");
const runColorNodeButton = document.getElementById("run-color-node");
const colorExecutionOutputElement = document.getElementById("color-execution-output");
const workflowNameElement = document.getElementById("workflow-name");
const loadLatestWorkflowButton = document.getElementById("load-latest-workflow");
const runWorkflowButton = document.getElementById("run-workflow");
const saveWorkflowButton = document.getElementById("save-workflow");
const workflowOutputElement = document.getElementById("workflow-output");
const saveStatusElement = document.getElementById("save-status");
const workspaceElement = document.getElementById("workspace");
const chatMessagesElement = document.getElementById("chat-messages");
const chatInputElement = document.getElementById("chat-input");
const chatSendButton = document.getElementById("chat-send");
const chatStatusElement = document.getElementById("chat-status");

const workspaceNodes = [];
const availableColors = ["red", "blue", "green", "orange", "purple"];

const buildSessionId = () => {
	if (typeof window !== "undefined" && window.crypto?.randomUUID) {
		return window.crypto.randomUUID();
	}

	return `session-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const getChatSessionId = () => {
	if (!window.localStorage) {
		return buildSessionId();
	}

	const key = "flowforge_chat_session";
	let sessionId = window.localStorage.getItem(key);

	if (!sessionId) {
		sessionId = buildSessionId();
		window.localStorage.setItem(key, sessionId);
	}

	return sessionId;
};

const chatSessionId = getChatSessionId();

const showSidebarMessage = (message, className = "info-text") => {
	nodeTypesListElement.innerHTML = "";

	const messageElement = document.createElement("p");
	messageElement.className = className;
	messageElement.textContent = message;

	nodeTypesListElement.appendChild(messageElement);
};

const renderNodeTypes = (nodeTypes) => {
	if (!Array.isArray(nodeTypes) || nodeTypes.length === 0) {
		showSidebarMessage("No node types available.");
		return;
	}

	nodeTypesListElement.innerHTML = "";

	nodeTypes.forEach((nodeType) => {
		const card = document.createElement("div");
		card.className = "node-card draggable-card";
		card.setAttribute("draggable", "true");
		card.dataset.nodeType = nodeType.type;
		card.dataset.nodeLabel = nodeType.label;
		card.addEventListener("dragstart", handleNodeDragStart);

		const label = document.createElement("h3");
		label.textContent = nodeType.label;

		const type = document.createElement("span");
		type.className = "node-type";
		type.textContent = nodeType.type;

		const description = document.createElement("p");
		description.textContent = nodeType.description;

		card.appendChild(label);
		card.appendChild(type);
		card.appendChild(description);

		nodeTypesListElement.appendChild(card);
	});
};

const getNodeLabel = (type) => {
	if (type === "log") {
		return "Log";
	}

	if (type === "color") {
		return "Color";
	}

	return "Node";
};

const buildNodeId = (type) => `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

const updateWorkspaceNode = (nodeId, updates) => {
	const nodeIndex = workspaceNodes.findIndex((node) => node.id === nodeId);

	if (nodeIndex === -1) {
		return;
	}

	const currentNode = workspaceNodes[nodeIndex];
	workspaceNodes[nodeIndex] = {
		...currentNode,
		data: {
			...currentNode.data,
			...updates
		}
	};
};

const removeWorkspaceNode = (nodeId) => {
	const nodeIndex = workspaceNodes.findIndex((node) => node.id === nodeId);

	if (nodeIndex === -1) {
		return;
	}

	workspaceNodes.splice(nodeIndex, 1);
	renderWorkspace();
};

const addWorkspaceNode = ({ type, label }) => {
	if (!type) {
		return;
	}

	const nodeId = buildNodeId(type);
	const nodeLabel = label || getNodeLabel(type);
	const nodeData = {
		message: ""
	};

	if (type === "color") {
		nodeData.color = "";
	}

	workspaceNodes.push({
		id: nodeId,
		type,
		label: nodeLabel,
		data: nodeData
	});

	renderWorkspace();
};

const renderWorkspace = () => {
	workspaceElement.innerHTML = "";

	if (workspaceNodes.length === 0) {
		const emptyState = document.createElement("p");
		emptyState.className = "workspace-empty";
		emptyState.textContent = "Drag nodes here to build your workflow.";
		workspaceElement.appendChild(emptyState);
		return;
	}

	workspaceNodes.forEach((node) => {
		const nodeContainer = document.createElement("div");
		nodeContainer.className = "workspace-node";
		nodeContainer.dataset.nodeId = node.id;

		const header = document.createElement("div");
		header.className = "workspace-node-header";

		const title = document.createElement("h3");
		title.textContent = node.label;

		const typeBadge = document.createElement("span");
		typeBadge.className = "workspace-node-type";
		typeBadge.textContent = node.type;

		const deleteButton = document.createElement("button");
		deleteButton.type = "button";
		deleteButton.className = "workspace-node-delete";
		deleteButton.textContent = "Delete";
		deleteButton.addEventListener("click", () => removeWorkspaceNode(node.id));

		header.appendChild(title);
		header.appendChild(typeBadge);
		header.appendChild(deleteButton);

		const messageLabel = document.createElement("label");
		messageLabel.className = "node-field-label";
		messageLabel.textContent = "Message";
		const messageInputId = `node-message-${node.id}`;
		messageLabel.htmlFor = messageInputId;

		const messageInput = document.createElement("textarea");
		messageInput.id = messageInputId;
		messageInput.className = "node-input";
		messageInput.placeholder = "Type message";
		messageInput.value = node.data?.message || "";
		messageInput.addEventListener("input", (event) => {
			updateWorkspaceNode(node.id, { message: event.target.value });
		});

		nodeContainer.appendChild(header);
		nodeContainer.appendChild(messageLabel);
		nodeContainer.appendChild(messageInput);

		if (node.type === "color") {
			const colorLabel = document.createElement("label");
			colorLabel.className = "node-field-label";
			colorLabel.textContent = "Color";
			const colorSelectId = `node-color-${node.id}`;
			colorLabel.htmlFor = colorSelectId;

			const colorSelect = document.createElement("select");
			colorSelect.id = colorSelectId;
			colorSelect.className = "node-select";
			const placeholderOption = document.createElement("option");
			placeholderOption.value = "";
			placeholderOption.textContent = "Select a color";
			colorSelect.appendChild(placeholderOption);

			availableColors.forEach((color) => {
				const option = document.createElement("option");
				option.value = color;
				option.textContent = color;
				colorSelect.appendChild(option);
			});

			colorSelect.value = node.data?.color || "";
			colorSelect.addEventListener("change", (event) => {
				updateWorkspaceNode(node.id, { color: event.target.value });
			});

			nodeContainer.appendChild(colorLabel);
			nodeContainer.appendChild(colorSelect);
		}

		workspaceElement.appendChild(nodeContainer);
	});
};

const buildSequentialEdges = (nodes) =>
	nodes.slice(0, -1).map((node, index) => ({
		source: node.id,
		target: nodes[index + 1].id
	}));

const handleNodeDragStart = (event) => {
	const { nodeType, nodeLabel } = event.currentTarget.dataset;

	if (!nodeType) {
		return;
	}

	event.dataTransfer.setData("text/node-type", nodeType);
	event.dataTransfer.setData("text/node-label", nodeLabel || getNodeLabel(nodeType));
	event.dataTransfer.effectAllowed = "copy";
};

const handleWorkspaceDragOver = (event) => {
	event.preventDefault();
	workspaceElement.classList.add("workspace--dragover");
};

const handleWorkspaceDragLeave = () => {
	workspaceElement.classList.remove("workspace--dragover");
};

const handleWorkspaceDrop = (event) => {
	event.preventDefault();
	workspaceElement.classList.remove("workspace--dragover");

	const nodeType = event.dataTransfer.getData("text/node-type");
	const nodeLabel = event.dataTransfer.getData("text/node-label");
	addWorkspaceNode({ type: nodeType, label: nodeLabel });
};

const loadNodeTypes = async () => {
	try {
		const response = await fetch("/api/node-types");

		if (!response.ok) {
			throw new Error(`Failed to fetch node types: ${response.status}`);
		}

		const result = await response.json();

		console.log("Node types response from backend:", result);

		if (!result.success) {
			throw new Error("Backend returned success = false");
		}

		renderNodeTypes(result.data);
	} catch (error) {
		console.error("Error loading node types:", error);
		showSidebarMessage("Failed to load node types.", "error-text");
	}
};

const showExecutionOutput = (message, className) => {
	executionOutputElement.textContent = message;
	executionOutputElement.classList.remove("output-success", "output-error");
	executionOutputElement.classList.add(className);
	executionOutputElement.style.color = "";
};

const showColorExecutionOutput = (message, className, textColor = "") => {
	colorExecutionOutputElement.textContent = message;
	colorExecutionOutputElement.classList.remove("output-success", "output-error");
	colorExecutionOutputElement.classList.add(className);
	colorExecutionOutputElement.style.color = textColor;
};

const showSaveStatus = (message, className) => {
	saveStatusElement.textContent = message;
	saveStatusElement.classList.remove("save-success", "save-error");
	saveStatusElement.classList.add(className);
};

const setChatStatus = (message, tone = "") => {
	if (!chatStatusElement) {
		return;
	}

	chatStatusElement.textContent = message;
	chatStatusElement.classList.remove("success", "error");
	if (tone) {
		chatStatusElement.classList.add(tone);
	}
};

const appendChatMessage = (role, content) => {
	if (!chatMessagesElement) {
		return;
	}

	const placeholder = chatMessagesElement.querySelector(".chat-placeholder");
	if (placeholder) {
		placeholder.remove();
	}

	const messageElement = document.createElement("div");
	messageElement.className = `chat-message ${role}`;
	messageElement.textContent = content;

	chatMessagesElement.appendChild(messageElement);
	chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
};

const buildWorkspacePayload = () => ({
	name: workflowNameElement.value.trim(),
	nodes: workspaceNodes.map((node) => ({
		id: node.id,
		type: node.type,
		label: node.label,
		data: {
			message: node.data?.message || "",
			...(node.type === "color" ? { color: node.data?.color || "" } : {})
		}
	})),
	edges: buildSequentialEdges(workspaceNodes)
});

const applyWorkflowToWorkspace = (workflow) => {
	const safeWorkflow = workflow || {};
	workflowNameElement.value = safeWorkflow?.name || "";

	const nodes = Array.isArray(safeWorkflow?.nodes) ? safeWorkflow.nodes : [];
	const logNode = nodes.find((node) => node?.type === "log");
	const colorNode = nodes.find((node) => node?.type === "color");

	logMessageElement.value = logNode?.data?.message || "";
	colorMessageElement.value = colorNode?.data?.message || "";
	colorSelectElement.value = colorNode?.data?.color || "";

	workspaceNodes.length = 0;
	nodes.forEach((node) => {
		const nodeId = node?.id || buildNodeId(node?.type || "node");
		workspaceNodes.push({
			id: nodeId,
			type: node?.type || "log",
			label: node?.label || getNodeLabel(node?.type || "log"),
			data: {
				message: node?.data?.message || "",
				color: node?.data?.color || ""
			}
		});
	});

	renderWorkspace();
};

const handleToolResults = (toolResults) => {
	if (!Array.isArray(toolResults) || toolResults.length === 0) {
		return;
	}

	toolResults.forEach((result) => {
		const payload = result?.payload;
		const toolName = result?.toolName;

		if (!payload) {
			return;
		}

		if (toolName === "run_workflow") {
			if (Array.isArray(payload.outputs)) {
				showWorkflowOutputs(payload.outputs);
			} else if (payload.success === false && payload.message) {
				showWorkflowError(payload.message);
			}
			return;
		}

		if (toolName === "save_workflow") {
			if (payload.message) {
				showSaveStatus(payload.message, payload.success ? "save-success" : "save-error");
			}
			return;
		}

		if (toolName === "load_latest_workflow") {
			if (payload.workflow) {
				applyWorkflowToWorkspace(payload.workflow);
			}
			if (payload.success === false && payload.message) {
				showSaveStatus(payload.message, "save-error");
			}
			return;
		}

		if (Array.isArray(payload.outputs)) {
			showWorkflowOutputs(payload.outputs);
		}
	});
};

const sendChatMessage = async () => {
	if (!chatInputElement || !chatSendButton) {
		return;
	}

	const message = chatInputElement.value.trim();
	if (!message) {
		setChatStatus("Type a message before sending.", "error");
		return;
	}

	appendChatMessage("user", message);
	chatInputElement.value = "";
	chatSendButton.disabled = true;
	setChatStatus("Agent is thinking...");

	try {
		const response = await fetch("/api/agent/chat", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				sessionId: chatSessionId,
				message,
				workspace: buildWorkspacePayload()
			})
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			throw new Error(result.message || "Agent request failed");
		}

		handleToolResults(result.toolResults);

		const replyText = (result.reply || "").trim();
		appendChatMessage("assistant", replyText || "No reply returned.");
		setChatStatus("Reply received.", "success");
	} catch (error) {
		setChatStatus(error.message, "error");
	} finally {
		chatSendButton.disabled = false;
	}
};

const showWorkflowOutputs = (outputs) => {
	workflowOutputElement.innerHTML = "";
	workflowOutputElement.classList.remove("output-success", "output-error");
	workflowOutputElement.classList.add("output-success");

	if (!Array.isArray(outputs) || outputs.length === 0) {
		const emptyLine = document.createElement("p");
		emptyLine.textContent = "No workflow outputs returned.";
		workflowOutputElement.appendChild(emptyLine);
		return;
	}

	outputs.forEach((output) => {
		const outputLine = document.createElement("p");
		outputLine.textContent = `[${output.nodeId}] ${output.message}`;

		if (output.color && output.color !== "default") {
			outputLine.style.color = output.color;
		}

		workflowOutputElement.appendChild(outputLine);
	});
};

const showWorkflowError = (message) => {
	workflowOutputElement.innerHTML = "";
	workflowOutputElement.classList.remove("output-success", "output-error");
	workflowOutputElement.classList.add("output-error");

	const errorLine = document.createElement("p");
	errorLine.textContent = message;
	workflowOutputElement.appendChild(errorLine);
};

const runLogNode = async () => {
	try {
		const message = logMessageElement.value;

		const response = await fetch("/api/executions/run", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				type: "log",
				data: {
					message
				}
			})
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			throw new Error(result.message || "Execution failed");
		}

		showExecutionOutput(result.output.message, "output-success");
	} catch (error) {
		showExecutionOutput(error.message, "output-error");
	}
};

const runColorNode = async () => {
	try {
		const message = colorMessageElement.value;
		const color = colorSelectElement.value;

		const response = await fetch("/api/executions/run", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				type: "color",
				data: {
					message,
					color
				}
			})
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			throw new Error(result.message || "Execution failed");
		}

		showColorExecutionOutput(result.output.message, "output-success", result.output.color);
	} catch (error) {
		showColorExecutionOutput(error.message, "output-error");
	}
};

const runWorkflow = async () => {
	try {
		if (workspaceNodes.length === 0) {
			showWorkflowError("Workspace is empty. Add nodes before running.");
			return;
		}

		const workflowPayload = {
			nodes: workspaceNodes.map((node) => ({
				id: node.id,
				type: node.type,
				data: {
					message: node.data?.message || "",
					...(node.type === "color" ? { color: node.data?.color || "" } : {})
				}
			})),
			edges: buildSequentialEdges(workspaceNodes)
		};

		const response = await fetch("/api/executions/run-workflow", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(workflowPayload)
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			throw new Error(result.message || "Failed to run workflow");
		}

		showWorkflowOutputs(result.outputs);
	} catch (error) {
		showWorkflowError(error.message);
	}
};

const saveWorkflow = async () => {
	try {
		const workflowName = workflowNameElement.value.trim();

		if (workspaceNodes.length === 0) {
			showSaveStatus("Workspace is empty. Add nodes before saving.", "save-error");
			return;
		}

		const workflowPayload = {
			name: workflowName,
			nodes: workspaceNodes.map((node) => ({
				id: node.id,
				type: node.type,
				data: {
					message: node.data?.message || "",
					...(node.type === "color" ? { color: node.data?.color || "" } : {})
				}
			})),
			edges: buildSequentialEdges(workspaceNodes)
		};

		const response = await fetch("/api/workflows", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(workflowPayload)
		});

		const result = await response.json();

		if (!response.ok || !result.success) {
			throw new Error(result.message || "Failed to save workflow");
		}

		showSaveStatus(result.message, "save-success");
	} catch (error) {
		showSaveStatus(error.message, "save-error");
	}
};

const loadLatestWorkflow = async () => {
	try {
		showSaveStatus("Loading latest workflow...", "save-success");

		const response = await fetch("/api/workflows/latest");
		// console.log("Load latest workflow response:", response);
		const result = await response.json();
		// console.log("Load latest workflow result:", result);

		if (!response.ok || !result.success) {
			throw new Error(result.message || "Failed to load latest workflow");
		}

		const workflow = result.workflow;
		applyWorkflowToWorkspace(workflow);

		showSaveStatus("Latest workflow loaded successfully.", "save-success");
	} catch (error) {
		showSaveStatus(error.message, "save-error");
	}
};

const handleChatKeydown = (event) => {
	if (event.key === "Enter" && !event.shiftKey) {
		event.preventDefault();
		sendChatMessage();
	}
};

runLogNodeButton.addEventListener("click", runLogNode);
runColorNodeButton.addEventListener("click", runColorNode);
loadLatestWorkflowButton.addEventListener("click", loadLatestWorkflow);
runWorkflowButton.addEventListener("click", runWorkflow);
saveWorkflowButton.addEventListener("click", saveWorkflow);

if (chatSendButton) {
	chatSendButton.addEventListener("click", sendChatMessage);
}

if (chatInputElement) {
	chatInputElement.addEventListener("keydown", handleChatKeydown);
}

loadNodeTypes();
renderWorkspace();

workspaceElement.addEventListener("dragover", handleWorkspaceDragOver);
workspaceElement.addEventListener("dragleave", handleWorkspaceDragLeave);
workspaceElement.addEventListener("drop", handleWorkspaceDrop);

console.log("Frontend app loaded.");