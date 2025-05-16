import { ExecutorDescriptor } from "../../generated/Common/Types/Executor/ExecutorServiceTypes_pb";
import { RepositoryBase } from "../repositorybase";
import { IExecutor } from "./iexecutor";

export class ExecutorRepository extends RepositoryBase<IExecutor> {
    public addExecutor(executor: ExecutorDescriptor) {
        const executorinstance: IExecutor = {
            ID: executor.getId(),
            memberID: executor.getExecutormemberid(),
            number: executor.getNumber(),
            name: executor.getName(),
            buttons: [
                {
                    key: executor.getButton1key(),
                    label: executor.getButton1displayname(),
                    active: executor.getButton1active()
                },
                {
                    key: executor.getButton2key(),
                    label: executor.getButton2displayname(),
                    active: executor.getButton2active()
                },
                {
                    key: executor.getButton3key(),
                    label: executor.getButton3displayname(),
                    active: executor.getButton3active()
                },
                {
                    key: executor.getButton4key(),
                    label: executor.getButton4displayname(),
                    active: executor.getButton4active()
                }
            ],
            fader: {
                key: executor.getFaderkey(),
                label: executor.getFaderdisplayname(),
                position: executor.getFaderposition()
            }
        };
        this.data.set(executorinstance.ID, executorinstance);
        this.namelookup.set(executorinstance.name, executorinstance.ID);
    }

    updateExecutor(executor: ExecutorDescriptor) {
        const executorinstance = this.data.get(executor.getId());

        if (executorinstance) {
            executorinstance.name = executor.getName();
            executorinstance.memberID = executor.getExecutormemberid();
            executorinstance.number = executor.getNumber();
            executorinstance.buttons = [
                {
                    key: executor.getButton1key(),
                    label: executor.getButton1displayname(),
                    active: executor.getButton1active()
                },
                {
                    key: executor.getButton2key(),
                    label: executor.getButton2displayname(),
                    active: executor.getButton2active()
                },
                {
                    key: executor.getButton3key(),
                    label: executor.getButton3displayname(),
                    active: executor.getButton3active()
                },
                {
                    key: executor.getButton4key(),
                    label: executor.getButton4displayname(),
                    active: executor.getButton4active()
                }
            ];
            executorinstance.fader = {
                key: executor.getFaderkey(),
                label: executor.getFaderdisplayname(),
                position: executor.getFaderposition()
            };
            this.namelookup.set(executorinstance.name, executorinstance.ID);
        } else {
            this.addExecutor(executor);
        }
    }
}
