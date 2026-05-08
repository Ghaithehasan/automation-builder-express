import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workflowsFilePath = path.join(__dirname, "..", "data", "workflows.json");

const readWorkflows = async () => {
	try {
		const fileContent = await readFile(workflowsFilePath, "utf-8");
		const parsedData = JSON.parse(fileContent || "[]");

		return Array.isArray(parsedData) ? parsedData : [];
	} catch (error) {
		if (error.code === "ENOENT") {
			return [];
		}

		throw error;
	}
};

const writeWorkflows = async (workflows) => {
	await writeFile(workflowsFilePath, JSON.stringify(workflows, null, 2), "utf-8");
};

export const saveWorkflow = async (req, res) => {
	try {


		const { name, nodes, edges } = req.body || {};

		// return res.status(201).json({
		// 	success: true,
		// 	message: "Workflow saved successfully",
		// 	data : name
		// });
		
		const workflowName = typeof name === "string" ? name.trim() : "";

		if (!workflowName) {
			return res.status(400).json({
				success: false,
				message: "Workflow name is required"
			});
		}

		if (!Array.isArray(nodes)) {
			return res.status(400).json({
				success: false,
				message: "Nodes must be an array"
			});
		}

		const workflows = await readWorkflows();
		const savedWorkflow = {
			id: Date.now(),
			name: workflowName,
			nodes,
			edges: Array.isArray(edges) ? edges : [],
			createdAt: new Date().toISOString()
		};

		workflows.push(savedWorkflow);
		await writeWorkflows(workflows);

		return res.status(201).json({
			success: true,
			message: "Workflow saved successfully",
			workflow: savedWorkflow
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to save workflow"
		});
	}
};

export const getLatestWorkflow = async (req, res) => {
	try {
		const workflows = await readWorkflows();

		if (!Array.isArray(workflows) || workflows.length === 0) {
			return res.status(404).json({
				success: false,
				message: "No workflows found"
			});
		}

		const latestWorkflow = workflows[workflows.length - 1];
		return res.status(200).json({
			success: true,
			workflow: latestWorkflow
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			message: "Failed to load workflows"
		});
	}
};
