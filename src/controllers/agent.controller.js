import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { runWorkflowExecution } from "./executions.controller.js";
import { getLatestWorkflow, saveWorkflow } from "./workflows.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const chatFilePath = path.join(__dirname, "..", "data", "chat.json");

const MAX_HISTORY = 20;
const MAX_TOOL_ITERATIONS = 3;
const NVIDIA_API_URL = process.env.NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions";

// ─────────────────────────────────────────
// Chat History
// ─────────────────────────────────────────

const readChatHistory = async () => {
	try {
		const raw = await readFile(chatFilePath, "utf-8");
		const parsed = JSON.parse(raw || "[]");
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		if (error.code === "ENOENT") return [];
		throw error;
	}
};

const writeChatHistory = async (history) => {
	await writeFile(chatFilePath, JSON.stringify(history, null, 2), "utf-8");
};

const appendChatHistory = async (sessionId, messages) => {
	const history = await readChatHistory();
	const timestamp = new Date().toISOString();
	for (const msg of messages) {
		history.push({ sessionId, role: msg.role, content: msg.content, createdAt: timestamp });
	}
	await writeChatHistory(history);
};

const getSessionHistory = (history, sessionId) =>
	history
		.filter((e) => e.sessionId === sessionId)
		.slice(-MAX_HISTORY)
		.map((e) => ({ role: e.role, content: e.content }));

// ─────────────────────────────────────────
// Mock Controller Invoker
// ─────────────────────────────────────────

const invokeController = async (controller, body = {}) => {
	let statusCode = 200;
	let payload = null;

	const req = { body };
	const res = {
		status(code) { statusCode = code; return this; },
		json(data)   { payload = data; return this; }
	};

	await controller(req, res);
	return { statusCode, payload: payload ?? { success: false, message: "No response from controller" } };
};

// ─────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────

const TOOLS = [
	{
		type: "function",
		function: {
			name: "run_workflow",
			description: "Executes the current workspace nodes in order and returns their outputs. Always use this when the user asks to run or execute the workflow.",
			parameters: {
				type: "object",
				properties: {
					nodes: { type: "array", description: "Workflow nodes to execute" },
					edges: { type: "array", description: "Edges connecting the nodes" }
				},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "save_workflow",
			description: "Saves the current workspace to storage. Always use this when the user asks to save the workflow.",
			parameters: {
				type: "object",
				properties: {
					name:  { type: "string", description: "Workflow name" },
					nodes: { type: "array",  description: "Workflow nodes" },
					edges: { type: "array",  description: "Workflow edges" }
				},
				required: []
			}
		}
	},
	{
		type: "function",
		function: {
			name: "load_latest_workflow",
			description: "Loads the most recently saved workflow from storage. Use this when the user asks to load or restore a workflow.",
			parameters: { type: "object", properties: {} }
		}
	}
];

// ─────────────────────────────────────────
// Tool Executor
// ─────────────────────────────────────────

const resolveWorkspaceArgs = (args, ctx) => ({
	nodes: Array.isArray(args.nodes) && args.nodes.length ? args.nodes : ctx.nodes,
	edges: Array.isArray(args.edges) && args.edges.length ? args.edges : ctx.edges,
	name:  typeof args.name === "string" && args.name.trim() ? args.name.trim() : (ctx.name || "Untitled Workflow")
});

const executeTool = async (toolName, rawArgs, workspaceCtx) => {
	const { nodes, edges, name } = resolveWorkspaceArgs(rawArgs, workspaceCtx);

	const requiresNodes = ["run_workflow", "save_workflow"].includes(toolName);
	if (requiresNodes && (!Array.isArray(nodes) || nodes.length === 0)) {
		return {
			statusCode: 400,
			payload: { success: false, message: "Workspace is empty. Add nodes before running this action." }
		};
	}

	switch (toolName) {
		case "run_workflow":
			return invokeController(runWorkflowExecution, { nodes, edges });

		case "save_workflow":
			return invokeController(saveWorkflow, { name, nodes, edges });

		case "load_latest_workflow":
			return invokeController(getLatestWorkflow);

		default:
			return { statusCode: 400, payload: { success: false, message: `Unknown tool: "${toolName}"` } };
	}
};

// ─────────────────────────────────────────
// NVIDIA API
// ─────────────────────────────────────────

const callNvidiaChat = async (payload, retries = 2) => {
	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			const res = await fetch(NVIDIA_API_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const text = await res.text();
				throw new Error(`NVIDIA API error ${res.status}: ${text}`);
			}

			return res.json();
		} catch (error) {
			const isLast = attempt === retries;
			if (isLast) throw error;
			await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
		}
	}
};

