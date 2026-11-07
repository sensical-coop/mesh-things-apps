import { getDevicesCreateMutationOptions, getDevicesUpdateMutationOptions } from "@mtt/contracts/api";

export const deviceRepository = {
  create: getDevicesCreateMutationOptions,
  update: getDevicesUpdateMutationOptions,
};
