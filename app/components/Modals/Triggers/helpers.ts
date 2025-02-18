import capitalize from "lodash/capitalize";

import { DeploymentProvider, Trigger, TriggerFields } from "../../../lib/types";
import { copy } from "../../../theme/copy";

export type TriggerMode = "deployment" | "schedule";

type BuildTriggerFields = {
  deployBranches: string | null;
  deployEnv: string | null;
  deployIntegrationId: string | null;
  deployPreviewUrl: string | null;
  deployProvider: DeploymentProvider | null;
  environmentId: string;
  mode: TriggerMode;
  name: string;
  repeatMinutes: number;
  tagIds: string[];
};

type GetDefaultName = {
  deployEnv: string | null;
  mode: TriggerMode;
  repeatMinutes: number;
  triggers: Trigger[];
};

export const defaultRepeatMinutes = 24 * 60; // daily

const nullDeploymentFields = {
  deployment_branches: null,
  deployment_environment: null,
  deployment_integration_id: null,
  deployment_preview_url: null,
  deployment_provider: null,
};

export const buildTriggerFields = ({
  deployBranches,
  deployEnv,
  deployIntegrationId,
  deployPreviewUrl,
  deployProvider,
  environmentId,
  mode,
  name,
  repeatMinutes,
  tagIds,
}: BuildTriggerFields): TriggerFields => {
  const constantFields = { environment_id: environmentId || null, name };

  if (mode === "schedule") {
    return {
      ...constantFields,
      ...nullDeploymentFields,
      repeat_minutes: repeatMinutes,
      tag_ids: tagIds,
    };
  }

  let deployment_environment = null;
  if (["netlify", "vercel"].includes(deployProvider)) {
    deployment_environment =
      deployEnv && deployEnv !== "all" ? deployEnv : null;
  }

  return {
    ...constantFields,
    deployment_branches:
      deployBranches && ["heroku", "vercel"].includes(deployProvider)
        ? deployBranches
        : null,
    deployment_environment,
    deployment_integration_id: deployIntegrationId || null,
    deployment_preview_url:
      deployProvider === "render" ? deployPreviewUrl : null,
    deployment_provider: deployProvider,
    repeat_minutes: null,
    tag_ids: tagIds,
  };
};

export const getDefaultMode = (trigger: Trigger | null): TriggerMode => {
  if (!trigger || trigger.repeat_minutes) return "schedule";

  return "deployment";
};

const getDeploymentName = (deployEnv: string): string => {
  if (["preview", "production"].includes(deployEnv)) {
    return capitalize(`${deployEnv} ${copy.deployment}`);
  }

  return copy.deployment;
};

export const getDefaultName = ({
  deployEnv,
  mode,
  repeatMinutes,
  triggers,
}: GetDefaultName): string => {
  let defaultName = copy.api;

  if (mode === "schedule") {
    defaultName = repeatMinutes === 60 ? copy.hourly : copy.daily;
  } else if (mode === "deployment") {
    defaultName = getDeploymentName(deployEnv);
  }

  if (triggers.some((t) => t.name === defaultName)) {
    return copy.triggerNamePlaceholder;
  }

  return defaultName;
};

export const labelTextProps = {
  color: "gray9",
  margin: { bottom: "small", top: "medium" },
  size: "componentBold" as const,
};

export const repeatMinutesOptions = [
  { label: copy.frequencyDaily, value: defaultRepeatMinutes },
  { label: copy.frequencyHourly, value: 60 },
];
