import { createContext, FC, useContext, useEffect } from "react";

import { RunProgress } from "../../../lib/types";
import { ConnectRunnerHook, useConnectRunner } from "../hooks/connectRunner";
import { ElementChooserHook, useElementChooser } from "../hooks/elementChooser";
import { EnvHook, useEnv } from "../hooks/env";
import { RunnerHook, useRunner } from "../hooks/runner";
import { useRunProgress } from "../hooks/runProgress";
import { RunTest, useRunTest } from "../hooks/runTest";
import { SelectionHook, useSelection } from "../hooks/selection";
import { TestContext } from "./TestContext";

type RunnerContext = ConnectRunnerHook &
  ElementChooserHook &
  EnvHook &
  RunnerHook &
  SelectionHook & {
    progress: RunProgress | null;
    requestTestRunner: boolean;
    runTest: RunTest["runTest"];
    stopTest: RunTest["stopTest"];
  };

export const RunnerContext = createContext<RunnerContext>({
  elementChooserValue: { isActive: false },
  env: null,
  isRunnerConnected: false,
  isRunnerLoading: false,
  mouseLineNumber: null,
  onSelectionChange: () => null,
  progress: null,
  requestTestRunner: false,
  runner: null,
  runTest: () => null,
  selection: null,
  startElementChooser: () => null,
  stopElementChooser: () => null,
  stopTest: () => null,
  vncUrl: null,
  wsUrl: null,
});

export const RunnerProvider: FC = ({ children }) => {
  const { mouseLineNumber, onSelectionChange, selection } = useSelection();
  const { isRunnerConnected, runner } = useRunner();

  const { controller, run, suite, team } = useContext(TestContext);

  const {
    elementChooserValue,
    startElementChooser,
    stopElementChooser,
  } = useElementChooser(runner);

  const { env } = useEnv({
    apiKey: team?.api_key,
    inbox: team?.inbox,
    suiteVariables: suite?.environment_variables,
  });

  const { progress, resetProgress } = useRunProgress({ run, runner });

  const { requestTestRunner, runTest, stopTest } = useRunTest({
    env,
    resetProgress,
    runner,
  });

  const { isRunnerLoading, vncUrl, wsUrl } = useConnectRunner({
    isRunnerConnected,
    requestTestRunner,
    runner,
  });

  useEffect(() => {
    if (!controller || !runner) return;

    runner.syncState(controller._state);
  }, [controller, runner]);

  const value = {
    elementChooserValue,
    env,
    isRunnerConnected,
    isRunnerLoading,
    mouseLineNumber,
    onSelectionChange,
    progress,
    requestTestRunner,
    runner,
    runTest,
    selection,
    startElementChooser,
    stopElementChooser,
    stopTest,
    vncUrl,
    wsUrl,
  };

  return (
    <RunnerContext.Provider value={value}>{children}</RunnerContext.Provider>
  );
};
