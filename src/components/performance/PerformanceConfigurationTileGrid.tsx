import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CONFIGURATION_TILES,
  tileStatusLabel,
  type ConfigurationTile,
} from "@/incentives/lib/configurationCmsLogic";
import { ArrowRight, Settings2 } from "lucide-react";

export function PerformanceConfigurationTileGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {CONFIGURATION_TILES.map((tile) => (
        <ConfigTile key={tile.id} tile={tile} />
      ))}
    </div>
  );
}

function ConfigTile({ tile }: { tile: ConfigurationTile }) {
  return (
    <Link to={tile.to} className="block group">
      <Card className="p-4 ph-surface-card h-full transition-colors hover:border-[var(--blue)]">
        <div className="flex items-start gap-2 mb-3">
          <Settings2 className="size-4 shrink-0 mt-0.5" style={{ color: "var(--blue)" }} />
          <p className="font-semibold ph-heading text-sm">{tile.title}</p>
        </div>
        <p className="text-xs ph-muted">{tile.description}</p>
        <div className="flex items-center justify-between mt-4">
          <Badge
            variant="secondary"
            className={
              tile.status === "configured"
                ? "bg-emerald-100 text-emerald-800 border-0"
                : "border-0"
            }
          >
            {tileStatusLabel(tile.status)}
          </Badge>
          <ArrowRight
            className="size-4 ph-muted group-hover:translate-x-0.5 transition-transform"
            style={{ color: "var(--blue)" }}
          />
        </div>
      </Card>
    </Link>
  );
}
