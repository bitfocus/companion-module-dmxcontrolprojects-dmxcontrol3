import { ExecutorDescriptor } from "@deluxequadrat/dmxc-grpc-client/dist/index.LumosProtobuf.Executor";
import { RepositoryBase } from "../repositorybase";
import { IExecutor } from "./iexecutor";

export class ExecutorRepository extends RepositoryBase<IExecutor> {
    public addExecutor(executor: ExecutorDescriptor) {
        const executorinstance: IExecutor = {
            ID: executor.id,
            memberID: executor.executorMemberId,
            number: executor.number,
            name: executor.name,
            buttons: [
                {
                    key: executor.button1Key,
                    label: executor.button1DisplayName,
                    active: executor.button1Active
                },
                {
                    key: executor.button2Key,
                    label: executor.button2DisplayName,
                    active: executor.button2Active
                },
                {
                    key: executor.button3Key,
                    label: executor.button3DisplayName,
                    active: executor.button3Active
                },
                {
                    key: executor.button4Key,
                    label: executor.button4DisplayName,
                    active: executor.button4Active
                }
            ],
            fader: {
                key: executor.faderKey,
                label: executor.faderDisplayName,
                position: executor.faderPosition
            }
        };
        this.data.set(executorinstance.ID, executorinstance);
        this.namelookup.set(executorinstance.name, executorinstance.ID);
    }

    updateExecutor(executor: ExecutorDescriptor) {
        const executorinstance = this.data.get(executor.id);

        if (executorinstance) {
            executorinstance.name = executor.name;
            executorinstance.memberID = executor.executorMemberId;
            executorinstance.number = executor.number;
            executorinstance.buttons = [
                {
                    key: executor.button1Key,
                    label: executor.button1DisplayName,
                    active: executor.button1Active
                },
                {
                    key: executor.button2Key,
                    label: executor.button2DisplayName,
                    active: executor.button2Active
                },
                {
                    key: executor.button3Key,
                    label: executor.button3DisplayName,
                    active: executor.button3Active
                },
                {
                    key: executor.button4Key,
                    label: executor.button4DisplayName,
                    active: executor.button4Active
                }
            ];
            executorinstance.fader = {
                key: executor.faderKey,
                label: executor.faderDisplayName,
                position: executor.faderPosition
            };
            this.namelookup.set(executorinstance.name, executorinstance.ID);
        } else {
            this.addExecutor(executor);
        }
    }
}
