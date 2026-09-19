"use server";

import { findPublicTracking } from "@/lib/data/queries";
import { trackingStage, trackingStageLabel, trackingStageOrder, type TrackingStage } from "@/lib/utils/compute";

export type PublicTrackingResult = {
  error: string | null;
  data?: {
    loadNumber: string;
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    equipment: string | null;
    weight: number;
    stage: TrackingStage;
    stageLabel: string;
    stageOrder: TrackingStage[];
    currentLocation: string | null;
    eta: string | null;
    publicNote: string | null;
  };
};

export async function lookupTracking(
  _prev: PublicTrackingResult,
  formData: FormData
): Promise<PublicTrackingResult> {
  const loadNumber = String(formData.get("loadNumber") || "").trim();
  const zip = String(formData.get("zip") || "").trim();

  if (!loadNumber || !zip) {
    return { error: "Enter both a load number and delivery ZIP." };
  }

  const result = await findPublicTracking(loadNumber, zip);
  if (!result) {
    return {
      error:
        "We couldn't find that shipment. Double check your load number and ZIP code, or contact your rep.",
    };
  }

  const stage = trackingStage(result.tracking);

  return {
    error: null,
    data: {
      loadNumber: result.load.loadNumber,
      originCity: result.load.originCity,
      originState: result.load.originState,
      destCity: result.load.destCity,
      destState: result.load.destState,
      equipment: result.load.equipment,
      weight: result.load.weight,
      stage,
      stageLabel: trackingStageLabel[stage],
      stageOrder: trackingStageOrder,
      currentLocation: result.tracking.currentLocation,
      eta: result.tracking.eta,
      publicNote: result.tracking.publicNote,
    },
  };
}
