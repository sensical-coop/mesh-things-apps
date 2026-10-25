/**
 * Request wrappers the 0.90 generator exported as zXxxData.
 * 0.99 splits those into body, path and query. Call sites still parse { body, path, query }.
 */
import { z } from "zod";
import {
  zAccountTermsAcceptance,
  zBlueprintVersionWritable,
  zDeviceCreateWritable,
  zDeviceMeasurementUpdate,
  zDevicePostprocessingWrite,
  zDeviceUpdateWritable,
  zExportRequest,
  zMeshCreateWritable,
  zMeshTermsAcceptance,
  zMeshUpdateWritable,
  zOperatorRequestCreate,
  zOperatorRequestDecision,
  zOwnerCreateWritable,
  zOwnerLoginWritable,
  zOwnerRequestPasswordReset,
  zOwnerResetPassword,
  zOwnerUpdate,
  zPostprocessingBackfillWritable,
  zPostprocessingBlueprintCreate,
  zPostprocessingBlueprintUpdate,
  zResendVerification,
  zSinkCreateWritable,
  zSinkTermsAcceptance,
  zSinkWrite,
  zSourceCreateWritable,
  zSourceTermsAcceptance,
  zSourceUpdateWritable,
  zStepCalibrationWritable,
  zTelemetryVariantMeasurementUpdate,
} from "./generated/zod.gen";

export * from "./generated/zod.gen";

export const zDevicesCreateData = z.object({
    body: zDeviceCreateWritable,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zDevicesMeasurementsUpdateData = z.object({
    body: z.optional(zDeviceMeasurementUpdate),
    path: z.object({
        device_uuid: z.uuid(),
        measurement_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zDevicesUpdateData = z.object({
    body: z.optional(zDeviceUpdateWritable),
    path: z.object({
        device_uuid: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zMeshesCreateData = z.object({
    body: zMeshCreateWritable,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zMeshesTermsAcceptanceCreateData = z.object({
    body: zMeshTermsAcceptance,
    path: z.object({
        mesh_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zMeshesUpdateData = z.object({
    body: z.optional(zMeshUpdateWritable),
    path: z.object({
        mesh_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zOwnersCreateData = z.object({
    body: zOwnerCreateWritable,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zOwnersMeResendVerificationCreateData = z.object({
    body: z.optional(zResendVerification),
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zOwnersLoginCreateData = z.object({
    body: zOwnerLoginWritable,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zOwnersMeUpdateData = z.object({
    body: z.optional(zOwnerUpdate),
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zOwnersRequestPasswordResetCreateData = z.object({
    body: zOwnerRequestPasswordReset,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zOwnersResetPasswordCreateData = z.object({
    body: zOwnerResetPassword,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zDevicesPostprocessingsBackfillsCreateData = z.object({
    body: zPostprocessingBackfillWritable,
    path: z.object({
        device_uuid: z.uuid(),
        postprocessing_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zDevicesPostprocessingsCalibrationsCreateData = z.object({
    body: zStepCalibrationWritable,
    path: z.object({
        device_uuid: z.uuid(),
        postprocessing_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zDevicesPostprocessingsCreateData = z.object({
    body: z.optional(zDevicePostprocessingWrite),
    path: z.object({
        device_uuid: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zDevicesPostprocessingsUpdateData = z.object({
    body: z.optional(zDevicePostprocessingWrite),
    path: z.object({
        device_uuid: z.uuid(),
        postprocessing_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zPostprocessingBlueprintsCreateData = z.object({
    body: zPostprocessingBlueprintCreate,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zPostprocessingBlueprintsUpdateData = z.object({
    body: z.optional(zPostprocessingBlueprintUpdate),
    path: z.object({
        blueprint_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zPostprocessingBlueprintsVersionsCreateData = z.object({
    body: zBlueprintVersionWritable,
    path: z.object({
        blueprint_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zOperatorRequestsUpdateData = z.object({
    body: zOperatorRequestDecision,
    path: z.object({
        request_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zOwnersMeOperatorRequestCreateData = z.object({
    body: zOperatorRequestCreate,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zOwnersMeTermsAcceptanceCreateData = z.object({
    body: zAccountTermsAcceptance,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zSourcesTermsAcceptanceCreateData = z.object({
    body: zSourceTermsAcceptance,
    path: z.object({
        source_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zSourcesCreateData = z.object({
    body: zSourceCreateWritable,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zSourcesUpdateData = z.object({
    body: z.optional(zSourceUpdateWritable),
    path: z.object({
        source_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zSinksCreateData = z.object({
    body: zSinkCreateWritable,
    path: z.optional(z.never()),
    query: z.optional(z.never())
});
export const zSinksTermsAcceptanceCreateData = z.object({
    body: zSinkTermsAcceptance,
    path: z.object({
        sink_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zSinksUpdateData = z.object({
    body: z.optional(zSinkWrite),
    path: z.object({
        sink_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zTelemetryVariantsMeasurementsUpdateData = z.object({
    body: z.optional(zTelemetryVariantMeasurementUpdate),
    path: z.object({
        link_id: z.uuid(),
        telemetry_variant_id: z.uuid()
    }),
    query: z.optional(z.never())
});
export const zReadingsMeshesExportsCreateData = z.object({
    body: zExportRequest,
    path: z.object({
        mesh_id: z.uuid()
    }),
    query: z.optional(z.never())
});

