import { nodeTypes } from "../constants/nodeTypes.js";

export const getNodeTypes = (req, res) => {
  res.status(200).json({
    success: true,
    data: nodeTypes
  });
};