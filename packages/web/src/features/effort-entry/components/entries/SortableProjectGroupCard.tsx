import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  ProjectGroupCard,
  type ProjectGroupCardProps,
} from "./ProjectGroupCard";
import { cn } from "@/lib/utils";

interface SortableProjectGroupCardProps extends ProjectGroupCardProps {
  id: string;
}

export const SortableProjectGroupCard = ({
  id,
  ...props
}: Readonly<SortableProjectGroupCardProps>) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none cursor-move",
        isDragging && "opacity-80 shadow-lg",
      )}
      {...attributes}
      {...listeners}
    >
      <ProjectGroupCard {...props} />
    </div>
  );
};
