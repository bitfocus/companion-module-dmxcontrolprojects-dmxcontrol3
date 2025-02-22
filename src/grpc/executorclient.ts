import * as GRPC from "@grpc/grpc-js";
import { ExecutorClientClient } from "../generated/Client/ExecutorClient_grpc_pb";
import { DMXCModuleInstance } from "../main";
import { ExecutorRepository } from "../dmxcstate/executor/executorrepository";
import {
    ExecutorChangedMessage,
    GetExecutorsResponse,
    SetExecutorValuesRequest
} from "../generated/Common/Types/Executor/ExecutorServiceCRUDTypes_pb";
import {
    GetMultipleRequest,
    GetRequest
} from "../generated/Common/Types/CommonTypes_pb";
import { loggedMethod } from "../utils";

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
            new GetMultipleRequest(),
            this.metadata,
            (error, response) => {
                if (error) {
                    instance.log("error", error.message);
                    return;
                }
                this.getExecutorHandler(response);
            }
        );
        this.eclient
            .receiveExecutorChanges(new GetRequest(), this.metadata)
            .on("data", (response: ExecutorChangedMessage) => {
                this.executorChangeHandler(response);
            })
            .on("error", (error) => {
                instance.log("error", error.message);
            });
    }

    getExecutorHandler(response: GetExecutorsResponse): void {
        response.getExecutorsList().forEach((executor) => {
            this.repo.addExecutor(executor);
        });
        this.instance.presets?.createExecutorPresets(
            response.getExecutorsList()
        );
    }

    executorChangeHandler(response: ExecutorChangedMessage) {
        const executor = response.getExecutordata();
        if (executor) {
            this.repo.updateExecutor(executor);
            this.instance.checkFeedbacks(
                "ButtonState",
                "ButtonName",
                "FaderState"
            );
        }
    }

    sendExecutorState(request: SetExecutorValuesRequest) {
        this.eclient.setExecutorValues(
            request,
            this.metadata,
            loggedMethod((response) => {
                if (!response.getOk()) {
                    this.instance.log(
                        "error",
                        `Error setting ExecutorState: ${request.getExecutorid()}`
                    );
                }
            })
        );
    }
}
