import { CompanionActionDefinition } from "@companion-module/base";
import { DMXCModuleInstance } from "./main";

export enum ActionId {
    Default = "sample_action"
}

export class ActionFactory {
    private actions: Map<ActionId, CompanionActionDefinition | undefined>;

    constructor(private instance: DMXCModuleInstance) {
        this.actions = new Map<ActionId, CompanionActionDefinition>();    
        this.addDefaultActions();
    }

    private addDefaultActions(): void {
        const actions: { [id in ActionId]: CompanionActionDefinition | undefined } =
        {
            [ActionId.Default]: {
                name: "My First Action",
                options: [
                    {
                        id: "num",
                        type: "number",
                        label: "Test",
                        default: 5,
                        min: 0,
                        max: 100
                    }
                ],
                callback: async (event) => {
                    console.log("Hello world!", event.options.num);
                    return Promise.resolve();
                }
            }
        };
        Object.values(ActionId).forEach((id) => {
            this.actions.set(id, actions[id]);
        });
    }

    public updateActions(): void {
        this.instance.setActionDefinitions(Object.fromEntries(this.actions));
    }
}
