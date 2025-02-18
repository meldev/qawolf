import { RestEndpointMethodTypes } from "@octokit/rest";
import { uniq } from "lodash";

import environment from "../../environment";
import { Logger } from "../../Logger";
import {
  findGitHubCommitStatusForSuite,
  updateGitHubCommitStatus,
} from "../../models/github_commit_status";
import { findRunsForSuite } from "../../models/run";
import {
  GitHubCommitStatus as GitHubCommitStatusModel,
  ModelOptions,
} from "../../types";
import { createOctokitForInstallation } from "./app";

export type GitHubCommitStatus = RestEndpointMethodTypes["repos"]["createCommitStatus"]["response"]["data"];

export type GitHubRepos = RestEndpointMethodTypes["apps"]["listReposAccessibleToInstallation"]["response"]["data"]["repositories"];

type BranchForCommit = {
  branch: string;
  commitMessage: string | null;
  pullRequestId: number | null;
};

type CreateCommitStatus = {
  context: string;
  installationId: number;
  owner: string;
  repo: string;
  sha: string;
  state?: "failure" | "pending" | "success";
  suiteId: string;
};

type FindBranchForCommit = {
  installationId: number;
  owner: string;
  ref: string;
  repo: string;
  sha: string;
};

type FindGitHubReposForInstallation = {
  installationId: number;
  isSync: boolean;
};

type ShouldUpdateCommitStatus = {
  gitHubCommitStatus: GitHubCommitStatusModel | null;
  logger: Logger;
};

export const createCommitStatus = async (
  {
    context,
    installationId,
    owner,
    repo,
    sha,
    state,
    suiteId,
  }: CreateCommitStatus,
  options: ModelOptions
): Promise<GitHubCommitStatus> => {
  const { octokit } = await createOctokitForInstallation(
    { installationId },
    options
  );

  let description = "Running";
  if (state === "failure") description = "Fail";
  if (state === "success") description = "Pass";

  const { data } = await octokit.repos.createCommitStatus({
    context,
    description,
    owner,
    repo,
    sha,
    state: state || "pending",
    target_url: new URL(`/suites/${suiteId}`, environment.APP_URL).href,
  });

  return data;
};

export const findBranchForCommit = async (
  { installationId, owner, ref, repo, sha }: FindBranchForCommit,
  options: ModelOptions
): Promise<BranchForCommit> => {
  const { octokit } = await createOctokitForInstallation(
    { installationId },
    options
  );

  const { data } = await octokit.checks.listSuitesForRef({
    owner,
    ref: sha,
    repo,
  });

  const branches = uniq(data.check_suites.map((s) => s.head_branch));
  const branch = branches.includes(ref) ? ref : branches[0];

  const suites = data.check_suites.filter((s) => s.head_branch === branch);

  const commitMessage = suites[0] ? suites[0].head_commit.message : null;
  const pullRequests = suites.find((s) => s.pull_requests.length)
    ?.pull_requests;

  const pullRequestId = pullRequests?.length ? pullRequests[0].number : null;

  return { branch, commitMessage, pullRequestId };
};

export const findGitHubReposForInstallation = async (
  { installationId, isSync }: FindGitHubReposForInstallation,
  options: ModelOptions
): Promise<GitHubRepos> => {
  const log = options.logger.prefix("findGitHubReposForInstallation");

  try {
    const { octokit } = await createOctokitForInstallation(
      { installationId, isSync },
      options
    );

    const {
      data: { repositories },
    } = await octokit.apps.listReposAccessibleToInstallation();

    log.debug(
      `found ${repositories.length} repos for installation ${installationId}`
    );

    return repositories;
  } catch (error) {
    log.alert("error", error);
    throw new Error("Could not complete GitHub app installation");
  }
};

export const shouldUpdateCommitStatus = ({
  gitHubCommitStatus,
  logger,
}: ShouldUpdateCommitStatus): boolean => {
  const log = logger.prefix("shouldUpdateCommitStatus");

  if (!gitHubCommitStatus) {
    log.debug("false: no github commit status for suite");
    return false;
  }

  log.debug("true");
  return true;
};

export const updateCommitStatus = async (
  suite_id: string,
  { logger, db }: ModelOptions
): Promise<void> => {
  await db.transaction(async (trx) => {
    const gitHubCommitStatus = await findGitHubCommitStatusForSuite(suite_id, {
      db: trx,
      logger,
    });
    const runs = await findRunsForSuite(suite_id, { db: trx, logger });

    const shouldUpdate = shouldUpdateCommitStatus({
      gitHubCommitStatus,
      logger,
    });

    if (!shouldUpdate) return;

    const state = runs.some((r) => r.status === "fail") ? "failure" : "success";

    await createCommitStatus(
      {
        context: gitHubCommitStatus.context,
        installationId: gitHubCommitStatus.github_installation_id,
        owner: gitHubCommitStatus.owner,
        repo: gitHubCommitStatus.repo,
        sha: gitHubCommitStatus.sha,
        state,
        suiteId: suite_id,
      },
      { db: trx, logger }
    );

    await updateGitHubCommitStatus(
      { completed_at: new Date().toISOString(), id: gitHubCommitStatus.id },
      { db: trx, logger }
    );
  });
};
