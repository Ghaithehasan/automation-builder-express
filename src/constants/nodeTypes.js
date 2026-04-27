export const nodeTypes = [
  {
    type: "log",
    label: "Log",
    description: "Print a message to the output panel",
    fields: ["message"]
  },
  {
    type: "color",
    label: "Color",
    description: "Print a message with a selected color",
    fields: ["message", "color"]
  }
];