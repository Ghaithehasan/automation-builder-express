import { Router } from "express";
import { getNodeTypes } from "../controllers/nodeTypes.controller.js";
import { runExecution, runWorkflowExecution } from "../controllers/executions.controller.js";
import { getLatestWorkflow, saveWorkflow } from "../controllers/workflows.controller.js";

const router = Router();

router.get("/node-types", getNodeTypes);
router.post("/executions/run", runExecution);
router.post("/executions/run-workflow", runWorkflowExecution);
router.post("/workflows", saveWorkflow);
router.get("/workflows/latest", getLatestWorkflow);

export default router;
