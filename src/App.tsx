import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import BattleHud from "./components/hud/BattleHud";
import StatusPanel from "./components/hud/StatusPanel";
import TeamOverview from "./components/hud/TeamOverview";
import ToolsMenu from "./components/hud/ToolsMenu";
import Scene from "./components/Scene";
import { loadInitialMatch } from "./runtime/bootstrap/loadInitialMatch";
import { useSimulationStore } from "./state/simulationStore";
import { useHudStore } from "./state/ui/hudStore";
import HudShell from "./ui/hud/HudShell";
import AppLayout, { PanelTitle } from "./ui/layout/AppLayout";

function App() {
  const { data: initialMatch } = useSuspenseQuery({
    queryKey: ["initial-match"],
    queryFn: ({ signal }) => loadInitialMatch({ signal }),
    staleTime: Infinity,
  });

  const initialize = useSimulationStore((state) => state.initialize);
  const showHud = useHudStore((state) => state.showHud);

  useEffect(() => {
    initialize(initialMatch);
  }, [initialize, initialMatch]);

  return (
    <AppLayout
      header={
        <>
          <div>
            <PanelTitle>Battle Status</PanelTitle>
            <StatusPanel />
          </div>
          <ToolsMenu />
        </>
      }
      scene={
        <HudShell showHud={showHud} topOverlay={<BattleHud />}>
          <Scene />
        </HudShell>
      }
      sidebar={
        <div>
          <PanelTitle>Team Overview</PanelTitle>
          <TeamOverview />
        </div>
      }
    />
  );
}

export default App;
