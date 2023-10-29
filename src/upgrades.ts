import { CompanionStaticUpgradeScript } from "@companion-module/base";
import { Config } from "./config";

export const UpgradeScripts = (): CompanionStaticUpgradeScript<Config>[] => {
  return [
    /*
     * Place your upgrade scripts here
     * Remember that once it has been added it cannot be removed!
     */
    // function (context, props) {
    // 	return {
    // 		updatedConfig: null,
    // 		updatedActions: [],
    // 		updatedFeedbacks: [],
    // 	}
    // },
  ];
};
