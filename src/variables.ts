import { ModuleInstance } from "./main";

export function UpdateVariables(self: ModuleInstance): void {
  self.setVariableDefinitions([
    { variableId: "variable1", name: "My first variable" },
    { variableId: "variable2", name: "My second variable" },
    { variableId: "variable3", name: "Another variable" }
  ]);
}
