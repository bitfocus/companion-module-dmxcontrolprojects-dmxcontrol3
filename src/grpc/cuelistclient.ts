import * as GRPC from "@grpc/grpc-js";
import { CompanionActionDefinition, CompanionActionDefinitions, CompanionActionEvent, CompanionFeedbackDefinition, CompanionFeedbackDefinitions, CompanionFeedbackInfo, CompanionOptionValues, CompanionPresetDefinitions, CompanionVariableDefinition, CompanionVariableValue } from "@companion-module/base";
import { IDMXCClient } from "./idmxcclient";
import { CuelistClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";
import { DMXCModuleInstance } from "../main";
import { RepositoryBase } from "../dmxcstate/repositorybase";
import { CuelistActionRequest, CuelistActionRequest_EAction, CuelistChangedMessage, CuelistDescriptor, CuelistProgressStateChangeMessage, CuelistProgressStateChangeRequest, ESceneListState, GetCuelistsResponse, SetCuelistValueRequest } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Cuelist";
import { ConfirmedResponse, EChangeType, GetMultipleRequest, GetRequest } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import { CompanionCommonCallbackContext } from "@companion-module/base/dist/module-api/common";
import { CueProgressStateMessage } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Cue";

// Time between requesting full cuelist updates
// See CuelistClient.pollInterval
const CUELIST_POLL_INTERVAL = 60000;

type VariableWithValue = CompanionVariableDefinition & { value: CompanionVariableValue };

enum CuelistActions {
    SetIntensity = "cuelist_set_intensity",
    CuelistAction = "cuelist_action"
}

enum CuelistFeedbacks {
    CuelistState = "cuelist_state",
    IsCurrentCue = "cuelist_is_current_cue",
    CueProgress = "cuelist_cue_progress",
}

enum ESceneListPlayMode {
    Once = 0,
    Loop = 1,
    Random = 2,
    Bounce = 3,
}

enum ESceneState {
    None = 0x0,
    Preparing = 0x1,
    Prepared = 0x2,
    Waiting = 0x4,
    Fading = 0x8,
    Playing = 0x10,
    Played = 0x20,
    Stopping = 0x40,
    Stopped = 0x80,
}

export class CuelistClient implements IDMXCClient {
    grpcclient: CuelistClientClient;
    repo: RepositoryBase<CuelistDescriptor>;
    // Map of cuelist id to feedback id that listens to that cuelist
    private progressFeedbacks: Map<string, Set<string>>;
    private cueProgressPerCuelist: Map<string, Map<number, CueProgressStateMessage>>;

    private changeStream: GRPC.ClientReadableStream<CuelistChangedMessage> | null = null;
    private progressStream: GRPC.ClientDuplexStream<CuelistProgressStateChangeRequest, CuelistProgressStateChangeMessage> | null = null;
    // Interval for polling all cuelists to receive changes not sent via changeStream (e.g. cue renames)
    // As those changes aren't (as) time critical it is less load to poll it once in a while than to maintain and update streams for all cues etc.
    private pollInterval: ReturnType<typeof setInterval> | null = null;

    private updatePresets = () => { };
    private updateActions = () => { };
    private updateFeedbacks = () => { };
    private updateVariables = () => { };

    constructor(
        endpoint: string,
        private metadata: GRPC.Metadata,
        private instance: DMXCModuleInstance
    ) {
        this.repo = new RepositoryBase<CuelistDescriptor>();
        this.progressFeedbacks = new Map();
        this.cueProgressPerCuelist = new Map();
        this.grpcclient = new CuelistClientClient(
            endpoint,
            GRPC.credentials.createInsecure()
        );
    }

    private onCuelistAddedRemoved(onlyCueChanges: boolean = false) {
        if (!onlyCueChanges) {
            this.instance.subscribeFeedbacks(CuelistFeedbacks.CueProgress);
            this.updateActions();
            this.updatePresets();
            this.updateFeedbacks();
            this.updateVariables();
        }
        this.setVariables(this.repo.getIds().flatMap(id => this.generateVariablesCuelistProperties(id)));
        this.setVariables([...this.progressFeedbacks.entries()]
            .filter(([_, feedbacks]) => feedbacks.size > 0)
            .flatMap(([cuelistId, _]) => this.generateVariablesCueProgress(cuelistId))
        );
        this.instance.checkFeedbacks(
            CuelistFeedbacks.CuelistState,
            CuelistFeedbacks.IsCurrentCue,
            CuelistFeedbacks.CueProgress,
        );
    }

    private onReceiveCuelistChanged(list: CuelistDescriptor) {
        const oldList = this.repo.getSingle(list.id);
        const feedbacksForList = this.progressFeedbacks.get(list.id);
        let nameWasChanged = false;

        if (oldList && oldList?.name != list.name) {
            this.instance.unsubscribeFeedbacks(CuelistFeedbacks.CueProgress);
            nameWasChanged = true;
        }

        if (!list.containsCues) {
            const { cues, containsCues, ...listWithoutCues } = list;
            this.repo.update({ ...listWithoutCues, containsCues: true });
        } else {
            this.repo.update(list);

            if (!nameWasChanged && feedbacksForList && feedbacksForList.size > 0) {
                this.updateVariables();
                this.setVariables(this.generateVariablesCueProgress(list.id));
            }
        }

        if (nameWasChanged) {
            this.onCuelistAddedRemoved();
        } else {
            this.setVariables(this.generateVariablesCuelistProperties(list.id));
            this.instance.checkFeedbacks(
                CuelistFeedbacks.CuelistState,
                CuelistFeedbacks.IsCurrentCue,
            );
        }
    }

    private onReceiveProgressChange(progress: CuelistProgressStateChangeMessage) {
        const list = this.repo.getSingle(progress.cuelistId);
        if (list) {
            list.state = progress.cuelistState;
            this.setVariables(this.generateVariablesCuelistProperties(progress.cuelistId))
            this.instance.checkFeedbacks(CuelistFeedbacks.CuelistState);
        }
        const cuesOfList = this.cueProgressPerCuelist.get(progress.cuelistId) ?? new Map<number, CueProgressStateMessage>();
        if (!this.cueProgressPerCuelist.has(progress.cuelistId)) {
            this.cueProgressPerCuelist.set(progress.cuelistId, cuesOfList);
        }
        for (const i in progress.cueProgressState) {
            if (Object.prototype.hasOwnProperty.call(progress.cueProgressState, i)) {
                const cueProgress = progress.cueProgressState[i];
                cuesOfList.set(cueProgress.cueIndex, cueProgress);
            }
        }
        this.setVariables(this.generateVariablesCueProgress(progress.cuelistId));
        const subscribers = this.progressFeedbacks.get(progress.cuelistId);
        if (subscribers) {
            //todo: restrict checkFeedback to those actually referencing one of the updated cues
            this.instance.checkFeedbacksById(...subscribers.values())
        }
    }

    private async getAllCuelists(onlyCueChanges?: boolean) {
        const cuelistRes = await new Promise<GetCuelistsResponse>((resolve, reject) => this.grpcclient.getCuelists(GetMultipleRequest.create({
            requestId: this.instance.getRequestId()
        }),
            this.metadata,
            (err, res) => err != null ? reject(err) : resolve(res)
        ));
        for (const cuelist of cuelistRes.cuelists) {
            this.repo.update(cuelist);
        }

        this.onCuelistAddedRemoved(onlyCueChanges);
    }

    async startClient(updatePresets: () => void, updateActions: () => void, updateFeedbacks: () => void, updateVariables: () => void) {
        this.updatePresets = updatePresets;
        this.updateActions = updateActions;
        this.updateFeedbacks = updateFeedbacks;
        this.updateVariables = updateVariables;
        try {
            this.changeStream = this.grpcclient.receiveCuelistChanges(
                GetRequest.create({ requestId: this.instance.getRequestId() }),
                this.metadata
            );
            this.changeStream.on("data", (response: CuelistChangedMessage) => {
                switch (response.changeType) {
                    case EChangeType.Added:
                        if (response.cuelistData) {
                            this.repo.add(response.cuelistData);
                            this.onCuelistAddedRemoved();
                        }
                        break;
                    case EChangeType.Changed:
                        if (response.cuelistData) {
                            this.onReceiveCuelistChanged(response.cuelistData);
                        }
                        break;
                    case EChangeType.Removed:
                        let removedId = response.cuelistId || response.cuelistData?.id;
                        if (removedId) {
                            this.repo.remove(removedId);
                            this.cueProgressPerCuelist.delete(removedId);
                            this.onCuelistAddedRemoved();
                        }
                        break;
                }
            });
            this.changeStream.on("error", (error) => {
                this.instance.log("error", "In cuelist changes stream: " + error.name);
            });
            this.changeStream.on("close", () => {
                this.instance.log("warn", "Cuelist changed stream was closed");
                //todo: reopen
            });

            this.progressStream = this.grpcclient.receiveCuelistProgressChanges(this.metadata);
            this.progressStream.on("data", (progress: CuelistProgressStateChangeMessage) => {
                this.onReceiveProgressChange(progress);
            });
            this.progressStream.on("close", () => {
                this.instance.log("warn", "Cuelist progress stream was closed");
                //todo: reopen
            });

            if (this.pollInterval == null) {
                this.pollInterval = setInterval(this.getAllCuelists.bind(this, true), CUELIST_POLL_INTERVAL);
            }
            await this.getAllCuelists();
        } catch (err) {
            this.instance.log("error", "While getting cuelists: " + (err as GRPC.ServiceError)?.message);
        }
    }

    generateActions(): CompanionActionDefinitions {
        this.instance.log("debug", "Reloading cuelist actions");

        const actions: Record<CuelistActions, CompanionActionDefinition> = {
            [CuelistActions.SetIntensity]: {
                name: "Cuelist: Set intensity",
                description: "Set the intensity slider value of a cuelist (Same effect as if executor with fader set to intensity)",
                options: [
                    this.repo.generateIdOpion("Cuelist ID or name"),
                    {
                        id: "intensity",
                        type: "number",
                        label: "Intensity (%)",
                        min: 0,
                        max: 100,
                        default: 100,
                    }
                ],
                callback: this.onActionSetIntensity.bind(this)
            },
            [CuelistActions.CuelistAction]: {
                name: "Cuelist: Run Action",
                description: "Run an action (e.g. GO, STOP, ...) on a cuelist",
                options: [
                    this.repo.generateIdOpion("Cuelist ID or name"),
                    {
                        id: "actionType",
                        label: "Action Type",
                        type: "dropdown",
                        choices: [
                            { id: "PLAY", label: "Play" },
                            { id: "PAUSE", label: "Pause" },
                            { id: "STOP", label: "Stop" },
                            { id: "GO_BACK", label: "Go Back" },
                            //{id: "GO_TO", label: "Go To"},
                            { id: "GO_NEXT", label: "Go Next" },
                            { id: "GO", label: "Go" },
                            { id: "LOAD", label: "Load" },
                            { id: "REASSIGN_SCENE_NUMBERS", label: "Reassign scene numbers" },
                        ] as { id: keyof typeof CuelistActionRequest_EAction, label: string }[],
                        default: "GO",
                    }
                ],
                callback: this.onActionCuelistAction.bind(this)
            }
        };
        return actions;
    }

    generateFeedbacks(): CompanionFeedbackDefinitions {
        const feedbacks: Record<CuelistFeedbacks, CompanionFeedbackDefinition> = {
            [CuelistFeedbacks.CuelistState]: {
                type: "boolean",
                name: "Cuelist: Check state",
                options: [
                    this.repo.generateIdOpion("Cuelist ID or name"),
                    {
                        id: "state",
                        label: "Cuelist state",
                        type: "dropdown",
                        choices: [
                            { id: "STOPPED", label: "Stopped" },
                            { id: "PAUSED", label: "Paused" },
                            { id: "RUNNING", label: "Running" },
                        ] as { id: keyof typeof ESceneListState, label: string }[],
                        default: "RUNNING",
                    },
                ],
                defaultStyle: {
                    bgcolor: 0x00ff00
                },
                callback: this.onFeedbackCuelistState.bind(this),
            },
            [CuelistFeedbacks.IsCurrentCue]: {
                type: "boolean",
                name: "Cuelist: Previous/Current/Next cue",
                options: [
                    this.repo.generateIdOpion("Cuelist ID or name"),
                    {
                        id: "cue_index",
                        label: "Cue index (0 based)",
                        tooltip: "Index of cue (0 based position of cue in cuelist), NOT cue number",
                        type: "number",
                        min: 0,
                        max: 4294967295,
                        default: 0,
                    },
                    {
                        id: "cue_state",
                        label: "Cue is ...",
                        type: "dropdown",
                        choices: [
                            { id: "previous", label: "...previous" },
                            { id: "current", label: "...current" },
                            { id: "next", label: "...next" },
                        ],
                        default: "current"
                    }
                ],
                defaultStyle: {
                    bgcolor: 0xff0000
                },
                callback: this.onFeedbackCurrentCue.bind(this)
            },
            [CuelistFeedbacks.CueProgress]: {
                type: "boolean",
                name: "Cuelist: Cue progress reached",
                description: "Check if a cue has reached a certain point in its progress. Adding this feedback will subscribe to the progress of the selected cuelist and add variables for its progress",
                options: [
                    this.repo.generateIdOpion("Cuelist ID or name"),
                    {
                        id: "cue_index",
                        label: "Cue index (0 based)",
                        tooltip: "Index of cue (0 based position of cue in cuelist), NOT cue number",
                        type: "number",
                        min: 0,
                        max: 4294967295,
                        default: 0,
                    },
                    {
                        id: "cue_progress_state",
                        label: "Cue state",
                        tooltip: "Feedback is triggered, when this cue state is reaced with the specified value below",
                        type: "dropdown",
                        choices: [
                            { id: ESceneState.None, label: "[ANY]" },
                            { id: ESceneState.Preparing, label: "Preparing" },
                            { id: ESceneState.Prepared, label: "Prepared" },
                            { id: ESceneState.Waiting, label: "Waiting" },
                            { id: ESceneState.Fading, label: "Fading" },
                            { id: ESceneState.Playing, label: "Playing" },
                            { id: ESceneState.Played, label: "Played" },
                            { id: ESceneState.Stopping, label: "Stopping" },
                            { id: ESceneState.Stopped, label: "Stopped" },
                        ],
                        default: ESceneState.Playing
                    },
                    {
                        id: "cue_progress",
                        label: "Cue progress",
                        tooltip: "Feedback is triggered, when the cue progress (progres bar shown in progress column in GUI) compares to this value (0 to 1) with the specified operator in the state above. -1 for ANY progress.",
                        type: "number",
                        min: -1,
                        max: 4294967295,
                        default: -1,
                    },
                    {
                        id: "cue_progress_compare",
                        label: "If progress is ...",
                        tooltip: "The cue progress value must be ... in comparison to the specified value",
                        type: "dropdown",
                        choices: [
                            { id: 0, label: "equal to" },
                            { id: 1, label: "greater than" },
                            { id: -1, label: "less than" },
                        ],
                        default: 0
                    },
                ],
                defaultStyle: {
                    bgcolor: 0x0000ff
                },
                callback: this.onFeedbackCueProgress.bind(this),
                subscribe: this.onFeedbackCueProgressSubscribe.bind(this),
                unsubscribe: this.onFeedbackCueProgressUnsubscribe.bind(this),
            }
        };
        return feedbacks;
    }
    generatePresets(): CompanionPresetDefinitions {
        return {}
    }

    private setVariables(variables: VariableWithValue[]) {
        this.instance.setVariableValues(Object.fromEntries(variables.map(v => [v.variableId, v.value])));
    }

    private generateVariablesCuelistProperties(cuelistId: string): VariableWithValue[] {
        const list = this.repo.getSingle(cuelistId);
        if (!list) {
            return [];
        }
        const currCue = list.cues[list.index];
        const nextCue = list.cues[list.nextIndex];
        const playMode = Object.entries(ESceneListPlayMode).find(([_, modeInt]) => modeInt == list.playMode);
        return [
            { variableId: `cuelist_${list.id}_name`, name: `Cuelist ${list.name} name`, value: list.name },
            { variableId: `cuelist_${list.id}_currentCue`, name: `Cuelist ${list.name} current cue number`, value: currCue?.cueNumber?.number.join(".") ?? "" },
            { variableId: `cuelist_${list.id}_nextCue`, name: `Cuelist ${list.name} next cue number`, value: nextCue?.cueNumber?.number.join(".") ?? "" },
            { variableId: `cuelist_${list.id}_intensity`, name: `Cuelist ${list.name} intensity`, value: list.intensity },
            { variableId: `cuelist_${list.id}_fadeFactor`, name: `Cuelist ${list.name} fade factor`, value: list.fadeFactor },
            { variableId: `cuelist_${list.id}_speedFactor`, name: `Cuelist ${list.name} speed factor`, value: list.speedFactor },
            { variableId: `cuelist_${list.id}_playMode`, name: `Cuelist ${list.name} play mode`, value: playMode ? playMode[0] : "" },
            ...list.cues.flatMap(cue => {
                return [
                    { variableId: `cuelist_${list.id}_cue_${cue.cueIndex}_number`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} number`, value: cue.cueNumber?.number.join(".") ?? "" },
                    { variableId: `cuelist_${list.id}_cue_${cue.cueIndex}_name`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} name`, value: cue.name ?? "" },
                ];
            })
        ];
    }

    private generateVariablesCueProgress(cuelistId: string): VariableWithValue[] {
        const list = this.repo.getSingle(cuelistId);
        if (!list) {
            return [];
        }
        const cuesOfList = this.cueProgressPerCuelist.get(cuelistId);
        return list.cues.flatMap((cue, i) => {
            const cueProgress = cuesOfList?.get(i);
            const statesStr = cueProgress
                ? Object.entries(ESceneState)
                    .filter(([_, stateNum]) => typeof stateNum === "number" && (cueProgress.cueState & stateNum) != 0)
                    .map(([stateStr, _]) => stateStr).join("|")
                : ""
            return [
                { variableId: `cuelist_${list.id}_cue_${i}_state`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} state (numeric flag)`, value: cueProgress?.cueState ?? ESceneState.None },
                { variableId: `cuelist_${list.id}_cue_${i}_stateStr`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} state (string)`, value: statesStr },
                { variableId: `cuelist_${list.id}_cue_${i}_progress`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} progress`, value: cueProgress?.progress ?? -1 },
                { variableId: `cuelist_${list.id}_cue_${i}_msToWait`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} time in ms until cue is triggered`, value: cueProgress?.msToWait ?? -1 },
                { variableId: `cuelist_${list.id}_cue_${i}_fadeTimeLeft`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} time left in fade (only on incoming) in ms`, value: cueProgress?.fadeTimeLeft ?? -1 },
                { variableId: `cuelist_${list.id}_cue_${i}_delayTimeLeft`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} time left in pre delay in ms`, value: cueProgress?.delayTimeLeft ?? -1 },
                { variableId: `cuelist_${list.id}_cue_${i}_durationTimeLeft`, name: `Cuelist ${list.name} cue ${cue.cueNumber?.number.join(".")} state`, value: cueProgress?.durationTimeLeft ?? -1 },
            ]
        })
    }

    generateVariables(): CompanionVariableDefinition[] {
        return [
            ...this.repo.getIds().flatMap(id => this.generateVariablesCuelistProperties(id)),
            ...[...this.progressFeedbacks.entries()]
                .filter(([_, feedbacks]) => feedbacks.size > 0)
                .flatMap(([cuelistId, _]) => this.generateVariablesCueProgress(cuelistId))
        ]
    }

    close(): void {
        if (this.pollInterval != null) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        if (this.progressStream != null) {
            this.progressStream.end();
        }
        this.grpcclient.close();
    }

    private async onActionSetIntensity(event: CompanionActionEvent) {
        try {
            const intensity = event.options?.intensity as number;
            if (typeof intensity !== "number") {
                throw new Error("To set cuelist intensity, cuelist id and intensity must be set");
            }
            const list = this.repo.checkAndGetIdOption(event.options);

            const actionRes = await new Promise<ConfirmedResponse>((resolve, reject) =>
                this.grpcclient.setCuelistValue(
                    SetCuelistValueRequest.create({
                        requestId: this.instance.getRequestId(),
                        cuelistId: list.id,
                        intensity: intensity / 100
                    }),
                    this.metadata,
                    (err, res) => err != null ? reject(err) : resolve(res)
                ));

            if (!actionRes.ok) {
                this.instance.log("error", "While setting cuelist intensity: " + JSON.stringify(actionRes.message))
            }
        } catch (err) {
            this.instance.log("warn", (err as Error)?.message);
        }
    }

    private async onActionCuelistAction(event: CompanionActionEvent) {
        try {
            const actionStr = event.options?.actionType as keyof typeof CuelistActionRequest_EAction | undefined;
            if (typeof actionStr !== "string") {
                throw new Error("To call cuelist action, action type must be set");
            }
            const action = CuelistActionRequest_EAction[actionStr];
            if (!action) {
                throw new Error(`Cuelist action ${actionStr} does not exist.`);
            }
            const list = this.repo.checkAndGetIdOption(event.options)

            const actionRes = await new Promise<ConfirmedResponse>((resolve, reject) =>
                this.grpcclient.cuelistAction(
                    CuelistActionRequest.create({
                        requestId: this.instance.getRequestId(),
                        cuelistId: list.id,
                        action: action,
                    }),
                    this.metadata,
                    (err, res) => err != null ? reject(err) : resolve(res)
                ));

            if (!actionRes.ok) {
                this.instance.log("error", "While running cuelist action: " + JSON.stringify(actionRes.message))
            }
        } catch (err) {
            this.instance.log("warn", (err as Error)?.message);
        }
    }

    private onFeedbackCuelistState(feedback: CompanionFeedbackInfo, _: CompanionCommonCallbackContext): boolean {
        try {
            const stateStr = feedback.options.state as keyof typeof ESceneListState;
            if (typeof stateStr !== "string") {
                throw new Error("For feedback, cuelist state must be set");
            }
            const state = ESceneListState[stateStr];
            if (typeof state !== typeof ESceneListState.STOPPED) {
                throw new Error(`Unknown cuelist state ${stateStr}`);
            }
            const list = this.repo.checkAndGetIdOption(feedback.options);
            return list.state == state;
        } catch (err) {
            this.instance.log("warn", (err as Error)?.message);
            return false;
        }
    }

    private onFeedbackCurrentCue(feedback: CompanionFeedbackInfo, _: CompanionCommonCallbackContext): boolean {
        try {
            const cueState = feedback.options.cue_state as string;
            if (!["previous", "current", "next"].includes(cueState)) {
                throw new Error("For current cue feedback, must select cue state.");
            }
            const cueIndex = feedback.options.cue_index as number;
            if (typeof cueIndex !== "number") {
                throw new Error(`Cue index to check must be number`);
            }
            const list = this.repo.checkAndGetIdOption(feedback.options);
            switch (cueState) {
                case "previous":
                    return list.previousIndex == cueIndex;
                case "current":
                    return list.index == cueIndex;
                case "next":
                    return list.nextIndex == cueIndex;
            }
            return false;
        } catch (err) {
            this.instance.log("warn", (err as Error)?.message);
            return false;
        }
    }

    private onFeedbackCueProgressCheckOptions(options: CompanionOptionValues): { cueProgressState: number, cueIndex: number, cueProgress: number, comparisonOperator: number } {
        // Check options:
        const cueProgressState = options.cue_progress_state as number;
        if (!Object.values(ESceneState).includes(cueProgressState)) {
            throw new Error("For cue progress feedback, must select valid cue progress state.");
        }
        const cueIndex = options.cue_index as number;
        if (typeof cueIndex !== "number") {
            throw new Error(`Cue index to check must be number`);
        }
        const cueProgress = options.cue_progress as number;
        if (typeof cueProgress !== "number" || !isFinite(cueProgress)) {
            throw new Error(`Cue progress to check must be number`);
        }
        const comparisonOperator = options.cue_progress_compare as number;
        if (typeof comparisonOperator !== "number" || !isFinite(comparisonOperator)) {
            throw new Error(`Not a valid comparison operator`);
        }
        return { cueProgressState, cueIndex, cueProgress, comparisonOperator };
    }

    private onFeedbackCueProgress(feedback: CompanionFeedbackInfo, _: CompanionCommonCallbackContext): boolean {
        try {
            const { cueProgressState, cueIndex, cueProgress, comparisonOperator } = this.onFeedbackCueProgressCheckOptions(feedback.options);
            const list = this.repo.checkAndGetIdOption(feedback.options);

            const listProgress = this.cueProgressPerCuelist.get(list.id);
            if (!listProgress) {
                return false;
            }
            const cueProgressMsg = listProgress.get(cueIndex);
            if (!cueProgressMsg) {
                return false;
            }
            if (cueProgressState != ESceneState.None && (cueProgressMsg.cueState & cueProgressState) == 0) {
                return false;
            }
            if (cueProgress >= 0) {
                if (comparisonOperator == 0) {
                    if (Math.abs(cueProgressMsg.progress - cueProgress) > 0.01 /*1% tolerance because of float impercision*/) {
                        return false;
                    }
                } else if ((cueProgressMsg.progress - cueProgress) * comparisonOperator <= 0) {
                    return false;
                }
            }
            return true;
        } catch (err) {
            // don't log (option) errors as they are already logged in subscribe
            return false;
        }
    }

    private async onFeedbackCueProgressSubscribe(feedback: CompanionFeedbackInfo, _: CompanionCommonCallbackContext) {
        try {
            const list = this.repo.checkAndGetIdOption(feedback.options);
            const subscribedFeedbacks = this.progressFeedbacks.get(list.id) ?? new Set();
            if (!this.progressFeedbacks.has(list.id)) {
                this.progressFeedbacks.set(list.id, subscribedFeedbacks);
            }
            const isNewCuelist = subscribedFeedbacks.size == 0;
            this.instance.log("debug", `Feedback ${feedback.id} subscribed to ${list.id} progress`);
            subscribedFeedbacks.add(feedback.id);
            if (isNewCuelist) {
                await new Promise<void>((resolve, reject) =>
                    this.progressStream?.write(CuelistProgressStateChangeRequest.create({
                        cuelistIds: [...this.progressFeedbacks.entries()].filter(([_, feedbacks]) => feedbacks.size > 0).map(([cuelistId, _]) => cuelistId)
                    }), (err: any) => err ? reject(err) : resolve())
                );
                this.updateVariables();
                this.setVariables(this.generateVariablesCueProgress(list.id));
            }

            this.onFeedbackCueProgressCheckOptions(feedback.options);
        } catch (err) {
            this.instance.log("warn", (err as Error)?.message);
        }
    }

    private async onFeedbackCueProgressUnsubscribe(feedback: CompanionFeedbackInfo, _: CompanionCommonCallbackContext) {
        try {
            const list = this.repo.checkAndGetIdOption(feedback.options);
            const subscribedFeedbacks = this.progressFeedbacks.get(list.id);
            this.instance.log("debug", `Feedback ${feedback.id} unsubscribed from ${list.id} progress`);
            if (!subscribedFeedbacks) {
                return;
            }
            subscribedFeedbacks.delete(feedback.id);
            if (subscribedFeedbacks.size == 0) {
                await new Promise<void>((resolve, reject) =>
                    this.progressStream?.write(CuelistProgressStateChangeRequest.create({
                        cuelistIds: [...this.progressFeedbacks.entries()].filter(([_, feedbacks]) => feedbacks.size > 0).map(([cuelistId, _]) => cuelistId)
                    }), (err: any) => err ? reject(err) : resolve())
                );
                this.updateVariables();
            }
        } catch (err) {
            this.instance.log("warn", (err as Error)?.message);
        }
    }
}