import type { MissionGetResponse } from "@shared/schemas/missions";

export type Mission = NonNullable<MissionGetResponse["mission"]>;
