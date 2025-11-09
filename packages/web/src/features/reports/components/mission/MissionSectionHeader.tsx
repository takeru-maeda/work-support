import { SectionHeader } from "@/components/sections/SectionHeader";
import { Target } from "lucide-react";

const MissionSectionHeader = () => {
  return (
    <SectionHeader
      icon={Target}
      iconClassName="bg-primary/10 text-primary"
      title="ミッション"
      description="目的と方向性を定義"
    />
  );
};

export default MissionSectionHeader;
