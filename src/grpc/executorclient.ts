import * as GRPC from "@grpc/grpc-js";
import { DMXCModuleInstance } from "../main";
import { ExecutorRepository } from "../dmxcstate/executor/executorrepository";
import { loggedMethod } from "../utils";
import { ExecutorClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";
import {
    EChangeType,
    GetMultipleRequest,
    GetRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import {
    ExecutorChangedMessage,
    SetExecutorValuesRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Executor";

export class ExecutorClient {
    private eclient: ExecutorClientClient;

    private repo: ExecutorRepository;

    constructor(
        endpoint: string,
        private metadata: GRPC.Metadata,
        private instance: DMXCModuleInstance
    ) {
        this.repo = this.instance.repositories?.get(
            "ExecutorRepository"
        ) as ExecutorRepository;
        this.eclient = new ExecutorClientClient(
            endpoint,
            GRPC.credentials.createInsecure()
        );
        this.eclient.getExecutors(
            GetMultipleRequest.create(),
            this.metadata,
            (error, response) => {
                if (error) {
                    instance.log("error", error.message);
                    return;
                }
                response.executors.forEach((executor) => {
                    this.repo.addExecutor(executor);
                });
                this.instance.presets?.createExecutorPresets(
                    this.repo.getAll()
                );
                this.instance.checkFeedbacks(
                    "ButtonState",
                    "ButtonName",
                    "FaderState",
                    "FaderName"
                );
            }
        );
        this.eclient
            .receiveExecutorChanges(GetRequest.create(), this.metadata)
            .on("data", (response: ExecutorChangedMessage) => {
                this.instance.log(
                    "debug",
                    `ExecutorClient received change for executor: ${JSON.stringify(response.executorData)}`
                );
                switch (response.changeType) {
                    case EChangeType.Added:
                        if (response.executorData)
                            this.repo.addExecutor(response.executorData);
                        this.instance.presets?.createExecutorPresets(
                            this.repo.getAll()
                        );
                        break;
                    case EChangeType.Changed:
                        if (response.executorData)
                            this.repo.updateExecutor(response.executorData);
                        break;
                    case EChangeType.Removed:
                        if (response.executorData)
                            this.repo.remove(response.executorData.id);
                        this.instance.presets?.createExecutorPresets(
                            this.repo.getAll()
                        );
                        break;
                }
                this.instance.checkFeedbacks(
                    "ButtonState",
                    "ButtonName",
                    "FaderState",
                    "FaderName"
                );
            })
            .on("error", (error) => {
                instance.log("error", error.message);
            });
    }

    sendExecutorState(request: SetExecutorValuesRequest) {
        this.eclient.setExecutorValues(
            request,
            this.metadata,
            loggedMethod((response) => {
                if (!response.ok) {
                    this.instance.log(
                        "error",
                        `Error setting ExecutorState: ${request.executorId}`
                    );
                }
            })
        );
    }
}
