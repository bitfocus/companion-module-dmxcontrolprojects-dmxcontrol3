import * as GRPC from "@grpc/grpc-js";
import { DMXCModuleInstance } from "../main";
import { ExecutorRepository } from "../dmxcstate/executor/executorrepository";
import { loggedMethod } from "../utils";
import { ExecutorClientClient } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobufClient";
import {
    GetMultipleRequest,
    GetRequest
} from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf";
import {
    ExecutorChangedMessage,
    GetExecutorsResponse,
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
            loggedMethod((response) => {
                this.getExecutorHandler(response);
            })
        );
        this.eclient
            .receiveExecutorChanges(GetRequest.create(), this.metadata)
            .on("data", (response: ExecutorChangedMessage) => {
                this.executorChangeHandler(response);
            });
    }

    getExecutorHandler(response: GetExecutorsResponse): void {
        response.executors.forEach((executor) => {
            this.repo.addExecutor(executor);
        });
        this.instance.presets?.createExecutorPresets(response.executors);
    }

    executorChangeHandler(response: ExecutorChangedMessage) {
        const executor = response.executorData;
        if (executor) {
            this.repo.updateExecutor(executor);
            this.instance.checkFeedbacks("ButtonState", "FaderState");
        }
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