// ─────────────────────────────────────────
// System Prompt
// ─────────────────────────────────────────

const buildSystemPrompt = (workspaceCtx) => `
You are FlowForge Agent — an assistant embedded in an automation workflow builder.

AVAILABLE TOOLS (use ONLY these):
- run_workflow    → when the user asks to run, execute, or test the workflow
- save_workflow   → when the user asks to save or persist the workflow
- load_latest_workflow → when the user asks to load, restore, or fetch a saved workflow

CURRENT WORKSPACE:
${JSON.stringify(workspaceCtx, null, 2)}

RULES:
1. If the user's intent matches a tool, call the tool immediately. Do NOT explain what you are about to do.
2. Do NOT invent data. The workspace above is the source of truth.
3. If the user's request is unclear or unrelated to the tools, reply conversationally without calling any tool.
4. After a tool result is returned, summarize what happened clearly in 1-2 sentences.
5. Never fabricate tool results.
`.trim();

// ─────────────────────────────────────────
// Agent Loop
// ─────────────────────────────────────────

const runAgentLoop = async (messages, workspaceCtx) => {
	const toolResults = [];

	for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
		const isFirstCall = i === 0;

		const response = await callNvidiaChat({
			model: process.env.NVIDIA_MODEL,
			messages,
			...(isFirstCall ? { tools: TOOLS, tool_choice: "auto" } : {}),
			temperature: 0.2,
			max_tokens: 512
		});

		const assistantMsg = response.choices?.[0]?.message;
		if (!assistantMsg) throw new Error("Empty response from AI model");

		messages.push(assistantMsg);

		// No tool calls → we have the final text response
		if (!assistantMsg.tool_calls?.length) {
			return { finalContent: assistantMsg.content?.trim() || "", toolResults, messages };
		}

		// Execute each tool call
		for (const toolCall of assistantMsg.tool_calls) {
			const toolName = toolCall.function?.name;
			let args = {};

			try {
				args = JSON.parse(toolCall.function?.arguments || "{}");
			} catch {
				args = {};
			}

			const result = await executeTool(toolName, args, workspaceCtx);
			toolResults.push({ toolName, statusCode: result.statusCode, payload: result.payload });

			messages.push({
				role: "tool",
				tool_call_id: toolCall.id,
				content: JSON.stringify(result.payload ?? {})
			});
		}
		// Loop again → AI reads tool results and produces final reply
	}

	return { finalContent: "", toolResults, messages };
};

// ─────────────────────────────────────────
// Main Controller
// ─────────────────────────────────────────

export const chatWithAgent = async (req, res) => {
	try {
		const { message, workspace, sessionId } = req.body ?? {};
		const trimmedMessage = typeof message === "string" ? message.trim() : "";

		if (!trimmedMessage) {
			return res.status(400).json({ success: false, message: "Message is required." });
		}

		if (!process.env.NVIDIA_API_KEY || !process.env.NVIDIA_MODEL) {
			return res.status(500).json({ success: false, message: "AI model is not configured on the server." });
		}

		const session = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : "default";

		const workspaceCtx = {
			name:  typeof workspace?.name === "string" ? workspace.name : "",
			nodes: Array.isArray(workspace?.nodes) ? workspace.nodes : [],
			edges: Array.isArray(workspace?.edges) ? workspace.edges : []
		};

		const history = await readChatHistory();

		const messages = [
			{ role: "system", content: buildSystemPrompt(workspaceCtx) },
			...getSessionHistory(history, session),
			{ role: "user", content: trimmedMessage }
		];

		const { finalContent, toolResults } = await runAgentLoop(messages, workspaceCtx);

		await appendChatHistory(session, [
			{ role: "user",      content: trimmedMessage },
			{ role: "assistant", content: finalContent   }
		]);

		return res.status(200).json({
			success: true,
			reply: finalContent || "Done.",
			toolResults
		});
	} catch (error) {
		console.error("[AgentController]", error.message);
		return res.status(500).json({ success: false, message: "Agent failed to process the request." });
	}
};